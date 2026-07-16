/**
 * Mirrors MatchAnalysisCard's current prediction rule: average only teams
 * that have strength data, then treat Strength as a ratio-scale value.
 */
export function currentRedWinProbability(redTeams, blueTeams, strengthByTeam) {
  const averageKnownStrength = (teams) => {
    const strengths = teams
      .map(team => strengthByTeam.get(team))
      .filter(value => Number.isFinite(value));

    if (strengths.length === 0) return 0;
    return Math.round(strengths.reduce((sum, value) => sum + value, 0) / strengths.length);
  };

  const redStrength = averageKnownStrength(redTeams);
  const blueStrength = averageKnownStrength(blueTeams);
  const totalStrength = redStrength + blueStrength;

  return totalStrength > 0 ? redStrength / totalStrength : 0.5;
}

export function calibrationBuckets(predictions, bucketCount = 10) {
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    lower: index / bucketCount,
    upper: (index + 1) / bucketCount,
    count: 0,
    probabilitySum: 0,
    outcomeSum: 0,
  }));

  for (const prediction of predictions) {
    const probability = Math.max(0, Math.min(1, prediction.probability));
    const index = Math.min(bucketCount - 1, Math.floor(probability * bucketCount));
    const bucket = buckets[index];
    bucket.count += 1;
    bucket.probabilitySum += probability;
    bucket.outcomeSum += prediction.outcome;
  }

  return buckets.map(bucket => ({
    ...bucket,
    meanProbability: bucket.count > 0 ? bucket.probabilitySum / bucket.count : null,
    observedRate: bucket.count > 0 ? bucket.outcomeSum / bucket.count : null,
  }));
}

export function evaluatePredictions(predictions) {
  if (predictions.length === 0) {
    return {
      count: 0,
      accuracy: null,
      brierScore: null,
      baselineBrierScore: null,
      calibration: calibrationBuckets([]),
    };
  }

  let correct = 0;
  let squaredError = 0;
  let outcomeSum = 0;

  for (const prediction of predictions) {
    const { probability, outcome } = prediction;
    squaredError += (probability - outcome) ** 2;
    outcomeSum += outcome;

    if (probability === 0.5) correct += 0.5;
    else if ((probability > 0.5 && outcome === 1) || (probability < 0.5 && outcome === 0)) correct += 1;
  }

  const baseRate = outcomeSum / predictions.length;
  const baselineBrierScore = predictions.reduce(
    (sum, prediction) => sum + (baseRate - prediction.outcome) ** 2,
    0,
  ) / predictions.length;

  return {
    count: predictions.length,
    accuracy: correct / predictions.length,
    brierScore: squaredError / predictions.length,
    baselineBrierScore,
    baseRate,
    calibration: calibrationBuckets(predictions),
  };
}
