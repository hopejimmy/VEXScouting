# Performance Score v2 (VRC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the VRC team performance formula with a CCWM/Skills/Win-Rate weighted score using Bayesian shrinkage, recalibrate tier thresholds against actual data, and surface the new metrics on the match-up analysis page.

**Architecture:** Backend gets a new `getTeamPerformanceV2` function (legacy untouched), dispatched by `matchType` at the API endpoint. A pure scoring helper in a new `perfScore.js` module makes the math unit-testable. An offline preview script computes the new score distribution against production data so tier thresholds can be calibrated before deploy. Frontend extends the performance hook type, adds a `TierChip` component, and rewrites the per-team row + alliance aggregate in the match-up cards.

**Tech Stack:** Node.js (Express, pg), Next.js (TypeScript, TailwindCSS, shadcn/ui), PostgreSQL. No new dependencies. Tests use the built-in `node:test` runner (no install needed).

**Spec:** `docs/superpowers/specs/2026-04-26-perf-score-v2-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/api/services/perfScore.js` | CREATE | Pure scoring helpers: `applyShrinkage`, `computeStrength`, `tierOf`. Zero DB or HTTP dependencies — fully unit-testable. |
| `src/api/services/perfScore.test.js` | CREATE | Unit tests for the pure functions, run via `node --test`. |
| `src/api/services/analysis.js` | MODIFY | Add `getTeamPerformanceV2` and `TIER_THRESHOLDS` constant. Legacy `getTeamPerformance` untouched. |
| `src/api/server.js` | MODIFY | `/api/analysis/performance` endpoint dispatches by new `matchType` query param. |
| `scripts/preview-perf-v2.js` | CREATE | Offline report generator. Computes v2 distribution, recommends tier thresholds, produces old-vs-new comparison. |
| `frontend-nextjs/src/hooks/useTeamPerformance.ts` | MODIFY | Extend `PerformanceData` type with `ccwm` and `n`. Pass `matchType` to backend. |
| `frontend-nextjs/src/components/team/TierChip.tsx` | CREATE | Color-coded tier badge component, reusable. |
| `frontend-nextjs/src/components/team/VrcMatchCard.tsx` | MODIFY | Rewrite `TeamRow`: tier chip + strength badge + thin-data indicator + tooltip; hide sitting teams. |
| `frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx` | MODIFY | OPR → CCWM, all averages, exclude sitting teams. |

---

## Task 1: Pure scoring helpers (TDD)

**Files:**
- Create: `src/api/services/perfScore.js`
- Test:   `src/api/services/perfScore.test.js`

The math from the spec lives here as small pure functions. Keeping it separate from `analysis.js` (which talks to the DB) lets us TDD the formula without setting up a test database.

- [ ] **Step 1: Write the failing test for `applyShrinkage`**

Create `src/api/services/perfScore.test.js`:
```js
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
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
node --test src/api/services/perfScore.test.js
```
Expected: FAIL with "Cannot find module './perfScore.js'".

- [ ] **Step 3: Implement `applyShrinkage`**

Create `src/api/services/perfScore.js`:
```js
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
```

- [ ] **Step 4: Re-run, verify pass**

```bash
node --test src/api/services/perfScore.test.js
```
Expected: 3/3 pass.

- [ ] **Step 5: Add tests for `computeStrength`**

Append to `perfScore.test.js`:
```js
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
  // CCWM way above max → contribution capped at 50
  const result = computeStrength({
    ccwmShrunk: 100, maxCcwm: 20,
    maxSkills: 1000, maxSkillsCap: 400,
    winRateShrunk: 1.5, // hypothetical >100% (shouldn't happen but defensive)
  });
  // 50 + 25 + 25 = 100
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
  // Defensive: if a season has no skills data at all, maxSkillsCap = 0.
  // The skills term should fall to 0, not NaN.
  const result = computeStrength({
    ccwmShrunk: 10, maxCcwm: 20,
    maxSkills: 0, maxSkillsCap: 0,
    winRateShrunk: 0.5,
  });
  // 25 (CCWM) + 0 (Skills) + 12.5 (WR) = 37.5 → 38
  assert.equal(result, 38);
});
```

- [ ] **Step 6: Implement `computeStrength`**

Append to `perfScore.js`:
```js
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
  const normCcwm    = clamp01(safeRatio(ccwmShrunk, maxCcwm))   * 50;
  const normSkills  = clamp01(safeRatio(maxSkills, maxSkillsCap)) * 25;
  const normWinRate = clamp01(winRateShrunk) * 25;
  return Math.round(normCcwm + normSkills + normWinRate);
}
```

- [ ] **Step 7: Add tests for `tierOf`**

Append to `perfScore.test.js`:
```js
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
  // Just below Elite → High
  assert.equal(tierOf(TIER_THRESHOLDS.ELITE - 1), 'High');
  // Just below High → Mid-High
  assert.equal(tierOf(TIER_THRESHOLDS.HIGH - 1), 'Mid-High');
  // Just below Mid-High → Mid
  assert.equal(tierOf(TIER_THRESHOLDS.MID_HIGH - 1), 'Mid');
});
```

- [ ] **Step 8: Implement `tierOf` with placeholder thresholds**

Append to `perfScore.js`:
```js
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
```

- [ ] **Step 9: Run all tests, verify all pass**

```bash
node --test src/api/services/perfScore.test.js
```
Expected: 10/10 pass.

- [ ] **Step 10: Commit**

