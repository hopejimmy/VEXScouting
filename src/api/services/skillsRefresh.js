// src/api/services/skillsRefresh.js
import fetch from 'node-fetch';
import { refreshSeasonId } from './seasonResolver.js';

// In-memory status for admin visibility
export const refreshStatus = {
  lastRefreshedAt: null,
  isRunning: false,
  lastResult: null,
};

// Dataset configurations
const DATASETS = [
  { matchType: 'VRC',   programId: 1,  gradeLevel: 'High School',       label: 'VRC High School' },
  { matchType: 'VRC',   programId: 1,  gradeLevel: 'Middle School',     label: 'VRC Middle School' },
  { matchType: 'VEXIQ', programId: 41, gradeLevel: 'Middle School',     label: 'VEXIQ Middle School' },
  { matchType: 'VEXIQ', programId: 41, gradeLevel: 'Elementary School', label: 'VEXIQ Elementary School' },
];

/**
 * Run the full skills refresh cycle.
 * Resolves season IDs, fetches 4 datasets, upserts into skills_standings.
 */
export async function runSkillsRefresh(pool) {
  if (refreshStatus.isRunning) {
    console.log('[skills-refresh] Already running, skipping');
    return;
  }

  refreshStatus.isRunning = true;
  const startTime = Date.now();
  const results = {};
  let totalRecords = 0;
  let failures = 0;
  let retries = 0;

  console.log(`[skills-refresh] Starting scheduled refresh at ${new Date().toISOString()}`);

  // Step 1: Resolve season IDs (calls API directly to detect changes)
  const vrcSeasonId = await refreshSeasonId(pool, 1);
  const vexiqSeasonId = await refreshSeasonId(pool, 41);

  console.log(`[skills-refresh] Season IDs resolved — VRC: ${vrcSeasonId}, VEXIQ: ${vexiqSeasonId}`);

  // Step 2: Process each dataset
  for (const dataset of DATASETS) {
    const seasonId = dataset.programId === 1 ? vrcSeasonId : vexiqSeasonId;

    if (!seasonId) {
      console.error(`[skills-refresh] ${dataset.label}: SKIPPED — no season ID available`);
      results[dataset.label] = { records: 0, status: 'skipped' };
      failures++;
      continue;
    }

    const result = await fetchAndUpsertDataset(pool, seasonId, dataset);
    results[dataset.label] = result;

    if (result.status === 'success') {
      totalRecords += result.records;
      if (result.retried) retries++;
    } else {
      failures++;
    }

    // Wait 1.5s between datasets to avoid hammering the server
    if (DATASETS.indexOf(dataset) < DATASETS.length - 1) {
      await sleep(1500);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  refreshStatus.lastRefreshedAt = new Date().toISOString();
  refreshStatus.isRunning = false;
  refreshStatus.lastResult = {
    duration: `${duration}s`,
    datasets: results,
    totalRecords,
    failures,
    retries,
  };

  console.log(`[skills-refresh] Completed in ${duration}s — ${totalRecords} total records, ${retries} retries, ${failures} failures`);
}

/**
 * Fetch a single dataset from RobotEvents and upsert into skills_standings.
 * Retries once on failure.
 */
async function fetchAndUpsertDataset(pool, seasonId, dataset) {
  let data = null;
  let retried = false;

  // Attempt 1
  data = await fetchSkillsData(seasonId, dataset.gradeLevel);

  // Retry once on failure
  if (!data) {
    console.warn(`[skills-refresh] ${dataset.label}: FAILED (retrying in 5s...)`);
    retried = true;
    await sleep(5000);
    data = await fetchSkillsData(seasonId, dataset.gradeLevel);
  }

  if (!data) {
    console.error(`[skills-refresh] ${dataset.label}: FAILED after retry`);
    return { records: 0, status: 'failed', retried };
  }

  // Upsert into database
  try {
    await pool.query('BEGIN');

    for (const record of data) {
      await pool.query(`
        INSERT INTO skills_standings (
          teamNumber, teamName, organization, eventRegion, countryRegion,
          rank, score, autonomousSkills, driverSkills,
          highestAutonomousSkills, highestDriverSkills, matchType
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (teamNumber, matchType) DO UPDATE SET
          teamName = EXCLUDED.teamName,
          organization = EXCLUDED.organization,
          eventRegion = EXCLUDED.eventRegion,
          countryRegion = EXCLUDED.countryRegion,
          rank = EXCLUDED.rank,
          score = EXCLUDED.score,
          autonomousSkills = EXCLUDED.autonomousSkills,
          driverSkills = EXCLUDED.driverSkills,
          highestAutonomousSkills = EXCLUDED.highestAutonomousSkills,
          highestDriverSkills = EXCLUDED.highestDriverSkills,
          lastUpdated = CURRENT_TIMESTAMP
      `, [
        record.team.team,
        record.team.teamName,
        record.team.organization,
        record.team.eventRegion || '',
        record.team.country || '',
        record.rank,
        record.scores.score,
        record.scores.programming,
        record.scores.driver,
        record.scores.maxProgramming,
        record.scores.maxDriver,
        dataset.matchType,
      ]);
    }

    await pool.query('COMMIT');
    console.log(`[skills-refresh] ${dataset.label}: ${data.length} records updated`);
    return { records: data.length, status: 'success', retried };
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(`[skills-refresh] ${dataset.label}: DB error — ${err.message}`);
    return { records: 0, status: 'failed', retried };
  }
}

/**
 * Fetch skills standings from the RobotEvents internal API.
 * This is an undocumented API that does not require authentication.
 */
async function fetchSkillsData(seasonId, gradeLevel) {
  try {
    const url = `https://www.robotevents.com/api/seasons/${seasonId}/skills?post_season=0&grade_level=${encodeURIComponent(gradeLevel)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });

    if (!response.ok) {
      console.error(`[skills-refresh] API returned ${response.status} for season ${seasonId}, grade ${gradeLevel}`);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error(`[skills-refresh] Unexpected response format for season ${seasonId}, grade ${gradeLevel}`);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[skills-refresh] Fetch error for season ${seasonId}, grade ${gradeLevel}:`, err.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
