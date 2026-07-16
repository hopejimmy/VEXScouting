import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calibrationBuckets,
  currentRedWinProbability,
  evaluatePredictions,
} from './predictionMetrics.js';

test('currentRedWinProbability mirrors strength ratio', () => {
  const strengths = new Map([['A', 30], ['B', 10], ['C', 20], ['D', 20]]);
  assert.equal(currentRedWinProbability(['A', 'B'], ['C', 'D'], strengths), 0.5);
});

test('currentRedWinProbability ignores missing teams like the current UI', () => {
  const strengths = new Map([['A', 40], ['C', 20], ['D', 20]]);
  assert.equal(currentRedWinProbability(['A', 'MISSING'], ['C', 'D'], strengths), 2 / 3);
});

test('currentRedWinProbability returns 50 percent with no known strengths', () => {
  assert.equal(currentRedWinProbability(['A'], ['B'], new Map()), 0.5);
});

test('calibrationBuckets places probability one in the final bucket', () => {
  const buckets = calibrationBuckets([{ probability: 1, outcome: 1 }]);
  assert.equal(buckets[9].count, 1);
  assert.equal(buckets[9].observedRate, 1);
});

test('evaluatePredictions computes accuracy and Brier score', () => {
  const result = evaluatePredictions([
    { probability: 0.8, outcome: 1 },
    { probability: 0.4, outcome: 0 },
    { probability: 0.5, outcome: 1 },
  ]);

  assert.equal(result.count, 3);
  assert.equal(result.accuracy, 2.5 / 3);
  assert.ok(Math.abs(result.brierScore - 0.15) < 1e-12);
});
