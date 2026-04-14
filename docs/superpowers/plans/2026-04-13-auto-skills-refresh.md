# Auto Skills Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically refresh world skills standings daily via RobotEvents internal API, replacing manual CSV uploads, with a 3-tier cached season ID auto-detection system.

**Architecture:** A `node-cron` job in the Express server fetches 4 skills datasets daily and upserts into `skills_standings`. A shared `getCurrentSeasonId()` utility resolves season IDs via memory cache → DB → API → env var fallback, replacing all hardcoded `CURRENT_SEASON_ID` references. Admin endpoints expose refresh status and manual trigger.

**Tech Stack:** Node.js, Express, PostgreSQL, node-cron, node-fetch

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/api/services/seasonResolver.js` | Create | 3-tier season ID resolution (memory → DB → API → env) |
| `src/api/services/skillsRefresh.js` | Create | Fetch skills data from RobotEvents, upsert into DB, retry logic |
| `src/api/server.js` | Modify | Add `season_config` table, cron setup, admin endpoints, replace hardcoded season IDs |
| `package.json` | Modify | Add `node-cron` dependency |

---

### Task 1: Add `node-cron` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install node-cron**

```bash
npm install node-cron
```

- [ ] **Step 2: Verify installation**

```bash
node -e "import('node-cron').then(c => console.log('node-cron loaded, validate:', c.default.validate('0 3 * * *')))"
```

Expected: `node-cron loaded, validate: true`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add node-cron dependency for scheduled skills refresh"
```

---

### Task 2: Create Season Resolver Service

**Files:**
- Create: `src/api/services/seasonResolver.js`

- [ ] **Step 1: Create the season resolver module**

This module exports `getCurrentSeasonId(pool, programId)` with the 3-tier cache (memory → DB → API → env var → critical error), and `refreshSeasonId(pool, programId)` which bypasses the memory cache (used by the daily cron to check for season changes).

```js
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
 * 
 * @param {import('pg').Pool} pool - Database pool
 * @param {number} programId - RobotEvents program ID (1=VRC, 41=VEXIQ)
 * @returns {Promise<number|null>} Season ID or null if all tiers fail
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
 * 
 * @param {import('pg').Pool} pool - Database pool
 * @param {number} programId - RobotEvents program ID (1=VRC, 41=VEXIQ)
 * @returns {Promise<number|null>} Season ID or null on failure
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
```

- [ ] **Step 2: Commit**

```bash
git add src/api/services/seasonResolver.js
git commit -m "feat: add season resolver with 3-tier cache (memory/DB/API)"
```

---

### Task 3: Create Skills Refresh Service

**Files:**
- Create: `src/api/services/skillsRefresh.js`

- [ ] **Step 1: Create the skills refresh module**

This module exports `runSkillsRefresh(pool)` which fetches all 4 datasets and upserts them, and exposes a status object.

```js
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
 * 
 * @param {import('pg').Pool} pool - Database pool
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
 * 
 * @returns {Array|null} Array of team records or null on failure
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
```

- [ ] **Step 2: Commit**

```bash
git add src/api/services/skillsRefresh.js
git commit -m "feat: add skills refresh service with retry logic and admin status"
```

---

### Task 4: Add `season_config` Table to Database Initialization

**Files:**
- Modify: `src/api/server.js:254-350` (inside `initializeDatabase()`)

- [ ] **Step 1: Add the season_config table creation**

In `src/api/server.js`, find the `initializeDatabase()` function. After the last `CREATE TABLE IF NOT EXISTS` block (the `tracked_teams` table around line 330), add:

```js
    // Create season_config table for caching auto-detected season IDs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS season_config (
        program TEXT PRIMARY KEY,
        season_id INTEGER NOT NULL,
        season_name TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
```

- [ ] **Step 2: Commit**

```bash
git add src/api/server.js
git commit -m "feat: add season_config table for caching auto-detected season IDs"
```

---

### Task 5: Replace Hardcoded Season IDs with Season Resolver

**Files:**
- Modify: `src/api/server.js:1-17` (imports)
- Modify: `src/api/server.js:552` (analysis worker start)
- Modify: `src/api/server.js:1226` (performance endpoint)
- Modify: `src/api/server.js:1589` (team events endpoint)