```bash
git add src/api/services/perfScore.js src/api/services/perfScore.test.js
git commit -m "Add pure scoring helpers for performance v2

applyShrinkage, computeStrength, tierOf as testable pure functions.
Tier thresholds are placeholders; recalibrated after preview run.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: `getTeamPerformanceV2` (DB query + JS wrapper)

**Files:**
- Modify: `src/api/services/analysis.js`

This is the new query function — wraps the SQL query, calls the pure helpers from Task 1, returns the same response shape as the legacy function plus `ccwm` and `n`.

- [ ] **Step 1: Verify `events.seasonId` is reliably populated**

Before writing the query, confirm whether `events.seasonId` is filled in for the rows we'll be querying. Run:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS total, COUNT(seasonId) AS with_season FROM events WHERE processed = true;"
```

Expected outcomes:
- **If `with_season` ≈ `total`**: seasonId is reliable, use it directly in the query.
- **If many rows have NULL seasonId**: fall back to filtering events whose `start_date` falls within the season window from `season_config`. The query in Step 2 below handles both cases via a CTE; if seasonId is reliable, the date-fallback path is dead code we can remove.

Document the result by adding a comment at the top of `getTeamPerformanceV2`.

- [ ] **Step 2: Verify VRC scoping approach**

Confirm the VRC-event-identification approach. Run:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(DISTINCT teamNumber) FROM skills_standings WHERE matchType = 'VRC';"
```

Expected: a number in the hundreds-to-thousands range (one row per VRC team that has any skills data). This set is the universe we'll filter `team_event_stats` against.

- [ ] **Step 3: Add `getTeamPerformanceV2` to `analysis.js`**

Append the following to `src/api/services/analysis.js` (just below the existing `getTeamPerformance` function):

```js
import { applyShrinkage, computeStrength, tierOf } from './perfScore.js';

/**
 * v2 performance query for VRC teams.
 *
 * Computes a 50% CCWM + 25% Skills + 25% Win Rate weighted score with
 * Bayesian shrinkage (k=5) on the noisy averages. Per-season normalization
 * uses the 99th percentile so a single outlier doesn't squash the scale.
 *
 * VRC scoping: filters team_event_stats to teams that have any
 * skills_standings row with matchType='VRC'. This avoids needing a
 * `program` column on events.
 *
 * Season scoping: uses events.seasonId (verified populated for processed
 * events as of <date>; if your DB shows otherwise see Task 2 Step 1).
 *
 * Returns the same shape as getTeamPerformance plus `ccwm` and `n`.
 */
const SHRINKAGE_K = 5;

export async function getTeamPerformanceV2(pool, teamNumbers, seasonId) {
  if (teamNumbers.length === 0) return [];

  const placeholders = teamNumbers.map((_, i) => `$${i + 3}`).join(',');

  // Single query: per-team aggregates + per-season population stats via CTEs.
  // Population stats are computed across all VRC teams in the season, not
  // just the requested teams, so a small request batch still gets a
  // representative population mean.
  const query = `
    WITH vrc_teams AS (
      SELECT DISTINCT teamNumber AS team_number
      FROM skills_standings
      WHERE matchType = 'VRC'
    ),
    season_events AS (
      SELECT sku FROM events WHERE seasonId = $1
    ),
    per_team_avg AS (
      SELECT t.team_number,
             COUNT(*) AS n,
             AVG(t.ccwm) AS avg_ccwm,
             AVG(t.win_rate) AS avg_win_rate
      FROM team_event_stats t
      JOIN season_events se ON t.sku = se.sku
      JOIN vrc_teams v ON v.team_number = t.team_number
      GROUP BY t.team_number
    ),
    season_pop AS (
      SELECT
        AVG(avg_ccwm)     AS pop_ccwm,
        AVG(avg_win_rate) AS pop_win_rate,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY avg_ccwm) AS max_ccwm
      FROM per_team_avg
    ),
    skills_pop AS (
      SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY score) AS max_skills_cap
      FROM skills_standings
      WHERE matchType = $2
    )
    SELECT
      pta.team_number,
      pta.n,
      pta.avg_ccwm,
      pta.avg_win_rate,
      (SELECT MAX(score) FROM skills_standings s
        WHERE s.teamNumber = pta.team_number AND s.matchType = $2) AS max_skills,
      (SELECT AVG(opr)  FROM team_event_stats t2
         JOIN season_events se2 ON t2.sku = se2.sku
        WHERE t2.team_number = pta.team_number) AS avg_opr,
      sp.pop_ccwm, sp.pop_win_rate, sp.max_ccwm,
      skp.max_skills_cap
    FROM per_team_avg pta
    CROSS JOIN season_pop sp
    CROSS JOIN skills_pop skp
    WHERE pta.team_number IN (${placeholders});
  `;

  const result = await pool.query(query, [seasonId, 'VRC', ...teamNumbers]);

  return result.rows.map(row => {
    const n = parseInt(row.n) || 0;
    const avgCcwm = parseFloat(row.avg_ccwm) || 0;
    const avgWinRate = parseFloat(row.avg_win_rate) || 0;
    const maxSkills = parseInt(row.max_skills) || 0;
    const avgOpr = parseFloat(row.avg_opr) || 0;
    const popCcwm = parseFloat(row.pop_ccwm) || 0;
    const popWinRate = parseFloat(row.pop_win_rate) || 0;
    const maxCcwm = parseFloat(row.max_ccwm) || 1;        // avoid /0
    const maxSkillsCap = parseFloat(row.max_skills_cap) || 1;

    const ccwmShrunk = applyShrinkage({
      n, observed: avgCcwm, populationMean: popCcwm, k: SHRINKAGE_K,
    });
    const winRateShrunk = applyShrinkage({
      n, observed: avgWinRate, populationMean: popWinRate, k: SHRINKAGE_K,
    });

    const strength = computeStrength({
      ccwmShrunk, maxCcwm,
      maxSkills, maxSkillsCap,
      winRateShrunk,
    });

    return {
      teamNumber: row.team_number,
      opr: avgOpr.toFixed(2),
      ccwm: avgCcwm.toFixed(2),
      winRate: (avgWinRate * 100).toFixed(1) + '%',
      skills: maxSkills,
      strength,
      tier: tierOf(strength),
      n,
    };
  });
}
```

- [ ] **Step 4: Smoke-test the function via a one-shot Node script**

Run from repo root:

```bash
node -e "
import('./src/api/services/analysis.js').then(async (m) => {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const seasonId = parseInt(process.env.SEASON_ID || '197');
  // Replace with two team numbers you know are in the DB:
  const result = await m.getTeamPerformanceV2(pool, ['1234A', '5678B'], seasonId);
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
});
"
```

Expected: prints two objects with shape `{ teamNumber, opr, ccwm, winRate, skills, strength, tier, n }`. `strength` is a number 0–100, `tier` is one of the five tier names.

If the query errors with "column ... does not exist", check the column casing in `events` and `skills_standings` (`seasonId` vs `season_id`, `teamNumber` vs `team_number`) and adjust.

- [ ] **Step 5: Commit**

```bash
git add src/api/services/analysis.js
git commit -m "Add getTeamPerformanceV2 for VRC weighted score

