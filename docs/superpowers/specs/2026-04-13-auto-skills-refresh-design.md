# Auto Skills Refresh — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Problem

World skills rankings in `skills_standings` are updated via manual CSV download from RobotEvents and upload through the admin panel. This requires visiting the standings page, downloading 4 separate CSV files (VRC HS, VRC MS, VEXIQ MS, VEXIQ Elementary), and uploading each one. Rankings go stale between manual refreshes.

Additionally, `CURRENT_SEASON_ID` is hardcoded in env vars and must be manually updated each year when a new VRC season begins. Three places in `server.js` depend on it.

## Solution

A daily cron job in the Express server that fetches world skills standings from an undocumented RobotEvents internal API and upserts them into the database. A shared season auto-detection utility replaces all hardcoded season ID references.

## Data Source

RobotEvents internal API (no authentication required):

```
GET https://www.robotevents.com/api/seasons/{seasonId}/skills?post_season=0&grade_level={grade}
```

Returns a JSON array of all ranked teams for the given season and grade level.

### Datasets

| matchType | Program ID | Grade Level | ~Teams |
|-----------|-----------|-------------|--------|
| VRC       | 1         | High School | 6,824  |
| VRC       | 1         | Middle School | 3,173 |
| VEXIQ     | 41        | Middle School | 6,517 |
| VEXIQ     | 41        | Elementary School | 2  |

### Field Mapping (API → DB)

| API JSON Path | DB Column | Type |
|--------------|-----------|------|
| `rank` | `rank` | INTEGER |
| `scores.score` | `score` | INTEGER |
| `scores.programming` | `autonomousSkills` | INTEGER |
| `scores.driver` | `driverSkills` | INTEGER |
| `scores.maxProgramming` | `highestAutonomousSkills` | INTEGER |
| `scores.maxDriver` | `highestDriverSkills` | INTEGER |
| `team.team` | `teamNumber` | TEXT |
| `team.teamName` | `teamName` | TEXT |
| `team.organization` | `organization` | TEXT |
| `team.eventRegion` | `eventRegion` | TEXT |
| `team.country` | `countryRegion` | TEXT |
| (per dataset) | `matchType` | TEXT |

This mapping is identical to the existing CSV upload endpoint (`POST /api/upload`).

## Season Auto-Detection

### Shared Utility

A function `getCurrentSeasonId(programId)` used by the cron job and all existing season-dependent code.

### Resolution Chain

```
Step 1: Call RobotEvents v2 API
        GET /api/v2/seasons?program[]={programId}&per_page=5
        Pick the most recent season whose start date <= now
        On success → save to season_config table (DB cache)

Step 2: If API fails → read last known good season ID from season_config table

Step 3: If DB cache empty → fall back to env var
        VRC:   CURRENT_SEASON_ID
        VEXIQ: VEXIQ_SEASON_ID

Step 4: If env var also missing → log [CRITICAL] error
        Skills refresh disabled for that program
```

### Database Table

```sql
CREATE TABLE IF NOT EXISTS season_config (
  program TEXT PRIMARY KEY,       -- 'VRC' or 'VEXIQ'
  season_id INTEGER NOT NULL,
  season_name TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Existing Usages to Update

All three existing usages of `CURRENT_SEASON_ID` in `server.js` will use the shared utility:

| Line | Current Code | After |
|------|-------------|-------|
| 552 | `process.env.CURRENT_SEASON_ID \|\| 197` | `getCurrentSeasonId(1)` (VRC) |
| 1226 | `process.env.CURRENT_SEASON_ID \|\| 197` | `getCurrentSeasonId(programId)` |
| 1589 | `process.env.CURRENT_SEASON_ID \|\| '190'` | `getCurrentSeasonId(programId)` |

## Cron Job

### Schedule

Daily at 3:00 AM UTC. Configurable via `SKILLS_REFRESH_CRON` env var (default: `0 3 * * *`).

### Library

`node-cron` — lightweight, no external dependencies.

### Execution Flow

```
1. Resolve VRC season ID (via shared utility)
2. Resolve VEXIQ season ID (via shared utility)
3. For each dataset (VRC HS, VRC MS, VEXIQ MS, VEXIQ Elementary):
   a. Fetch from RobotEvents internal API
   b. If fetch fails → wait 5s → retry once
   c. If retry also fails → log error, continue to next dataset
   d. Upsert all records into skills_standings (same ON CONFLICT logic as CSV upload)
   e. Log record count
   f. Wait 1-2s before next dataset
4. Log summary (total records, duration, retries, failures)
5. Update in-memory status object
```

Each dataset is wrapped in its own database transaction.

### Error Handling

- Network/API failure: retry once after 5s delay, then skip and continue
- Database error: rollback transaction for that dataset, continue with remaining
- All errors logged with `[skills-refresh]` prefix for easy filtering in Railway logs

## Admin Visibility

### Status Endpoint

`GET /api/admin/skills-refresh/status` (requires admin auth)

```json
{
  "lastRefreshedAt": "2026-04-13T03:00:12Z",
  "isRunning": false,
  "lastResult": {
    "duration": "12.3s",
    "datasets": {
      "VRC High School": { "records": 6824, "status": "success" },
      "VRC Middle School": { "records": 3173, "status": "success" },
      "VEXIQ Middle School": { "records": 6517, "status": "success", "retried": true },
      "VEXIQ Elementary School": { "records": 2, "status": "success" }
    },
    "totalRecords": 16516,
    "failures": 0
  }
}
```

### Manual Trigger

`POST /api/admin/skills-refresh/trigger` (requires admin auth)

Triggers the same refresh logic as the cron job. Returns immediately with `{ "message": "Refresh started" }`. Status can be polled via the status endpoint.

### Log Output

Visible in Railway Deploy Logs tab. Example:

```
[skills-refresh] Starting scheduled refresh at 2026-04-14T03:00:00Z
[skills-refresh] Season IDs resolved — VRC: 197, VEXIQ: 196
[skills-refresh] VRC High School: 6,824 records updated
[skills-refresh] VRC Middle School: 3,173 records updated
[skills-refresh] VEXIQ Middle School: FAILED (retrying in 5s...)
[skills-refresh] VEXIQ Middle School (retry): 6,517 records updated
[skills-refresh] VEXIQ Elementary School: 2 records updated
[skills-refresh] Completed in 12.3s — 16,516 total records, 1 retry, 0 failures
```

## Dependencies

### New Package

- `node-cron` — cron scheduler for Node.js

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SKILLS_REFRESH_CRON` | No | `0 3 * * *` | Cron schedule expression |
| `CURRENT_SEASON_ID` | No | Auto-detected | VRC season fallback |
| `VEXIQ_SEASON_ID` | No | Auto-detected | VEXIQ season fallback |

No changes to existing env vars. No new required env vars.

## Deployment

### Railway (Backend)

- Push to `main` → auto-deploys
- No new env vars required (all optional)
- No database migration needed (table created via `CREATE TABLE IF NOT EXISTS` at startup)
- Cron starts automatically with the server

### Vercel (Frontend)

- No changes needed — this is entirely backend
