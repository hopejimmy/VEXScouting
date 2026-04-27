import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyShrinkage, computeStrength, tierOf, TIER_THRESHOLDS } from './perfScore.js';

test('applyShrinkage: team with k events sits at 50% of own observation', () => {
  // k=5, n=5 → weight is 5/(5+5) = 0.5 own, 0.5 mean
  const result = applyShrinkage({ n: 5, observed: 0.8, populationMean: 0.5, k: 5 });
  assert.equal(result, 0.65);
});

test('applyShrinkage: team with no events collapses to population mean', () => {
  const result = applyShrinkage({ n: 0, observed: 0, populationMean: 0.5, k: 5 });
  assert.equal(result, 0.5);
});

test('applyShrinkage: team with many events barely shrinks', () => {
  // n=20, k=5 → weight 20/25 = 0.8 own
  const result = applyShrinkage({ n: 20, observed: 0.9, populationMean: 0.5, k: 5 });
  assert.equal(result, 0.82);
});

test('computeStrength: weighted CCWM/Skills/WinRate sums to 0..100', () => {
  const result = computeStrength({
    ccwmShrunk: 15, maxCcwm: 20,        // 15/20 * 50 = 37.5
    maxSkills: 300, maxSkillsCap: 400,  // 300/400 * 25 = 18.75
    winRateShrunk: 0.6,                 // 0.6 * 25 = 15
  });
  // 37.5 + 18.75 + 15 = 71.25 → rounds to 71
  assert.equal(result, 71);
});

test('computeStrength: clamps each component at its max', () => {
  const result = computeStrength({
    ccwmShrunk: 100, maxCcwm: 20,
    maxSkills: 1000, maxSkillsCap: 400,
    winRateShrunk: 1.5,
  });
  assert.equal(result, 100);
});

test('computeStrength: clamps at zero for negative or missing inputs', () => {
  const result = computeStrength({
    ccwmShrunk: -5, maxCcwm: 20,
    maxSkills: 0, maxSkillsCap: 400,
    winRateShrunk: 0,
  });
  assert.equal(result, 0);
});

test('computeStrength: zero population values still produce a number', () => {
  const result = computeStrength({
    ccwmShrunk: 10, maxCcwm: 20,
    maxSkills: 0, maxSkillsCap: 0,
    winRateShrunk: 0.5,
  });
  // 25 (CCWM) + 0 (Skills) + 12.5 (WR) = 37.5 → 38
  assert.equal(result, 38);
});

test('tierOf: returns Elite at threshold and above', () => {
  assert.equal(tierOf(TIER_THRESHOLDS.ELITE),     'Elite');
  assert.equal(tierOf(TIER_THRESHOLDS.ELITE + 1), 'Elite');
  assert.equal(tierOf(100),                        'Elite');
});

test('tierOf: returns Developing below the lowest threshold', () => {
  assert.equal(tierOf(0),  'Developing');
  assert.equal(tierOf(TIER_THRESHOLDS.MID - 1), 'Developing');
});

test('tierOf: walks the boundaries correctly', () => {
  assert.equal(tierOf(TIER_THRESHOLDS.ELITE - 1), 'High');
  assert.equal(tierOf(TIER_THRESHOLDS.HIGH - 1), 'Mid-High');
  assert.equal(tierOf(TIER_THRESHOLDS.MID_HIGH - 1), 'Mid');
});
