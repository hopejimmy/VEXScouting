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
 * Tier thresholds, calibrated from preview-perf-v2 against season 197
 * (VRC 2025-26, Push Back) on 2026-04-27. 1740 teams scored, producing
 * a 5/15/25/30/25 pyramid:
 *   Elite      ≥ 39   (top  5%)
 *   High       ≥ 28   (next 15%)
 *   Mid-High   ≥ 18   (next 25%)
 *   Mid        ≥ 13   (next 30%)
 *   Developing < 13   (rest 25%)
 *
 * Numbers feel low vs the legacy 0-100 scale (top scorer is 63 because
 * no team simultaneously hits the 99th percentile in all three weighted
 * metrics). Tier labels still represent the same pyramid percentiles —
 * relative ranking is what matters, not the absolute number.
 */
export const TIER_THRESHOLDS = {
  ELITE: 39,
  HIGH: 28,
  MID_HIGH: 18,
  MID: 13,
};

export function tierOf(strength) {
  if (strength >= TIER_THRESHOLDS.ELITE)    return 'Elite';
  if (strength >= TIER_THRESHOLDS.HIGH)     return 'High';
  if (strength >= TIER_THRESHOLDS.MID_HIGH) return 'Mid-High';
  if (strength >= TIER_THRESHOLDS.MID)      return 'Mid';
  return 'Developing';
}
