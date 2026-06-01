# Performance Score v2 (VRC) — Design

**Date:** 2026-04-26
**Status:** Approved for planning
**Scope:** VRC only. VEXU and VEXIQ unchanged.

## Problem

The current team performance score over-rewards local match wins.

```js
// src/api/services/analysis.js:415-423 (current)
strength = (avgOPR / 30) * 40 + avgWinRate * 60
```

Observed in production: teams with high local win rates rank "Elite-tier"
on this scale but underperform at Signature and Worlds events. Three
underlying causes:

1. **CCWM and Skills are computed and stored but ignored.** OPR alone
   measures offense; CCWM (OPR − DPR) is the canonical match-strength
   number. Skills measures raw robot capability without alliance/opponent
   confounds. Both signals are stronger than win rate, which is dominated
   by alliance-partner luck.
2. **Win rate is weighted highest** at 60%, but it is the noisiest of
   the three available metrics.
3. **No sample-size handling.** A team with 1 event at 100% win rate
   scores identically to a team with 20 events at 100%, creating false
   "Elite" outliers from small samples.

## Goals

- Replace the score with a formula that uses CCWM, Skills, and Win Rate
  in proportion to their reliability.
- Apply Bayesian shrinkage so low-sample teams pull toward the season
  mean instead of producing extreme scores from thin data.
- Recalibrate tier thresholds against the new score distribution so
  the Elite/High/Mid-High/Mid/Developing labels are meaningful.
- Surface the score, tier, and underlying metrics on the match-up
  analysis page so users can sanity-check predictions.

## Non-goals (explicit)

- Local/Premier match-type weighting (separate work; requires capturing
  `events.level` from RobotEvents and a backfill).
- Percentile-based scoring (alternative considered, deferred).
- Removing OPR from storage or display (still computed, kept available
  for diagnostics).
- Reworking the win-probability formula in `MatchAnalysisCard`. The
  current `red.strength / (red.strength + blue.strength)` is naive but
  needs calibration data; out of scope here.
- VEXU and VEXIQ score changes. They continue using the legacy formula
  and current UI.

## Scoring formula

### Inputs (per team, per query)

All from existing tables. No schema changes.

- `n` = `COUNT(*)` over `team_event_stats` for the team in this season
- `avg_ccwm` = `AVG(ccwm)` over the same rows
- `avg_win_rate` = `AVG(win_rate)` over the same rows
- `max_skills` = `MAX(score)` from `skills_standings` for the team and
  `matchType = 'VRC'`

### Population stats (per query, computed once)

Used for shrinkage and normalization, scoped to the season + VRC:

- `pop_ccwm` = mean of per-team `avg_ccwm` across all VRC teams in the
  season
- `pop_win_rate` = mean of per-team `avg_win_rate`
- `MAX_CCWM` = 99th percentile of per-team `avg_ccwm`
- `MAX_SKILLS` = 99th percentile of `skills_standings.score` for VRC

The 99th percentile (rather than true `MAX`) prevents a single outlier
from compressing the entire scale.

### Bayesian shrinkage (k = 5)

Applied to the two metrics that are noisy averages across small samples:

```
ccwm_shrunk    = (n * avg_ccwm    + 5 * pop_ccwm)    / (n + 5)
winrate_shrunk = (n * avg_win_rate + 5 * pop_win_rate) / (n + 5)
```

`k = 5` means a team with 5 events sits at 50% of its observation +
50% of the season mean. A 10-event team is barely shrunk (33% pull
toward mean). A 3-event team is moderately shrunk (62% pull). This
matches the natural confidence we have in resumes of different sizes:
Worlds-bound teams with deep histories trusted, one-event hot teams
tempered.

Skills uses `MAX`, which represents an actually-posted score. A single
strong run is a real result. No shrinkage applied.

### Final score

```
norm_ccwm    = clamp(ccwm_shrunk    / MAX_CCWM,   0, 1) * 50
norm_skills  = clamp(max_skills     / MAX_SKILLS, 0, 1) * 25
norm_winrate = clamp(winrate_shrunk,              0, 1) * 25

strength = round(norm_ccwm + norm_skills + norm_winrate)   // 0..100
```

Weight rationale:

- **CCWM 50%** — the canonical match-strength metric, captures both
  offense (OPR) and defense (DPR), already alliance-normalized.
- **Skills 25%** — clean robot-capability signal in a controlled
  environment. Doesn't measure teamwork, so doesn't dominate, but
  rewards mechanical excellence.
- **Win Rate 25%** — rewards in-match alliance coordination and
  decisions. Held at 25% to keep noise from overpowering the more
  reliable signals.

### Tier thresholds

Recalibrated to a pyramid distribution against actual data:

| Tier | Target % of teams |
|---|---|
| Elite | top 5% |
| High | next 15% |
| Mid-High | next 25% |
| Mid | next 30% |
| Developing | bottom 25% |

Concrete thresholds are determined by the preview script (see Rollout)
and hard-coded as constants in `analysis.js`. Single set for VRC.

### Edge cases

- **Team with no events** (`n = 0`): shrinkage collapses to
  `pop_mean`. Team is reported as "average for the season" rather than
  scoring 0. UI marks these with a thin-data indicator (see UI).