New query that uses CCWM/Skills/Win Rate with Bayesian shrinkage,
scoped to VRC events. Legacy getTeamPerformance untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Endpoint dispatch by `matchType`

**Files:**
- Modify: `src/api/server.js:1311-1339`

The existing `/api/analysis/performance` endpoint always calls `getTeamPerformance`. Add a `matchType` query param that routes VRC requests to the v2 function.

- [ ] **Step 1: Add the dispatch logic**

In `src/api/server.js`, replace the body of the `/api/analysis/performance` route (around line 1311) with:

```js
app.get('/api/analysis/performance', async (req, res) => {
  try {
    const { teams } = req.query;
    if (!teams) {
      return res.status(400).json({ error: 'Teams parameter required (comma-separated list)' });
    }

    const teamList = teams.split(',').map(t => t.trim());
    const seasonId = req.query.season || await getCurrentSeasonId(pool, 1) || 197;
    const matchType = req.query.matchType || 'VRC';

    // VRC uses v2 (CCWM/Skills/WinRate weighted with shrinkage). VEXU and
    // any other program continues to use the legacy formula until they
    // get their own v2.
    const performanceData = matchType === 'VRC'
      ? await getTeamPerformanceV2(pool, teamList, seasonId)
      : await getTeamPerformance(pool, teamList, seasonId);

    res.json(performanceData);
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Error analyzing team performance' });
  }
});
```

- [ ] **Step 2: Add `getTeamPerformanceV2` to the import**

Find the existing import of `getTeamPerformance` in `src/api/server.js` (search for `from './services/analysis'`) and extend it:

```js
import { getTeamPerformance, getTeamPerformanceV2 } from './services/analysis.js';
```

(Match the existing import style in the file — if it uses `require`, use `require`.)

- [ ] **Step 3: Smoke test via curl**

Start the dev server:
```bash
npm run dev
```

In another terminal:
```bash
# v2 path (VRC) - response should include ccwm and n fields
curl -s "http://localhost:3000/api/analysis/performance?teams=1234A&matchType=VRC&season=197" | python3 -m json.tool

# legacy path (VEXU) - response should NOT include ccwm or n
curl -s "http://localhost:3000/api/analysis/performance?teams=1234A&matchType=VEXU&season=197" | python3 -m json.tool

# Default (no matchType) - should hit v2 (default is VRC)
curl -s "http://localhost:3000/api/analysis/performance?teams=1234A&season=197" | python3 -m json.tool
```

Expected: VRC and default paths return objects with `ccwm` and `n` fields. VEXU path returns the legacy shape (no ccwm, no n).

- [ ] **Step 4: Commit**

```bash
git add src/api/server.js
git commit -m "Dispatch /api/analysis/performance by matchType

VRC routes to getTeamPerformanceV2. VEXU and others continue using
the legacy formula.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Pass `matchType` from frontend hook

**Files:**
- Modify: `frontend-nextjs/src/hooks/useTeamPerformance.ts`

The hook currently doesn't pass `matchType` to the API, so the backend always sees the default. Frontend callers know `matchType` (it's in the URL). Pipe it through.

- [ ] **Step 1: Extend the hook signature and the type**

Replace the entire contents of `frontend-nextjs/src/hooks/useTeamPerformance.ts` with:

```ts
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PerformanceData {
    teamNumber: string;
    opr: string;
    ccwm: string;       // NEW: needed for alliance aggregate
    winRate: string;
    skills: number;
    strength: number;
    tier: string;
    n: number;          // NEW: event count, drives thin-data indicator
}

