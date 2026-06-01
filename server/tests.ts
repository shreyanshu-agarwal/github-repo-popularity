import { TestSuiteResult } from "../src/types";
import { calculatePopularityScore } from "./scoring";
import { searchAndRankRepositories } from "./github";

/**
 * Runs all Unit Tests, Service Tests, and API contract validation simulations.
 */
export async function runServerTests(): Promise<TestSuiteResult[]> {
  const suites: TestSuiteResult[] = [];

  // ==========================================
  // SUITE 1: Scoring Algorithm Unit Tests
  // ==========================================
  const scoringResults: TestSuiteResult = {
    name: "Scoring Algorithm (Unit)",
    passed: true,
    results: []
  };

  try {
    // Test case 1: Star boundaries (legendary repo)
    // 100k stars, 10k forks, updated today should score very high
    const refDate = new Date("2026-05-31T12:00:00Z");
    const item1 = calculatePopularityScore(100000, 10000, "2026-05-31T12:00:00Z", refDate);
    
    scoringResults.results.push({
      name: "Star scaling logarithmic bound (legendary)",
      passed: item1.score >= 90 && item1.score <= 100,
      message: `Score was ${item1.score} (starsScore=${item1.breakdown.starsScore}, forksScore=${item1.breakdown.forksScore}, recencyFactor=${item1.breakdown.recencyFactor})`
    });

    // Test case 2: Score decay (stale project)
    // 5000 stars, 1000 forks, updated 3 years ago (approx 1095 days)
    const staleDateStr = "2023-05-31T12:00:00Z";
    const item2 = calculatePopularityScore(5000, 1000, staleDateStr, refDate);
    
    // Low recency factor expected due to exp(-1095/90) = extremely small near 0
    scoringResults.results.push({
      name: "Recency decay (stale project updated 3 years ago)",
      passed: item2.breakdown.recencyFactor < 0.01,
      message: `Recency factor decayed to ${item2.breakdown.recencyFactor} (expected < 0.01)`
    });

    // Test case 3: Zero bounds
    const zeroItem = calculatePopularityScore(0, 0, "2010-01-01T12:00:00Z", refDate);
    scoringResults.results.push({
      name: "Floor bounds (zero stars, zero forks, very old)",
      passed: zeroItem.score >= 0 && zeroItem.score <= 5,
      message: `Score boundary properly constrained. Scored: ${zeroItem.score}`
    });

    // Test case 4: Clamped limit checks
    // Max score cannot exceed 100
    const superLegendary = calculatePopularityScore(9999999, 9999999, "2026-05-31T12:00:00Z", refDate);
    scoringResults.results.push({
      name: "Strict clamping ceiling (score <= 100)",
      passed: superLegendary.score === 100,
      message: `Super legendary properly capped at 100. Computed: ${superLegendary.score}`
    });

  } catch (error: any) {
    scoringResults.passed = false;
    scoringResults.results.push({
      name: "Scoring Suite Execution",
      passed: false,
      message: error?.message || String(error)
    });
  }
  scoringResults.passed = scoringResults.results.every(r => r.passed);
  suites.push(scoringResults);

  // ==========================================
  // SUITE 2: GitHub Client Service Tests
  // ==========================================
  const serviceResults: TestSuiteResult = {
    name: "GitHub Search Integration & Fallbacks (Service)",
    passed: true,
    results: []
  };

  const originalFetch = globalThis.fetch;
  const testRefDate = new Date("2026-05-31T20:00:00Z");

  try {
    // 1. Mock successful GitHub Search API
    globalThis.fetch = async (url: any, _options?: any): Promise<Response> => {
      const mockItems = [
        {
          id: 101,
          name: "vscode",
          full_name: "microsoft/vscode",
          description: "Visual Studio Code",
          stargazers_count: 150000,
          forks_count: 25000,
          updated_at: "2026-05-31T10:00:00Z",
          html_url: "https://github.com/microsoft/vscode",
          owner: { avatar_url: "https://avatars.githubusercontent.com/u/6154722?v=4" }
        },
        {
          id: 102,
          name: "typescript",
          full_name: "microsoft/TypeScript",
          description: "TypeScript",
          stargazers_count: 100000,
          forks_count: 12000,
          updated_at: "2026-05-30T10:00:00Z",
          html_url: "https://github.com/microsoft/TypeScript",
          owner: { avatar_url: "https://avatars.githubusercontent.com/u/6154722?v=4" }
        }
      ];

      const headers = new Headers();
      headers.set("x-ratelimit-limit", "60");
      headers.set("x-ratelimit-remaining", "50");
      headers.set("x-ratelimit-reset", Math.floor((testRefDate.getTime() + 60000) / 1000).toString());
      headers.set("content-type", "application/json");

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers,
        json: async () => ({
          items: mockItems,
          total_count: 2
        })
      } as any;
    };

    // Run deterministic search with fixed referenceDate and mocked fetch
    const successResults = await searchAndRankRepositories({
      language: "typescript",
      createdAfter: "2015-01-01",
      page: 1,
      perPage: 5,
      referenceDate: testRefDate
    });

    serviceResults.results.push({
      name: "[Mocked Live] Validate result mapping payload and length bounds",
      passed: successResults.repositories.length === 2,
      message: `Returned ${successResults.repositories.length} repositories (expected 2)`
    });

    serviceResults.results.push({
      name: "[Mocked Live] Result schema contains correct score & breakdown",
      passed: successResults.repositories.every(r => typeof r.score === 'number' && r.breakdown && typeof r.breakdown.starsScore === 'number'),
      message: "Checked all repositories properties successfully"
    });

    serviceResults.results.push({
      name: "[Mocked Live] Results are properly ordered by score descending",
      passed: successResults.repositories[0].score >= successResults.repositories[1].score,
      message: `First: ${successResults.repositories[0]?.score}, Second: ${successResults.repositories[1]?.score}`
    });

    // 2. Mock API error to verify rejection (using HTTP 500 to bypass 403 simulation fallback)
    globalThis.fetch = async (url: any, _options?: any): Promise<Response> => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers,
        json: async () => ({ message: "Database failure" })
      } as any;
    };

    let didThrow = false;
    let errMessage = "";
    try {
      await searchAndRankRepositories({
        language: "typescript",
        createdAfter: "2015-01-01",
        page: 1,
        perPage: 5,
        referenceDate: testRefDate,
        forceRefresh: true
      });
    } catch (err: any) {
      didThrow = true;
      errMessage = err.message || String(err);
    }

    serviceResults.results.push({
      name: "[Error Handling] Verify that non-OK response from GitHub API triggers rejection",
      passed: didThrow && errMessage.includes("GitHub API returned status code 500"),
      message: didThrow ? `Rejected as expected: ${errMessage}` : "Did not reject"
    });

  } catch (error: any) {
    serviceResults.passed = false;
    serviceResults.results.push({
      name: "Service Suite Execution",
      passed: false,
      message: error?.message || String(error)
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  serviceResults.passed = serviceResults.results.every(r => r.passed);
  suites.push(serviceResults);

  // ==========================================
  // SUITE 3: Input Validation and API Edge Cases
  // ==========================================
  const apiResults: TestSuiteResult = {
    name: "Input Validation (API Contracts)",
    passed: true,
    results: []
  };

  try {
    // Edge case 1: Bad dates
    const badDateItem = calculatePopularityScore(100, 50, "NOT-A-DATE-STRING", testRefDate);
    apiResults.results.push({
      name: "Gracefully handle corrupt date-strings without crashing",
      passed: badDateItem.score === 0 || badDateItem.score !== undefined,
      message: `Returned scores without error. Score: ${badDateItem.score}`
    });

    // Mock successful fetch for wildcard language Search API
    globalThis.fetch = async (url: any, _options?: any): Promise<Response> => {
      const mockItems = [
        {
          id: 201,
          name: "rails",
          full_name: "rails/rails",
          description: "Ruby on Rails",
          stargazers_count: 53000,
          forks_count: 21000,
          updated_at: "2026-05-31T10:00:00Z",
          html_url: "https://github.com/rails/rails",
          owner: { avatar_url: "https://avatars.githubusercontent.com/u/131?v=4" }
        }
      ];

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          items: mockItems,
          total_count: 1
        })
      } as any;
    };

    // Edge case 2: Empty language/wildcard requests mapping
    const wildcardResults = await searchAndRankRepositories({
      language: "all",
      createdAfter: "2020-01-01",
      page: 1,
      perPage: 3,
      referenceDate: testRefDate
    });
    apiResults.results.push({
      name: "Handle overall language wildcard filter mappings",
      passed: wildcardResults.repositories.length === 1 && wildcardResults.repositories[0].name === "rails",
      message: `Successfully returned ${wildcardResults.repositories.length} wildcard items`
    });

  } catch (error: any) {
    apiResults.passed = false;
    apiResults.results.push({
      name: "API Suite Execution",
      passed: false,
      message: error?.message || String(error)
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  apiResults.passed = apiResults.results.every(r => r.passed);
  suites.push(apiResults);

  return suites;
}