- **Team with no skills row**: `max_skills = 0`, score reduced
  accordingly. Honest representation of incomplete profile.
- **Negative CCWM** (mediocre offense, weak defense): clamped to 0 in
  `norm_ccwm`. Team can still earn points from skills + win rate.
- **All-NULL CCWM** (rare, missing data): treated as `n = 0` for the
  CCWM term specifically, falls to population mean.

## Architecture

### Backend

- **New function:** `getTeamPerformanceV2(pool, teamNumbers, seasonId)`
  in `src/api/services/analysis.js`. Mirrors the legacy function's
  signature and response shape (with two added fields, see below).
- **Legacy `getTeamPerformance` is left untouched.** Callers other than
  VRC continue to use it — no behavior change for VEXU.
- **Endpoint dispatches by matchType** at the API boundary in
  `src/api/server.js`:
  ```js
  if (matchType === 'VRC') {
    return getTeamPerformanceV2(pool, teamNumbers, seasonId);
  }
  return getTeamPerformance(pool, teamNumbers, seasonId);
  ```
- **Single SQL query** computes all per-team aggregates and per-season
  population stats together via CTEs. Shrinkage and final scoring
  happen in JavaScript on the result rows for readability.

### Implementation notes

Two scoping decisions the implementation plan must resolve up front,
since the existing schema doesn't make them obvious:

1. **Identifying VRC events.** `team_event_stats` and `events` carry
   no program field. The legacy formula simply averaged across whatever
   was in `team_event_stats` for the team — relying on the fact that
   teams typically only play one program. v2 must scope explicitly to
   VRC. Two viable approaches:
   - **(a)** Join `skills_standings` on `(team_number, matchType='VRC')`
     to identify VRC team membership, then filter `team_event_stats`
     to teams in that set.
   - **(b)** Pattern-match `events.sku` (VRC SKUs follow a stable
     naming convention, e.g. `RE-V5RC-…`). Cheaper but couples the
     query to RobotEvents' SKU format.

   Approach (a) is preferred unless `EXPLAIN ANALYZE` shows it adds
   meaningful cost. Final choice in the implementation plan.

2. **Season scoping.** `events.seasonId` exists in the schema but
   may not be populated for all rows (older `processEvent` calls did
   not set it; verify against production data before relying on it).
   If the column is unreliable, fall back to filtering by event date
   range derived from the season config in `season_config`.

Both are answered as part of writing the SQL query; flagged here so
neither becomes a mid-implementation blocker.

### Response shape (additions only)

```ts
{
  teamNumber: string,
  opr: string,         // unchanged — kept for diagnostics / tooltip
  ccwm: string,        // NEW — needed for alliance aggregate display
  winRate: string,     // unchanged — kept for tooltip
  skills: number,      // unchanged
  strength: number,    // unchanged shape, now from v2 formula
  tier: string,        // unchanged shape, now from v2 thresholds
  n: number,           // NEW — event count, drives thin-data indicator
}
```

Two added fields, no removals. Backward-compatible with any consumer
that ignores unknown fields.

### Frontend

- `frontend-nextjs/src/hooks/useTeamPerformance.ts` — extend the
  `PerformanceData` type with `ccwm: string` and `n: number`. No
  behavior change in the hook itself.
- `frontend-nextjs/src/components/team/VrcMatchCard.tsx` — TeamRow
  rewrite (see UI).
- `frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx` —
  alliance aggregate rewrite (see UI).
- `VexiqMatchCard.tsx` is **not touched.** VEXIQ already takes a
  separate code path with no performance-data display.

## UI changes

### Per-team row (`TeamRow` in `VrcMatchCard.tsx`)

**Today:** `Team# [Sit] | WR: 67% | Rank #5`

**v2:** `Team# | <Tier chip> | S:78 | Rank #5`

- **Tier chip** — colored Badge:
  - Elite → purple (`bg-purple-100 text-purple-700`)
  - High → blue (`bg-blue-100 text-blue-700`)
  - Mid-High → teal (`bg-teal-100 text-teal-700`)
  - Mid → gray (`bg-gray-100 text-gray-700`)
  - Developing → amber (`bg-amber-100 text-amber-700`)
- **Strength badge** — small monochrome `S:<n>`. The number that
  drives the prediction is visible per-team for sanity-checking.
- **WR badge removed from the row.** Win rate is now folded into the
  Strength score and is also accessible via a hover tooltip on the
  Strength badge: `WR 67% • CCWM 12.4 • Skills 245 • Events: 8`.
- **Rank badge** — kept as-is.
- **Thin-data indicator** — when `n ≤ 2`, a small `?` icon appears
  after the Strength badge. Hover tooltip: "Based on only N events —
  score may be unreliable." This visibly surfaces what the shrinkage
  is doing internally.
- **Sitting teams: row not rendered at all.** Defensive code keeps
  the field check (`team.sitting`), but the row is skipped when the
  flag is set. Sitting teams are rare in current seasons; hiding them
  is cleaner than indicating their non-participation.

### Alliance aggregate (`MatchAnalysisCard.tsx`)