export function useTeamPerformance(teamNumbers: string[], matchType: string = 'VRC') {
    return useQuery<PerformanceData[]>({
        queryKey: ['teamPerformance', matchType, teamNumbers.sort().join(',')],
        queryFn: async () => {
            if (teamNumbers.length === 0) return [];

            const params = new URLSearchParams();
            params.append('teams', teamNumbers.join(','));
            params.append('matchType', matchType);

            const response = await fetch(`${API_BASE_URL}/api/analysis/performance?${params.toString()}`);
            if (!response.ok) {
                console.error('Failed to fetch performance data');
                return [];
            }
            return response.json();
        },
        enabled: teamNumbers.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false
    });
}
```

Note: the type adds `ccwm` and `n` as required fields. For the VEXU code path (legacy backend), these will be `undefined` at runtime — the UI components must handle them defensively (Task 8 covers this).

- [ ] **Step 2: Update the call site in the match-list page**

In `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx`, find the existing call (around line 80):

```tsx
const { data: performanceList } = useTeamPerformance(isVexiq ? [] : allTeamNumbers);
```

Change to pass `matchType`:

```tsx
const { data: performanceList } = useTeamPerformance(isVexiq ? [] : allTeamNumbers, matchType);
```

- [ ] **Step 3: Manual smoke test in the browser**

```bash
cd frontend-nextjs && npm run dev
```

Navigate to a recent VRC event's match-list page (e.g. `http://localhost:3001/team/<known-VRC-team>/event/<event-id>?matchType=VRC&...`). In the browser DevTools Network tab, find the `/api/analysis/performance` request — confirm the URL includes `matchType=VRC`. Confirm the response contains `ccwm` and `n` fields.

- [ ] **Step 4: Commit**

```bash
git add frontend-nextjs/src/hooks/useTeamPerformance.ts frontend-nextjs/src/app/team/\[teamNumber\]/event/\[eventId\]/page.tsx
git commit -m "Pass matchType through useTeamPerformance to backend

Adds ccwm and n to the type. VRC requests now hit getTeamPerformanceV2.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Preview script

**Files:**
- Create: `scripts/preview-perf-v2.js`

Generates a markdown report comparing v2 against legacy. The user reads the report and decides on tier thresholds.

- [ ] **Step 1: Create the script**

Create `scripts/preview-perf-v2.js`:

```js
// Offline preview of Performance Score v2 distribution.
// Run locally against production DB (read-only):
//
//   DATABASE_URL=postgres://... node scripts/preview-perf-v2.js --season=197
//
// Outputs a markdown report under docs/.
//
// The v2 formula is duplicated inline (not imported) so the preview
// stays frozen against the spec-as-of-today even if analysis.js drifts.

