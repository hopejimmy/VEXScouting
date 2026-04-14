// src/api/services/seasonResolver.js
import fetch from 'node-fetch';

// In-memory cache: Map<programKey, { seasonId, seasonName }>
// programKey is 'VRC' or 'VEXIQ'
const seasonCache = new Map();

// Map program IDs to keys and env var names
const PROGRAM_CONFIG = {
  1:  { key: 'VRC',   envVar: 'CURRENT_SEASON_ID' },
  41: { key: 'VEXIQ', envVar: 'VEXIQ_SEASON_ID' },
};

/**
 * Get the current season ID for a program.
 * Resolution: memory cache → DB → API → env var → critical error.
 */
export async function getCurrentSeasonId(pool, programId) {
  const config = PROGRAM_CONFIG[programId];
  if (!config) {
    console.error(`[season-resolver] Unknown program ID: ${programId}`);
    return null;
  }

  // Tier 1: Memory cache
  if (seasonCache.has(config.key)) {
    return seasonCache.get(config.key).seasonId;
  }

  // Tier 2: Database
  try {
    const result = await pool.query(
      'SELECT season_id, season_name FROM season_config WHERE program = $1',
      [config.key]
    );
    if (result.rows.length > 0) {
      const { season_id, season_name } = result.rows[0];
      seasonCache.set(config.key, { seasonId: season_id, seasonName: season_name });
      console.log(`[season-resolver] ${config.key} season loaded from DB: ${season_id} (${season_name})`);
      return season_id;
    }
  } catch (err) {
    console.error(`[season-resolver] DB read failed for ${config.key}:`, err.message);
  }

  // Tier 3: API
  const apiResult = await fetchSeasonFromApi(programId);
  if (apiResult) {
    await saveSeasonToDb(pool, config.key, apiResult.seasonId, apiResult.seasonName);
    seasonCache.set(config.key, apiResult);
    console.log(`[season-resolver] ${config.key} season resolved from API: ${apiResult.seasonId} (${apiResult.seasonName})`);
    return apiResult.seasonId;
  }

  // Tier 4: Environment variable fallback
  const envValue = process.env[config.envVar];
  if (envValue) {
    const seasonId = parseInt(envValue);
    seasonCache.set(config.key, { seasonId, seasonName: 'from env var' });
    console.warn(`[season-resolver] ${config.key} season using env var fallback: ${seasonId}`);
    return seasonId;
  }

  // Tier 5: Critical error
  console.error(`[CRITICAL] Could not determine ${config.key} season ID. No API, DB, or env var available.`);
  return null;
}

/**
 * Refresh the season ID by calling the API directly (bypasses memory cache).
 * Used by the daily cron to detect season changes.
 * Updates DB and memory cache if the season has changed.
 */
export async function refreshSeasonId(pool, programId) {
  const config = PROGRAM_CONFIG[programId];
  if (!config) return null;

  const apiResult = await fetchSeasonFromApi(programId);
  if (apiResult) {
    const cached = seasonCache.get(config.key);
    if (!cached || cached.seasonId !== apiResult.seasonId) {
      console.log(`[season-resolver] ${config.key} season changed: ${cached?.seasonId || 'none'} → ${apiResult.seasonId} (${apiResult.seasonName})`);
      await saveSeasonToDb(pool, config.key, apiResult.seasonId, apiResult.seasonName);
    }
    seasonCache.set(config.key, apiResult);
    return apiResult.seasonId;
  }

  // API failed — fall back to getCurrentSeasonId which tries DB → env
  console.warn(`[season-resolver] API refresh failed for ${config.key}, falling back to cached value`);
  return getCurrentSeasonId(pool, programId);
}

/**
 * Fetch the current season from RobotEvents v2 API.
 * Picks the most recent season whose start date is in the past.
 */
async function fetchSeasonFromApi(programId) {
  const apiToken = process.env.ROBOTEVENTS_API_TOKEN;
  if (!apiToken) {
    console.warn('[season-resolver] No ROBOTEVENTS_API_TOKEN configured, skipping API lookup');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.robotevents.com/api/v2/seasons?program[]=${programId}&per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`[season-resolver] API returned ${response.status} for program ${programId}`);
      return null;
    }

    const data = await response.json();
    const now = new Date();

    for (const season of data.data) {
      const start = new Date(season.start);
      if (now >= start) {
        return { seasonId: season.id, seasonName: season.name };
      }
    }

    console.warn(`[season-resolver] No started season found for program ${programId}`);
    return null;
  } catch (err) {
    console.error(`[season-resolver] API fetch failed for program ${programId}:`, err.message);
    return null;
  }
}

/**
 * Save a season ID to the database (upsert).
 */
async function saveSeasonToDb(pool, programKey, seasonId, seasonName) {
  try {
    await pool.query(`
      INSERT INTO season_config (program, season_id, season_name, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (program) DO UPDATE SET
        season_id = EXCLUDED.season_id,
        season_name = EXCLUDED.season_name,
        updated_at = CURRENT_TIMESTAMP
    `, [programKey, seasonId, seasonName]);
  } catch (err) {
    console.error(`[season-resolver] Failed to save season to DB:`, err.message);
  }
}
