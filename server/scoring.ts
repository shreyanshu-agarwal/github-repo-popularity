import { PopularityBreakdown } from "../src/types";

// Named constants for popularity scoring configuration
const WEIGHT_STARS = 0.6;
const WEIGHT_FORKS = 0.3;
const WEIGHT_RECENCY = 0.1;

const DECAY_CONSTANT_DAYS = 90; // Decay factor (roughly 62 days half-life)
const SCORE_SCALE_MULTIPLIER = 22;

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Rounding scales for scores and breakdown metrics
const BREAKDOWN_DECIMAL_PLACES = 100;
const SCORE_DECIMAL_PLACES = 10;

/**
 * Calculates a popularity score between 0 and 100 based on stars, forks, and recency of updates.
 * 
 * Formula:
 * starsScore = log10(stars + 1)
 * forksScore = log10(forks + 1)
 * recencyFactor = exp(-daysSinceUpdate / 90)  // 90 days decay factor (half-life roughly 62 days)
 * 
 * Weighted Raw Score = (starsScore * 0.6) + (forksScore * 0.3) + (recencyFactor * 0.1)
 * 
 * Scaling:
 * We multiply the Weighted Raw Score by 22.0 to scale a highly legendary repository
 * (e.g., 50k stars, 10k forks, recently updated) toward 100, clamping the final output between 0 and 100.
 *
 * @param stars Number of stars for the repository
 * @param forks Number of forks for the repository
 * @param updatedAtStr ISO date string of the last update
 * @param referenceDate Optional date to compare against (defaults to current time)
 */
export function calculatePopularityScore(
  stars: number,
  forks: number,
  updatedAtStr: string,
  referenceDate: Date = new Date()
): { score: number; breakdown: PopularityBreakdown } {
  const starsScore = Math.log10(stars + 1);
  const forksScore = Math.log10(forks + 1);

  const updatedAt = new Date(updatedAtStr);
  
  // If date parsing fails, default to a safe 0 value
  if (isNaN(updatedAt.getTime())) {
    return {
      score: MIN_SCORE,
      breakdown: { starsScore: MIN_SCORE, forksScore: MIN_SCORE, recencyFactor: MIN_SCORE }
    };
  }

  const diffTime = Math.max(0, referenceDate.getTime() - updatedAt.getTime());
  const diffDays = diffTime / MS_PER_DAY;
  
  // Exponential decay
  const recencyFactor = Math.exp(-diffDays / DECAY_CONSTANT_DAYS);

  // Apply weights
  const weightedRaw = (starsScore * WEIGHT_STARS) + (forksScore * WEIGHT_FORKS) + (recencyFactor * WEIGHT_RECENCY);

  // Scale raw score to 0 - 100
  const scaledScore = weightedRaw * SCORE_SCALE_MULTIPLIER;
  const finalScore = Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(scaledScore * SCORE_DECIMAL_PLACES) / SCORE_DECIMAL_PLACES));

  return {
    score: finalScore,
    breakdown: {
      starsScore: Math.round(starsScore * BREAKDOWN_DECIMAL_PLACES) / BREAKDOWN_DECIMAL_PLACES,
      forksScore: Math.round(forksScore * BREAKDOWN_DECIMAL_PLACES) / BREAKDOWN_DECIMAL_PLACES,
      recencyFactor: Math.round(recencyFactor * BREAKDOWN_DECIMAL_PLACES) / BREAKDOWN_DECIMAL_PLACES
    }
  };
}
