import { Repository, SearchParams, PerformanceMetrics } from "../src/types";
import { calculatePopularityScore } from "./scoring";

// Cache item shape for search responses.
interface CacheItem {
  data: {
    repositories: Repository[];
    totalCount: number;
  };
  timestamp: number;
}

// Cache and request-coalescing settings.
const CACHE_VERSION = "v1-";
const MAX_CACHE_SIZE = 120;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const searchCache = new Map<string, CacheItem>();
const inFlightRequests = new Map<string, Promise<{ repositories: Repository[]; totalCount: number; metrics: PerformanceMetrics }>>();

const DEFAULT_LANGUAGE = "typescript";
const DEFAULT_CREATED_AFTER = "2010-01-01";
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const DEFAULT_RATE_LIMIT = 60;

const GITHUB_SEARCH_API_ENDPOINT = "https://api.github.com/search/repositories";
const GITHUB_API_ACCEPT_HEADER = "application/vnd.github.v3+json";
const GITHUB_API_USER_AGENT = "GitHub-Popularity-Ranker-Applet";
const GITHUB_API_TIMEOUT_MS = 8000; // 8 seconds

const DEFAULT_OWNER_AVATAR_URL = "https://icons.lucide.dev/github";

let currentRateLimitLimit = DEFAULT_RATE_LIMIT;
let currentRateLimitRemaining = DEFAULT_RATE_LIMIT;
let currentRateLimitReset: string | null = null;

const FILTER_KEY_LANGUAGE = "language";
const FILTER_KEY_CREATED = "created";
const FILTER_OPERATOR_GREATER_THAN = ">";

/**
 * Validates and normalizes language input.
 */
export function normalizeAndValidateLanguage(langInput: string | undefined): string {
  if (!langInput) {
    return DEFAULT_LANGUAGE;
  }

  let cleanLang = langInput.trim().toLowerCase().replace(/\s+/g, " ");

  if (cleanLang === "all" || cleanLang === "") {
    return "all";
  }

  // Allow alphanumeric values plus common language characters.
  const safeLangRegex = /^[a-z0-9+#_.\- ]+$/i;
  if (!safeLangRegex.test(cleanLang)) {
    console.warn(`Unsafe language input "${langInput}" detected. falling back to default language.`);
    return DEFAULT_LANGUAGE;
  }

  const MAX_LANG_LENGTH = 50;
  if (cleanLang.length > MAX_LANG_LENGTH) {
    cleanLang = cleanLang.substring(0, MAX_LANG_LENGTH);
  }

  return cleanLang;
}

/**
 * Validates createdAfter input and returns a safe default on invalid values.
 */
export function normalizeAndValidateCreatedAfter(dateInput: string | undefined): string {
  if (!dateInput) {
    return DEFAULT_CREATED_AFTER;
  }

  const cleanDate = dateInput.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(cleanDate)) {
    console.warn(`Invalid date format "${dateInput}" (expected YYYY-MM-DD). falling back to default.`);
    return DEFAULT_CREATED_AFTER;
  }

  const parsedTime = Date.parse(cleanDate);
  if (isNaN(parsedTime)) {
    console.warn(`Parse check failed for date string "${dateInput}". falling back to default.`);
    return DEFAULT_CREATED_AFTER;
  }

  const parsedDate = new Date(parsedTime);
  const currentYear = new Date().getFullYear();
  const year = parsedDate.getFullYear();
  if (year < 1970 || year > currentYear + 1) {
    console.warn(`Logical year bounds exceeded for date "${dateInput}". falling back to default.`);
    return DEFAULT_CREATED_AFTER;
  }

  return cleanDate;
}

/**
 * Builds a safe GitHub search query from the normalized parameters.
 */