- [ ] **Step 1: Add import for seasonResolver**

At the top of `src/api/server.js`, after the existing imports (around line 17), add:

```js
import { getCurrentSeasonId } from './services/seasonResolver.js';
```

- [ ] **Step 2: Update analysis worker start (line 552)**

Change:

```js
  analysisWorker.start(pool, process.env.ROBOTEVENTS_API_TOKEN, process.env.CURRENT_SEASON_ID || 197, !!force);
```

To:

```js
  const seasonId = await getCurrentSeasonId(pool, 1); // VRC
  analysisWorker.start(pool, process.env.ROBOTEVENTS_API_TOKEN, seasonId || 197, !!force);
```

Also make the route handler `async` if it isn't already. Change:

```js
app.post('/api/admin/analysis/start', authenticateToken, requireRole('admin'), (req, res) => {
```

To:

```js
app.post('/api/admin/analysis/start', authenticateToken, requireRole('admin'), async (req, res) => {
```

- [ ] **Step 3: Update performance endpoint (line 1226)**

Change:

```js
    const seasonId = req.query.season || process.env.CURRENT_SEASON_ID || 197; // Default to current VRC season
```

To:

```js
    const seasonId = req.query.season || await getCurrentSeasonId(pool, 1) || 197;
```

- [ ] **Step 4: Update team events endpoint (line 1589)**

Change:

```js
    const seasonId = season || process.env.CURRENT_SEASON_ID || '190'; // Use query param or default to High Stakes
```

To:

```js
    const programId = matchType && programMap[matchType] ? parseInt(programMap[matchType]) : 1;
    const seasonId = season || await getCurrentSeasonId(pool, programId) || 197;
```

Note: `programId` is already computed a few lines below (line 1601). Move or reuse it. The key change is that VEXIQ teams will now get the correct VEXIQ season ID (196) instead of the VRC one (197).

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js
git commit -m "refactor: replace hardcoded CURRENT_SEASON_ID with auto-detecting seasonResolver"
```

---

### Task 6: Add Cron Job and Admin Endpoints

**Files:**
- Modify: `src/api/server.js:1-17` (imports)
- Modify: `src/api/server.js:820-838` (server startup)
- Modify: `src/api/server.js` (new endpoints, after existing admin routes around line 560)

- [ ] **Step 1: Add imports**

At the top of `src/api/server.js`, add these imports (alongside the seasonResolver import from Task 5):

```js
import cron from 'node-cron';
import { runSkillsRefresh, refreshStatus } from './services/skillsRefresh.js';
```

- [ ] **Step 2: Add admin status endpoint**

After the existing analysis admin endpoints (around line 563, after the SSE stream route), add:

```js
// Skills Refresh Status
app.get('/api/admin/skills-refresh/status', authenticateToken, requireRole('admin'), (req, res) => {
  res.json(refreshStatus);
});

// Skills Refresh Manual Trigger
app.post('/api/admin/skills-refresh/trigger', authenticateToken, requireRole('admin'), (req, res) => {
  if (refreshStatus.isRunning) {
    return res.status(409).json({ error: 'Skills refresh already running' });
  }

  // Run in background — don't await
  runSkillsRefresh(pool).catch(err => {
    console.error('[skills-refresh] Manual trigger error:', err);
  });

  res.json({ message: 'Skills refresh started' });
});
```

- [ ] **Step 3: Add cron job initialization in startServer**

In the `startServer()` function, after `console.log('🚀 Server running...')` (inside the `app.listen` callback, around line 834), add:

```js
      // Start daily skills refresh cron job
      const cronSchedule = process.env.SKILLS_REFRESH_CRON || '0 3 * * *';
      cron.schedule(cronSchedule, () => {
        console.log('[skills-refresh] Cron triggered');
        runSkillsRefresh(pool).catch(err => {
          console.error('[skills-refresh] Cron execution error:', err);
        });
      }, { timezone: 'UTC' });
      console.log(`⏰ Skills refresh cron scheduled: ${cronSchedule} (UTC)`);