**Today:** `STRENGTH (avg) | OPR (sum) | SKILLS (avg)` — mixed units,
sitting teams included in averages.

**v2:** `STRENGTH (avg) | CCWM (avg) | SKILLS (avg)` — all averages,
sitting teams excluded.

Specific changes:

- **OPR → CCWM.** The alliance row should display the metric the
  v2 score actually weights at 50%. OPR remains in the response for
  diagnostics but is no longer surfaced.
- **All three as averages.** Comparable side-by-side. Sum was
  misleading for fixed-size alliances.
- **Sitting teams excluded** from the averages and from the win
  probability calculation. Real bug fix — a sitting team doesn't
  compete in the match and shouldn't influence its prediction.

### Win-probability bar

Unchanged. The current formula is naive but reworking it requires
calibration data and is out of scope for this work.

## Rollout

### Preview script

**File:** `scripts/preview-perf-v2.js`

A one-off Node script run locally against the production database
(read-only). Implements the v2 formula inline (no import — keeps the
preview frozen even if the source moves). For a given season it:

1. Computes new score for every VRC team.
2. Computes the legacy score for the same teams.
3. Sorts by new score descending.

Outputs a markdown report at
`docs/perf-v2-preview-<season>-<date>.md` containing:

1. **Score distribution histogram** — text-art bar chart in 5-point
   buckets.
2. **Recommended tier thresholds** — cutoffs that produce the
   5/15/25/30/25 pyramid against the actual distribution.
3. **Old-vs-new top 30 comparison table** — rank, team, old score,
   new score, delta, old tier, new tier.
4. **Biggest movers** — top 10 risers and top 10 fallers. Investigate
   any single move >20 points before approving.
5. **Sanity-check section** — hardcoded list of known-strong teams
   (Worlds finalists, top seeds), their v2 rank and tier shown
   explicitly. If a known finalist comes out as Mid, something is
   wrong.

### Threshold encoding

After review, hand-edit the recommended thresholds into `analysis.js`:

```js
const TIER_THRESHOLDS = { ELITE: <n>, HIGH: <n>, MID_HIGH: <n>, MID: <n> };
```

Single set for VRC. No matchType keying, no environment variables.

### Deploy

1. Single PR containing:
   - `getTeamPerformanceV2` in `analysis.js`
   - Endpoint dispatch in `server.js`
   - `useTeamPerformance` type extension
   - `VrcMatchCard` and `MatchAnalysisCard` rewrites
   - `scripts/preview-perf-v2.js`
   - Calibrated `TIER_THRESHOLDS`
2. Merge → Railway redeploys backend, Vercel redeploys frontend.
3. No DB changes, no migrations, no backfill.
4. **Smoke test** post-deploy:
   - Load a known-strong team's profile page, verify scores look
     reasonable.
   - Load a match-list page on a recent VRC event with predictions
     enabled; verify per-team tier chips, strength numbers, and
     alliance aggregates render.
   - Load a match-list page on a recent VEXU event; verify nothing
     changed.

### Rollback

Revert the PR. Backend and frontend revert together. ~5 minutes back
to the legacy formula. No data to unwind.

## Risks

- **Score distribution shifts noticeably.** Every existing user's
  team will get a new number. The preview report and tier
  recalibration are designed to land the shift on a sensible pyramid
  rather than a lopsided distribution. Pre-deploy review is the
  primary mitigation.
- **CCWM data quality.** v2 depends on `team_event_stats.ccwm` being
  populated for the team's recent events. The legacy formula didn't
  use CCWM, so any silent bugs in CCWM computation surface here for
  the first time. The preview script's "biggest movers" section
  should catch teams with anomalous CCWM.
- **Population mean computation cost.** The CTE adds work to every
  performance query. With ~600 VRC teams per season and a single
  query per page load, this is negligible — but worth confirming
  with `EXPLAIN ANALYZE` on the production query during testing.

## Files touched

| File | Change |
|---|---|
| `src/api/services/analysis.js` | New `getTeamPerformanceV2`; legacy untouched. New `TIER_THRESHOLDS` constant. |
| `src/api/server.js` | Endpoint dispatches by `matchType`. |
| `frontend-nextjs/src/hooks/useTeamPerformance.ts` | Add `ccwm`, `n` to type. |
| `frontend-nextjs/src/components/team/VrcMatchCard.tsx` | TeamRow: tier chip + strength + thin-data indicator + sitting hidden; drop WR badge. |
| `frontend-nextjs/src/components/analysis/MatchAnalysisCard.tsx` | OPR → CCWM, all averages, exclude sitting. |
| `scripts/preview-perf-v2.js` | New script (~80 LOC). |
| `docs/perf-v2-preview-<season>-<date>.md` | Generated report (artifact). |

## Open follow-ups (out of scope here)

- Capture `events.level` from RobotEvents at ingest, backfill existing
  rows, and add Local/Premier breakdown to win rate.
- Apply v2 to VEXU once verified stable on VRC.
- Rework win-probability formula with calibrated logistic mapping.
- Surface CCWM/Skills/Strength on the event-rankings page (current
  v2 work touches only the match-list page).