import 'dotenv/config';
import { Pool } from 'pg';
import { writeFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, '').split('='))
);
const seasonId = parseInt(args.season || process.env.SEASON_ID || '197');
const SHRINKAGE_K = 5;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Pull every VRC team that has any team_event_stats in this season
  const { rows } = await pool.query(`
    WITH vrc_teams AS (
      SELECT DISTINCT teamNumber AS team_number FROM skills_standings WHERE matchType = 'VRC'
    ),
    season_events AS (
      SELECT sku FROM events WHERE seasonId = $1
    ),
    per_team_avg AS (
      SELECT t.team_number,
             COUNT(*) AS n,
             AVG(t.ccwm) AS avg_ccwm,
             AVG(t.opr)  AS avg_opr,
             AVG(t.win_rate) AS avg_win_rate
      FROM team_event_stats t
      JOIN season_events se ON t.sku = se.sku
      JOIN vrc_teams v ON v.team_number = t.team_number
      GROUP BY t.team_number
    ),
    season_pop AS (
      SELECT AVG(avg_ccwm) AS pop_ccwm, AVG(avg_win_rate) AS pop_win_rate,
             percentile_cont(0.99) WITHIN GROUP (ORDER BY avg_ccwm) AS max_ccwm
      FROM per_team_avg
    ),
    skills_pop AS (
      SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY score) AS max_skills_cap
      FROM skills_standings WHERE matchType = 'VRC'
    )
    SELECT pta.*,
      (SELECT MAX(score) FROM skills_standings s
        WHERE s.teamNumber = pta.team_number AND s.matchType = 'VRC') AS max_skills,
      sp.pop_ccwm, sp.pop_win_rate, sp.max_ccwm,
      skp.max_skills_cap
    FROM per_team_avg pta
    CROSS JOIN season_pop sp
    CROSS JOIN skills_pop skp;
  `, [seasonId]);

  const clamp01 = x => Math.max(0, Math.min(1, x));
  const safeRatio = (n, d) => d > 0 ? n / d : 0;

  const teams = rows.map(r => {
    const n = parseInt(r.n) || 0;
    const avgCcwm = parseFloat(r.avg_ccwm) || 0;
    const avgOpr = parseFloat(r.avg_opr) || 0;
    const avgWr = parseFloat(r.avg_win_rate) || 0;
    const skills = parseInt(r.max_skills) || 0;
    const popCcwm = parseFloat(r.pop_ccwm) || 0;
    const popWr = parseFloat(r.pop_win_rate) || 0;
    const maxCcwm = parseFloat(r.max_ccwm) || 1;
    const maxSkillsCap = parseFloat(r.max_skills_cap) || 1;

    const ccwmShrunk = (n * avgCcwm + SHRINKAGE_K * popCcwm) / (n + SHRINKAGE_K);
    const wrShrunk = (n * avgWr + SHRINKAGE_K * popWr) / (n + SHRINKAGE_K);

    const newScore = Math.round(
      clamp01(safeRatio(ccwmShrunk, maxCcwm)) * 50 +
      clamp01(safeRatio(skills, maxSkillsCap)) * 25 +
      clamp01(wrShrunk) * 25
    );

    // Legacy formula for comparison: 40% OPR + 60% Win Rate
    const legacyScore = Math.round(
      Math.min(40, (avgOpr / 30) * 40) + avgWr * 60
    );

    return { team: r.team_number, n, avgCcwm, avgOpr, avgWr, skills, newScore, legacyScore };
  }).sort((a, b) => b.newScore - a.newScore);

  // Distribution histogram (5-point buckets)
  const buckets = {};
  teams.forEach(t => {
    const b = Math.floor(t.newScore / 5) * 5;
    buckets[b] = (buckets[b] || 0) + 1;
  });

  // Recommended thresholds for 5/15/25/30/25 pyramid
  const sorted = teams.map(t => t.newScore).sort((a, b) => b - a);
  const at = pct => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * pct))];
  const recommended = {
    ELITE:    at(0.05),
    HIGH:     at(0.20),
    MID_HIGH: at(0.45),
    MID:      at(0.75),
  };

  // Old-vs-new biggest movers
  const movers = [...teams]
    .map(t => ({ ...t, delta: t.newScore - t.legacyScore }))
    .sort((a, b) => b.delta - a.delta);
  const risers = movers.slice(0, 10);
  const fallers = movers.slice(-10).reverse();

  // Markdown
  const date = new Date().toISOString().slice(0, 10);
  let md = `# Performance v2 Preview — Season ${seasonId} — ${date}\n\n`;
  md += `Total VRC teams scored: **${teams.length}**\n\n`;

  md += `## Score distribution (5-point buckets)\n\n\`\`\`\n`;
  Object.keys(buckets).map(Number).sort((a, b) => a - b).forEach(b => {
    md += `${String(b).padStart(3)}-${b + 4} | ${'█'.repeat(Math.min(80, buckets[b]))} (${buckets[b]})\n`;
  });
  md += `\`\`\`\n\n`;

  md += `## Recommended tier thresholds\n\n`;
  md += `Set in \`src/api/services/perfScore.js\` → \`TIER_THRESHOLDS\`:\n\n`;
  md += `\`\`\`js\nexport const TIER_THRESHOLDS = {\n`;
  md += `  ELITE: ${recommended.ELITE},     // top  ~5%\n`;
  md += `  HIGH: ${recommended.HIGH},       // next ~15%\n`;
  md += `  MID_HIGH: ${recommended.MID_HIGH},   // next ~25%\n`;
  md += `  MID: ${recommended.MID},         // next ~30%\n`;
  md += `};\n\`\`\`\n\n`;

  md += `## Top 30 teams (by v2 score)\n\n`;
  md += `| Rank | Team | n | New | Legacy | Δ |\n|---|---|---|---|---|---|\n`;
  teams.slice(0, 30).forEach((t, i) => {
    md += `| ${i + 1} | ${t.team} | ${t.n} | ${t.newScore} | ${t.legacyScore} | ${t.newScore - t.legacyScore >= 0 ? '+' : ''}${t.newScore - t.legacyScore} |\n`;
  });

  md += `\n## Top 10 risers (legacy → v2)\n\n`;
  md += `| Team | n | Legacy | New | Δ |\n|---|---|---|---|---|\n`;
  risers.forEach(t => {
    md += `| ${t.team} | ${t.n} | ${t.legacyScore} | ${t.newScore} | +${t.delta} |\n`;
  });

  md += `\n## Top 10 fallers (legacy → v2)\n\n`;
  md += `| Team | n | Legacy | New | Δ |\n|---|---|---|---|---|\n`;
  fallers.forEach(t => {
    md += `| ${t.team} | ${t.n} | ${t.legacyScore} | ${t.newScore} | ${t.delta} |\n`;
  });

  md += `\n## Sanity check — known-strong teams\n\n`;
  md += `Edit this section to include teams you know should rank in the top tier\n`;
  md += `(Worlds finalists, top seeds for this season). If they don't appear high\n`;
  md += `in the top-30 table above, something is off.\n`;

  const outPath = `docs/perf-v2-preview-${seasonId}-${date}.md`;
  writeFileSync(outPath, md);
  console.log(`Wrote ${outPath}`);
  console.log(`\nRecommended thresholds for TIER_THRESHOLDS:`);
  console.log(JSON.stringify(recommended, null, 2));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the preview script**

```bash
DATABASE_URL=$DATABASE_URL node scripts/preview-perf-v2.js --season=197
```

Expected: prints `Wrote docs/perf-v2-preview-197-<date>.md` and the recommended thresholds JSON.

- [ ] **Step 3: Commit the script and the generated report**

```bash
git add scripts/preview-perf-v2.js docs/perf-v2-preview-197-*.md
git commit -m "Add preview-perf-v2 script and initial report

Generates markdown report comparing v2 against legacy: distribution
histogram, recommended pyramid thresholds, top 30 teams, biggest
movers. Run before deploy to calibrate TIER_THRESHOLDS.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## USER ACTION: Review the preview report

Stop here and wait for the user to review `docs/perf-v2-preview-<season>-<date>.md`.

Things to check:
- Distribution histogram looks bell-ish, not bimodal or flat.
- Recommended thresholds look plausible (Elite 75–85 range, Mid 30–45 range).
- Top 30 teams include teams the user knows are strong this season (Worlds finalists, top-seed teams).
- "Biggest movers" — any single team moving >20 points warrants spot-checking. Real correction or bug?

If everything looks good → proceed to Task 6 with the recommended thresholds.

If something looks off → fix the bug or adjust the formula, re-run preview, re-review.

---

## Task 6: Encode calibrated tier thresholds

**Files:**
- Modify: `src/api/services/perfScore.js`

Replace the placeholder thresholds in `TIER_THRESHOLDS` with the values the user approved from the preview report.

- [ ] **Step 1: Update `TIER_THRESHOLDS`**

In `src/api/services/perfScore.js`, replace the placeholder values:

```js
export const TIER_THRESHOLDS = {
  ELITE: <value from preview report>,
  HIGH: <value from preview report>,
  MID_HIGH: <value from preview report>,
  MID: <value from preview report>,
};
```

- [ ] **Step 2: Re-run unit tests**

```bash
node --test src/api/services/perfScore.test.js
```

Expected: all 10 tests still pass. The tier-boundary tests are written against `TIER_THRESHOLDS.X` symbolically, so they don't break when the values change.

- [ ] **Step 3: Commit**

```bash
git add src/api/services/perfScore.js
git commit -m "Calibrate tier thresholds from season <id> preview

