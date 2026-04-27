/**
 * Bayesian shrinkage toward a population mean.
 *
 * For an observed average computed from `n` samples, pull the value
 * toward `populationMean`. `k` controls how strong the pull is — at
 * n = k the result is the midpoint of observed and mean. Low-sample
 * teams are pulled hard; high-sample teams barely move.
 */
export function applyShrinkage({ n, observed, populationMean, k }) {
  return (n * observed + k * populationMean) / (n + k);
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Final 0..100 strength score: 50% CCWM + 25% Skills + 25% Win Rate.
 *
 * Inputs are post-shrinkage values for CCWM/WinRate and the raw max
 * Skills score. Each term is normalized against a per-season cap
 * (typically the 99th percentile) before being weighted.
 */
export function computeStrength({
  ccwmShrunk, maxCcwm,
  maxSkills, maxSkillsCap,
  winRateShrunk,
}) {
  const safeRatio = (numer, denom) => (denom > 0 ? numer / denom : 0);
  const normCcwm    = clamp01(safeRatio(ccwmShrunk, maxCcwm))     * 50;
  const normSkills  = clamp01(safeRatio(maxSkills, maxSkillsCap)) * 25;
  const normWinRate = clamp01(winRateShrunk) * 25;
  return Math.round(normCcwm + normSkills + normWinRate);
}

/**
 * Tier thresholds. These PLACEHOLDER values produce a roughly
 * pyramid-shaped distribution but will be replaced after running
 * `scripts/preview-perf-v2.js` against actual season data — see
 * Task 5 / Task 6 in the implementation plan.
 */
export const TIER_THRESHOLDS = {
  ELITE: 78,
  HIGH: 64,
  MID_HIGH: 51,
  MID: 38,
};

export function tierOf(strength) {
  if (strength >= TIER_THRESHOLDS.ELITE)    return 'Elite';
  if (strength >= TIER_THRESHOLDS.HIGH)     return 'High';
  if (strength >= TIER_THRESHOLDS.MID_HIGH) return 'Mid-High';
  if (strength >= TIER_THRESHOLDS.MID)      return 'Mid';
  return 'Developing';
}
