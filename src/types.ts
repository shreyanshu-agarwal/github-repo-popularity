
export interface PopularityBreakdown {
  starsScore: number;
  forksScore: number;
  recencyFactor: number;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  score: number;
  breakdown: PopularityBreakdown;
  url: string;
  ownerAvatarUrl: string;
}

export interface SearchParams {
  language?: string;
  createdAfter?: string;
  page?: number;
  perPage?: number;
  referenceDate?: string | Date;
  forceRefresh?: boolean;
}

export interface PerformanceMetrics {
  latencyMs: number;
  isCached: boolean;
  rateLimitLimit: number;
  rateLimitRemaining: number;
  rateLimitReset: string | null;
  isSimulated?: boolean;
}

export interface SearchResponse {
  repositories: Repository[];
  totalCount: number;
  metrics: PerformanceMetrics;
}

export interface TestCaseResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface TestSuiteResult {
  name: string;
  passed: boolean;
  results: TestCaseResult[];
}