Pyramid distribution: top 5% Elite / next 15% High / next 25%
Mid-High / next 30% Mid / bottom 25% Developing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: `TierChip` component

**Files:**
- Create: `frontend-nextjs/src/components/team/TierChip.tsx`

Reusable color-coded badge for tier display.

- [ ] **Step 1: Create the component**

Create `frontend-nextjs/src/components/team/TierChip.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';

interface TierChipProps {
  tier: string;
  className?: string;
}

const TIER_STYLES: Record<string, string> = {
  Elite:       'bg-purple-100 text-purple-700 border-purple-200',
  High:        'bg-blue-100 text-blue-700 border-blue-200',
  'Mid-High':  'bg-teal-100 text-teal-700 border-teal-200',
  Mid:         'bg-gray-100 text-gray-700 border-gray-200',
  Developing:  'bg-amber-100 text-amber-700 border-amber-200',
};

export function TierChip({ tier, className = '' }: TierChipProps) {
  const style = TIER_STYLES[tier] || TIER_STYLES['Developing'];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style} ${className}`}>
      {tier}
    </Badge>
  );
}
```

- [ ] **Step 2: Visual smoke test**

Temporarily add `<TierChip tier="Elite" /> <TierChip tier="High" /> ... <TierChip tier="Developing" />` somewhere visible (e.g. the top of `frontend-nextjs/src/app/page.tsx`) and confirm in the browser that all five render with distinct colors. Remove the test markup before committing.

- [ ] **Step 3: Commit**

```bash
git add frontend-nextjs/src/components/team/TierChip.tsx
git commit -m "Add TierChip component for color-coded tier display

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Rewrite `TeamRow` in `VrcMatchCard`

**Files:**
- Modify: `frontend-nextjs/src/components/team/VrcMatchCard.tsx:105-141`

Replace the WR-only display with tier chip + strength + thin-data indicator + tooltip. Hide sitting teams entirely. The alliance teams `.map()` also needs filtering.

- [ ] **Step 1: Update imports**

At the top of `frontend-nextjs/src/components/team/VrcMatchCard.tsx`, add:

```tsx
import { TierChip } from '@/components/team/TierChip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

If the project doesn't have `Tooltip` from shadcn/ui, add it via:
```bash
cd frontend-nextjs && npx shadcn@latest add tooltip
```

Verify the file `frontend-nextjs/src/components/ui/tooltip.tsx` exists after.

- [ ] **Step 2: Filter sitting teams from alliance rendering**

Find the two alliance rendering blocks (currently `redAlliance?.teams.map(...)` and `blueAlliance?.teams.map(...)` around lines 64-90). Update both to filter out sitting teams:

```tsx
{redAlliance?.teams.filter(t => !t.sitting).map((t) => (
  <TeamRow
    key={t.team.id}
    team={t}
    isFocused={t.team.name === teamNumber}
    performanceData={performanceMap[t.team.name]}
    showAnalysis={predictionMode}
  />
))}
```

And for blue:
```tsx
{blueAlliance?.teams.filter(t => !t.sitting).map((t) => (
  <TeamRow
    key={t.team.id}
    team={t}
    isFocused={t.team.name === teamNumber}
    performanceData={performanceMap[t.team.name]}
    showAnalysis={predictionMode}
  />
))}
```

- [ ] **Step 3: Replace the `TeamRow` body**

Replace the entire `TeamRow` function (currently lines 105-141) with:

```tsx
function TeamRow({
    team,
    isFocused,
    performanceData,
    showAnalysis,
}: {
    team: any;
    isFocused: boolean;
    performanceData?: PerformanceData;
    showAnalysis: boolean;
}) {
    return (
        <div className={`flex justify-between items-center p-2 rounded ${isFocused ? 'bg-gray-100 ring-1 ring-gray-200' : ''}`}>
            <div className="flex items-center space-x-2">
                <span className={`font-medium ${isFocused ? 'text-gray-900' : 'text-gray-600'}`}>
                    {team.team.name}
                </span>
            </div>

            <div className="flex items-center space-x-2">
                {showAnalysis && performanceData && (
                    <>
                        <TierChip tier={performanceData.tier} />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-700 cursor-help">
                                        S:{performanceData.strength}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs space-y-0.5">
                                        <div>WR: {performanceData.winRate}</div>
                                        <div>CCWM: {performanceData.ccwm ?? '—'}</div>
                                        <div>Skills: {performanceData.skills}</div>
                                        <div>Events: {performanceData.n ?? '—'}</div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {(performanceData.n ?? 0) > 0 && (performanceData.n ?? 0) <= 2 && (
                            <span className="text-xs text-amber-600" title={`Based on only ${performanceData.n} event(s) — score may be unreliable.`}>
                                ?
                            </span>
                        )}
                    </>
                )}
                {team.team.rank && (
                    <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                        Rank #{team.team.rank}
                    </Badge>
                )}
            </div>
        </div>
    );
}
```

Note: the `performanceData.ccwm ?? '—'` and `performanceData.n ?? '—'` defaults guard against the legacy backend response (VEXU code path) which doesn't include those fields. This keeps the UI safe even though VEXU goes through `VexiqMatchCard`, not this one — defensive coding for the rare case.

- [ ] **Step 4: Manual visual test**

```bash
cd frontend-nextjs && npm run dev
```

Navigate to a recent VRC event's match-list page with a team you know has events. Click "Predict Matches" to enable analysis mode. Verify:
- Each per-team row shows: team number | tier chip (color-coded) | `S:<n>` badge | Rank #X
- Hovering the strength badge shows the tooltip with WR / CCWM / Skills / Events
- No "Sit" badges visible (any sitting teams are now hidden entirely)
- Teams with `n ≤ 2` show a small `?` after the strength badge

- [ ] **Step 5: Commit**

```bash
git add frontend-nextjs/src/components/team/VrcMatchCard.tsx frontend-nextjs/src/components/ui/tooltip.tsx
git commit -m "Rewrite TeamRow with tier chip, strength, thin-data indicator