```

- [ ] **Step 4: Commit**

```bash
git add src/api/server.js
git commit -m "feat: add daily cron job and admin endpoints for skills refresh"
```

---

### Task 7: Local Testing

- [ ] **Step 1: Start the backend server locally**

```bash
npm run dev
```

Verify in the console output:
- `⏰ Skills refresh cron scheduled: 0 3 * * *` appears
- No errors related to `season_config` table creation
- No errors from the new imports

- [ ] **Step 2: Test season resolver via analysis worker**

Use the admin panel or curl to trigger analysis — it should resolve the season ID from API → DB → memory:

```bash
# Check server logs for:
# [season-resolver] VRC season resolved from API: 197 (VEX V5 Robotics Competition 2025-2026: Push Back)
```

- [ ] **Step 3: Test manual skills refresh trigger**

```bash
curl -X POST http://localhost:3000/api/admin/skills-refresh/trigger \
  -H "Authorization: Bearer <your-admin-jwt-token>" \
  -H "Content-Type: application/json"
```

Expected response: `{"message":"Skills refresh started"}`

Watch the server logs for:
```
[skills-refresh] Starting scheduled refresh at ...
[skills-refresh] Season IDs resolved — VRC: 197, VEXIQ: 196
[skills-refresh] VRC High School: ~6824 records updated
[skills-refresh] VRC Middle School: ~3173 records updated
[skills-refresh] VEXIQ Middle School: ~6517 records updated
[skills-refresh] VEXIQ Elementary School: ~2 records updated
[skills-refresh] Completed in Xs — ~16516 total records, 0 retries, 0 failures
```

- [ ] **Step 4: Test status endpoint**

```bash
curl http://localhost:3000/api/admin/skills-refresh/status \
  -H "Authorization: Bearer <your-admin-jwt-token>"
```

Expected: JSON with `lastRefreshedAt`, `isRunning: false`, and `lastResult` showing all 4 datasets.

- [ ] **Step 5: Verify data in database**

```bash
# Check total records per matchType
curl "http://localhost:3000/api/teams?matchType=VRC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'VRC teams: {len(d)}')"
curl "http://localhost:3000/api/teams?matchType=VEXIQ" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'VEXIQ teams: {len(d)}')"
```

- [ ] **Step 6: Verify season_config table was populated**

```bash
curl "http://localhost:3000/api/health"
# Check server startup logs for:
# [season-resolver] VRC season loaded from DB: 197
# (On second restart, it should load from DB, not API)
```

- [ ] **Step 7: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: address issues found during local testing"
```

---

### Task 8: Push and Deploy

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin feature/auto-skills-refresh
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --base main --title "feat: auto-refresh skills standings daily with season auto-detection" --body "$(cat <<'EOF'
## Summary
- Daily cron job fetches world skills standings from RobotEvents internal API and upserts into `skills_standings` — replaces manual CSV upload workflow
- 3-tier season ID auto-detection (memory → DB → API → env var fallback) replaces hardcoded `CURRENT_SEASON_ID` across all usages
- Admin endpoints for refresh status and manual trigger

## Changes
**New files:**
- `src/api/services/seasonResolver.js` — shared season ID resolution with 3-tier cache
- `src/api/services/skillsRefresh.js` — fetches 4 datasets (VRC HS/MS, VEXIQ MS/Elementary), retry logic, admin status

**Modified files:**
- `src/api/server.js` — new `season_config` table, cron setup, admin endpoints, replaced 3 hardcoded `CURRENT_SEASON_ID` references
- `package.json` — added `node-cron`

## Test plan
- [ ] Manual trigger via `POST /api/admin/skills-refresh/trigger` — verify all 4 datasets upserted
- [ ] Status endpoint returns correct counts and timing
- [ ] Season auto-detection resolves correct IDs (VRC: 197, VEXIQ: 196)
- [ ] Server restart loads season from DB cache (no API call)
- [ ] Existing endpoints (performance, team events, analysis) work with auto-detected season IDs

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: After merge, verify on Railway**

Check Railway Deploy Logs for:
- `⏰ Skills refresh cron scheduled: 0 3 * * *`
- No startup errors

No new env vars required. The cron will fire at 3 AM UTC the next day. To verify immediately, use the manual trigger via the admin panel or curl against production.