export function buildGitHubSearchQuery(language: string, createdAfter: string): string {
  const queryParts: string[] = [];

  if (language && language !== "all") {
    // Sanitize any extra spaces inside language to prevent query fracturing
    const sanitizedLanguageName = language.replace(/\s+/g, " ");
    queryParts.push(`${FILTER_KEY_LANGUAGE}:${sanitizedLanguageName}`);
  }

  if (createdAfter) {
    queryParts.push(`${FILTER_KEY_CREATED}:${FILTER_OPERATOR_GREATER_THAN}${createdAfter}`);
  }

  return queryParts.join(" ").trim();
}



function evictOldestCacheEntries() {
  if (searchCache.size <= MAX_CACHE_SIZE) {
    return;
  }

  const entries = Array.from(searchCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const excessCount = searchCache.size - MAX_CACHE_SIZE;
  for (let i = 0; i < excessCount; i++) {
    searchCache.delete(entries[i][0]);
  }
}

function removeExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, item] of searchCache.entries()) {
    if (now - item.timestamp >= CACHE_TTL_MS) {
      searchCache.delete(key);
    }
  }
}

/**
 * Searches and ranks repositories with cache, request coalescing, and GitHub API integration.
 */
export async function searchAndRankRepositories(
  params: SearchParams
): Promise<{ repositories: Repository[]; totalCount: number; metrics: PerformanceMetrics }> {
  const t0 = Date.now();

  const language = normalizeAndValidateLanguage(params.language);
  const createdAfter = normalizeAndValidateCreatedAfter(params.createdAfter);
  const page = params.page || DEFAULT_PAGE;
  const perPage = params.perPage || DEFAULT_PER_PAGE;

  const cacheKey = `${CACHE_VERSION}${language}:${createdAfter}:${page}:${perPage}`;
  const now = Date.now();

  if (Math.random() < 0.1) {
    removeExpiredCacheEntries();
  }

  if (!params.forceRefresh) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      if (now - cached.timestamp < CACHE_TTL_MS) {
        const latencyMs = Date.now() - t0;
        return {
          repositories: cached.data.repositories,
          totalCount: cached.data.totalCount,
          metrics: {
            latencyMs,
            isCached: true,
            rateLimitLimit: currentRateLimitLimit,
            rateLimitRemaining: currentRateLimitRemaining,
            rateLimitReset: currentRateLimitReset
          }
        };
      } else {
        searchCache.delete(cacheKey);
      }
    }
  }

  let inFlightPromise = inFlightRequests.get(cacheKey);
  if (inFlightPromise) {
    console.log(`[Cache Stampede Prevention] Reusing identical in-flight promise for: ${cacheKey}`);
    return inFlightPromise;
  }

  const executionBlock = (async () => {
    const rawToken = process.env.GITHUB_TOKEN;
    const githubToken = rawToken && rawToken.trim() !== "" && rawToken !== "undefined" && rawToken !== "null"
      ? rawToken.trim()
      : undefined;
    
    const q = buildGitHubSearchQuery(language, createdAfter);

    const requestHeaders: Record<string, string> = {
      Accept: GITHUB_API_ACCEPT_HEADER,
      "User-Agent": GITHUB_API_USER_AGENT
    };

    if (githubToken) {
      const authHeader = githubToken.startsWith("Bearer ") || githubToken.startsWith("token ")
        ? githubToken
        : `Bearer ${githubToken}`;
      requestHeaders["Authorization"] = authHeader;
    }

    const urlObj = new URL(GITHUB_SEARCH_API_ENDPOINT);
    urlObj.searchParams.set("q", q);
    urlObj.searchParams.set("sort", "stars");
    urlObj.searchParams.set("order", "desc");
    urlObj.searchParams.set("page", String(page));
    urlObj.searchParams.set("per_page", String(perPage));

    const endpointUrl = urlObj.toString();

    let repos: any[] = [];
    let totalSearchResultsCount = 0;

    try {
      const response = await fetch(endpointUrl, {
        headers: requestHeaders,
        signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS)
      });

      const rawLimit = response.headers.get("x-ratelimit-limit");
      const rawRemaining = response.headers.get("x-ratelimit-remaining");
      const rawReset = response.headers.get("x-ratelimit-reset");

      if (rawLimit) currentRateLimitLimit = parseInt(rawLimit, 10);
      if (rawRemaining) currentRateLimitRemaining = parseInt(rawRemaining, 10);
      if (rawReset) {
        const resetUnixSeconds = parseInt(rawReset, 10);
        currentRateLimitReset = new Date(resetUnixSeconds * 1000).toISOString();
      }

      if (!response.ok) {
        let errorBodyMsg = "";
        try {
          const errPayload: any = await response.json();
          errorBodyMsg = errPayload?.message || response.statusText;
        } catch {
          errorBodyMsg = response.statusText;
        }

        let errMsg = `GitHub API returned status code ${response.status}: ${errorBodyMsg}`;
        if (response.status === 403 && (errorBodyMsg.toLowerCase().includes("rate limit") || errorBodyMsg.toLowerCase().includes("secondary limit") || errorBodyMsg.toLowerCase().includes("forbidden") || errorBodyMsg.toLowerCase().includes("spammer"))) {
          errMsg += " (Tip: To raise rate limits, please configure a GITHUB_TOKEN environment variable)";
        }
        throw new Error(errMsg);
      } else {
        const payload: any = await response.json();
        if (payload && Array.isArray(payload.items)) {
          repos = payload.items;
          totalSearchResultsCount = payload.total_count || 0;
        } else {
          throw new Error("Invalid response schema from GitHub API.");
        }
      }
    } catch (error: any) {
      throw error;
    }

    const nowRef = params.referenceDate ? new Date(params.referenceDate) : new Date();
    const rankedRepos: Repository[] = repos.map((r: any) => {
      const id = typeof r.id === "number" ? r.id : Math.floor(Math.random() * 1000000);
      const name = typeof r.name === "string" ? r.name : "Unnamed Repository";
      const fullName = typeof r.full_name === "string" ? r.full_name : name;
      const description = typeof r.description === "string" ? r.description : null;
      const rawStars = typeof r.stargazers_count === "number" ? r.stargazers_count : 0;
      const rawForks = typeof r.forks_count === "number" ? r.forks_count : (typeof r.forks === "number" ? r.forks : 0);
      const updatedAtStr = typeof r.updated_at === "string" ? r.updated_at : (typeof r.updatedAt === "string" ? r.updatedAt : nowRef.toISOString());
      const url = typeof r.html_url === "string" ? r.html_url : (typeof r.url === "string" ? r.url : "https://github.com");
      const ownerAvatarUrl = (r.owner && typeof r.owner.avatar_url === "string") ? r.owner.avatar_url : (typeof r.ownerAvatarUrl === "string" ? r.ownerAvatarUrl : DEFAULT_OWNER_AVATAR_URL);

      const scoreResults = calculatePopularityScore(rawStars, rawForks, updatedAtStr, nowRef);

      return {
        id,
        name,
        fullName,
        description,
        stars: rawStars,
        forks: rawForks,
        updatedAt: updatedAtStr,
        score: scoreResults.score,
        breakdown: scoreResults.breakdown,
        url,
        ownerAvatarUrl
      };
    });

    rankedRepos.sort((a, b) => b.score - a.score);

    const finalResponseData = {
      repositories: rankedRepos,
      totalCount: totalSearchResultsCount
    };

    searchCache.set(cacheKey, {
      data: finalResponseData,
      timestamp: Date.now()
    });

    evictOldestCacheEntries();

    const latencyMs = Date.now() - t0;

    return {
      repositories: rankedRepos,
      totalCount: totalSearchResultsCount,
      metrics: {
        latencyMs,
        isCached: false,
        rateLimitLimit: currentRateLimitLimit,
        rateLimitRemaining: currentRateLimitRemaining,
        rateLimitReset: currentRateLimitReset,
        isSimulated: false
      }
    };
  })();

  inFlightRequests.set(cacheKey, executionBlock);

  try {
    const finalResult = await executionBlock;
    return finalResult;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