- Tier chip color-coded by tier (Elite/High/Mid-High/Mid/Developing)
- Strength badge with hover tooltip showing WR/CCWM/Skills/Events
- Thin-data ? icon when n <= 2
- Sitting teams hidden from alliance rendering entirely

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Rewrite `MatchAnalysisCard` alliance aggregate

**Files:**
- Modify: `frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx`

Switch the second column from OPR (sum) to CCWM (avg). Make all three columns averages. Exclude sitting teams. The component receives `redAlliance: string[]` and `blueAlliance: string[]` (just team numbers) — sitting filter must happen at the call site.

- [ ] **Step 1: Update the call site to filter sitting teams before passing**

In `frontend-nextjs/src/components/team/VrcMatchCard.tsx`, find the `<MatchAnalysisCard ... />` block (around line 93-99) and change:

```tsx
<MatchAnalysisCard
    redAlliance={redAlliance?.teams.filter(t => !t.sitting).map(t => t.team.name) || []}
    blueAlliance={blueAlliance?.teams.filter(t => !t.sitting).map(t => t.team.name) || []}
    performanceMap={performanceMap}
/>
```

- [ ] **Step 2: Rewrite `MatchAnalysisCard.tsx`**

Replace the entire contents of `frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx` with:

```tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PerformanceData } from '@/hooks/useTeamPerformance';

interface MatchAnalysisCardProps {
    redAlliance: string[];
    blueAlliance: string[];
    performanceMap: Record<string, PerformanceData>;
}

export function MatchAnalysisCard({ redAlliance, blueAlliance, performanceMap }: MatchAnalysisCardProps) {
    const getStats = (teams: string[]) => {
        let totalStrength = 0;
        let totalCcwm = 0;
        let totalSkills = 0;
        let count = 0;

        teams.forEach(t => {
            const data = performanceMap[t];
            if (data) {
                totalStrength += data.strength;
                totalCcwm += parseFloat(data.ccwm ?? '0');
                totalSkills += data.skills;
                count++;
            }
        });

        return {
            strength: count > 0 ? Math.round(totalStrength / count) : 0,
            ccwm: count > 0 ? (totalCcwm / count).toFixed(1) : '0.0',
            skills: count > 0 ? Math.round(totalSkills / count) : 0
        };
    };

    const redStats = getStats(redAlliance);
    const blueStats = getStats(blueAlliance);

    const totalStrength = redStats.strength + blueStats.strength;
    const redWinProb = totalStrength > 0 ? (redStats.strength / totalStrength) * 100 : 50;
    const blueWinProb = 100 - redWinProb;

    let prediction = 'Toss Up';
    if (redWinProb > 60) prediction = 'Red Favored';
    if (redWinProb > 75) prediction = 'Red Dominant';
    if (blueWinProb > 60) prediction = 'Blue Favored';
    if (blueWinProb > 75) prediction = 'Blue Dominant';

    return (
        <Card className="mt-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">MATCH PREDICTION</span>
                    <Badge variant={prediction.includes('Red') ? 'destructive' : prediction.includes('Blue') ? 'default' : 'secondary'}>
                        {prediction} {Math.max(redWinProb, blueWinProb).toFixed(0)}%
                    </Badge>
                </div>

                <div className="relative h-4 w-full bg-blue-100 rounded-full overflow-hidden mb-4 flex">
                    <div
                        className="h-full bg-red-500 transition-all duration-1000"
                        style={{ width: `${redWinProb}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs font-bold mb-4">
                    <span className="text-red-600">{redWinProb.toFixed(0)}%</span>
                    <span className="text-blue-600">{blueWinProb.toFixed(0)}%</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="space-y-2">
                        <div className="text-red-700 font-bold">{redStats.strength}</div>
                        <div className="text-gray-600">{redStats.ccwm}</div>
                        <div className="text-gray-600">{redStats.skills}</div>
                    </div>
                    <div className="space-y-2 text-gray-400 font-medium">
                        <div>STRENGTH</div>
                        <div>CCWM (Avg)</div>
                        <div>SKILLS (Avg)</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-blue-700 font-bold">{blueStats.strength}</div>
                        <div className="text-gray-600">{blueStats.ccwm}</div>
                        <div className="text-gray-600">{blueStats.skills}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
```

Differences from the original:
- `totalOpr` → `totalCcwm`, parsed from the new `ccwm` field
- Returns `ccwm` (avg, fixed to 1 decimal) instead of `opr` (sum)
- Skills is now an average, not a sum (was already avg, but label clarified)
- Center column label: `OPR (Sum)` → `CCWM (Avg)`
- Sitting filtering happens at the call site (Step 1), so no filtering needed here

- [ ] **Step 3: Manual visual test**

In the running dev server, navigate to a VRC event match-list page, enable predictions. Verify the alliance aggregate card shows:
- STRENGTH | CCWM (Avg) | SKILLS (Avg) labels
- Red and blue numbers are reasonable (CCWM in single-digits to teens for normal teams)
- Win probability bar still renders

Open a match where one team is `sitting` (if any exist in current data, otherwise simulate by editing local DB) and confirm that team is excluded from both the per-team rows and the aggregate.

- [ ] **Step 4: Commit**

```bash
git add frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx frontend-nextjs/src/components/team/VrcMatchCard.tsx
git commit -m "MatchAnalysisCard: switch to CCWM avg, exclude sitting teams

- OPR (sum) -> CCWM (avg) in alliance aggregate column 2
- All three columns are now averages for consistent comparison
- Sitting teams filtered at the VrcMatchCard call site, excluded
  from both per-team rendering and the alliance aggregate

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: End-to-end smoke test (pre-deploy)

**Files:** none

Validate the whole chain locally before opening the PR.

- [ ] **Step 1: Run unit tests**

```bash
node --test src/api/services/perfScore.test.js
```
Expected: 10/10 pass.

- [ ] **Step 2: Restart backend, verify v2 endpoint shape**

```bash
npm run dev
# In another terminal:
curl -s "http://localhost:3000/api/analysis/performance?teams=<known-VRC-team>&matchType=VRC&season=197" | python3 -m json.tool
```
Expected: response has `ccwm`, `n`, `strength`, `tier` fields. `strength` is 0–100. `tier` is one of the five tier names.

- [ ] **Step 3: Verify legacy path still works**

```bash
curl -s "http://localhost:3000/api/analysis/performance?teams=<known-VEXU-team>&matchType=VEXU&season=197" | python3 -m json.tool
```
Expected: legacy response shape (no `ccwm`, no `n`).

- [ ] **Step 4: Frontend smoke test**

```bash
cd frontend-nextjs && npm run dev
```

Navigate to a recent VRC event match-list page, enable predictions:
- [ ] Per-team rows show colored tier chips
- [ ] Per-team rows show `S:<n>` strength badges
- [ ] Hovering the strength badge shows the tooltip with WR/CCWM/Skills/Events
- [ ] Alliance aggregate shows STRENGTH / CCWM (Avg) / SKILLS (Avg) labels
- [ ] Win probability bar still renders sensibly
- [ ] No console errors

Navigate to a recent VEXU event match-list page:
- [ ] Page renders identically to before (legacy formula, no UI changes)
- [ ] No console errors

- [ ] **Step 5: Open PR**

```bash
git push -u origin <branch-name>
gh pr create --title "Performance Score v2 (VRC)" --body "$(cat <<'EOF'
## Summary
- Replaces the VRC team performance formula with 50% CCWM + 25% Skills + 25% Win Rate, with Bayesian shrinkage (k=5) on the noisy averages
- Recalibrates tier thresholds to a 5/15/25/30/25 pyramid using the preview script
- Surfaces the new metrics on the match-up analysis page (per-team tier chips, strength badges, thin-data indicators; CCWM in alliance aggregate; sitting teams hidden)
- VEXU and VEXIQ unchanged — legacy formula and UI

## Spec & plan
- Spec: docs/superpowers/specs/2026-04-26-perf-score-v2-design.md
- Plan: docs/superpowers/plans/2026-04-26-perf-score-v2.md
- Preview report: docs/perf-v2-preview-<season>-<date>.md

## Test plan
- [ ] Unit tests: \`node --test src/api/services/perfScore.test.js\` (10 tests)
- [ ] VRC team profile loads with new score
- [ ] VRC match-list page with predictions enabled shows tier chips, strength badges, alliance CCWM
- [ ] VEXU match-list page renders identically to before
- [ ] No console errors in either path

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Post-deploy smoke test**

After Railway and Vercel finish deploying:

```bash
# Backend smoke
curl -s "https://vexscouting-production.up.railway.app/api/analysis/performance?teams=<known-VRC-team>&matchType=VRC&season=197" | python3 -m json.tool

# Frontend smoke: load https://vexscouting.ca/team/<known-VRC-team>/event/<recent-VRC-event>?...&matchType=VRC
# Verify tier chips, strength badges, alliance CCWM, no console errors.
```

If anything looks broken: revert the PR. Both platforms re-deploy on the revert, restoring the legacy formula in ~5 minutes.

---

## Self-review notes

**Spec coverage check:**
- Formula (50/25/25 weights, k=5 shrinkage, percentile normalization) → Tasks 1-2
- Tier thresholds (pyramid, recalibrated) → Tasks 5-6
- VRC-only scope (legacy untouched, dispatch by matchType) → Tasks 2-4
- UI changes (tier chip, strength, thin-data, hide sitting, CCWM in aggregate) → Tasks 7-9
- Preview script and rollout → Tasks 5, 10
- Implementation notes (events.seasonId verification, VRC scoping approach) → Task 2 Steps 1-2

All spec sections covered.

**Type consistency:** `PerformanceData.ccwm` is `string` (matches the existing `opr: string` pattern, returned as `.toFixed(2)`). `PerformanceData.n` is `number`. The optional-chaining defensive defaults (`?? '—'`, `?? 0`) handle the case where the legacy backend response omits these fields.

**Things explicitly NOT in this plan** (deferred to future work, per spec):
- Local/Premier match-type weighting (needs `events.level` capture + backfill)
- Percentile-based scoring (alternative considered, deferred)
- OPR removal from DB or display (still computed/stored)
- Win-probability formula rework (needs calibration)
- VEXU and VEXIQ score updates
