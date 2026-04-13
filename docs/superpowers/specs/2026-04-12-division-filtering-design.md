# Division Filtering for World Championship Events — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Backend + Frontend

---

## Problem

At World Championship events, teams are split into multiple named divisions (e.g. Science, Math, Technology). The app currently:

1. **Past event (match view):** Navigates to the match detail page using `event.divisions[0]?.id` — the first division in the list — regardless of which division the team actually competes in. At Worlds this is almost always wrong, causing RobotEvents to return an empty match list for the team.

2. **Future event (rankings view):** Fetches all teams at the event with no division awareness, presenting all 500+ Worlds teams at once. Finding one team's competition pool is impractical.

Both scenarios always have the team number available (user arrived from the team detail page), so division can be resolved automatically.

---

## Goals

- Automatically detect which division the target team belongs to at a multi-division event.
- Show only that division's teams on the rankings page.
- Fix the empty match list bug by passing the correct `divisionId` to the match endpoint.
- Make zero changes to the match endpoint itself — only fix the caller.
- No toggle, no tabs — division-only view. Keep it simple.

---

## Non-Goals

- Division tabs or "All Teams" toggle (out of scope, can be added later).
- Changing the visual design of the match detail page.
- Caching division assignments in the database.

---

## Design

### Division Detection Logic

A multi-division event is identified by `event.divisions.length > 1`. For these events, we resolve the team's exact division via a new backend endpoint before navigating. For single-division events, `event.divisions[0].id` is used directly with no extra call.

Division assignments at Worlds do not change once set. Results are cached in a server-side `Map` keyed by `"${eventId}:${teamNumber}"` for the lifetime of the Node process.

---

### Backend Changes

#### 1. New endpoint — `GET /api/events/:eventId/teams/:teamNumber/division`

**Purpose:** Find which division a specific team belongs to at an event.

**Query params:** `divisionIds` — comma-separated list of division IDs the frontend already knows about (e.g. `?divisionIds=101,102,103`). This avoids a redundant `GET /events/{eventId}` call since the frontend already has the divisions array from the team events response.

**Logic:**
1. Check in-memory cache — return immediately if found.
2. Parse `divisionIds` from query string. For each division ID, call `GET /api/v2/events/{eventId}/divisions/{divId}/teams?per_page=250` (paginated).
3. Search for `teamNumber` in the returned team list.
4. On match: cache and return `{ divisionId, divisionName }`.
5. If not found in any division: return `{ divisionId: null, divisionName: null }` — caller falls back to showing all teams.

**Rate limit consideration:** Worlds typically has 5–7 divisions, each with ~80 teams (1–2 pages). Max calls per lookup: ~14. This is a one-time lookup per team+event pair (cached after first call).

**Response shape:**
```json
{ "divisionId": 102, "divisionName": "Math Division" }
```

**Error handling:**
- RobotEvents 429 → return 429 to frontend; frontend falls back to unfiltered navigation.
- RobotEvents 404 → return 404; frontend falls back.
- Any other error → return 500; frontend falls back gracefully (no crash, just no division filter).

---

#### 2. Extended endpoint — `GET /api/events/:eventId/rankings`

**New optional query param:** `divisionId` (integer)

**Behaviour change when `divisionId` is present:**
- Replace the current `GET /api/v2/events/{eventId}/teams` (all teams) call with `GET /api/v2/events/{eventId}/divisions/{divId}/teams` (division teams only).
- All downstream logic (DB lookup, sorting, grade breakdown) is unchanged.
- Add `divisionId` and `divisionName` to the response envelope.

**Backward compatibility:** When `divisionId` is absent, behaviour is identical to current — no regression for non-Worlds events.

**Updated response shape (additions only):**
```json
{
  "divisionId": 102,
  "divisionName": "Math Division",
  ...existing fields unchanged...
}
```

---

### Frontend Changes

#### 3. `EventsSection.tsx` — `handleEventClick`

**Current (broken for Worlds):**
```ts
const divisionId = event.divisions[0]?.id || '';
```

**New logic:**
```
if (event.divisions.length <= 1):
  divisionId = event.divisions[0]?.id || ''
  divisionName = event.divisions[0]?.name || ''
  navigate immediately
else:
  call GET /api/events/:eventId/teams/:teamNumber/division
  on success: use returned divisionId + divisionName
  on error/null: fall back — divisionId = '', navigate without division filter
```

Both navigation branches (past → match detail, future → rankings) receive the resolved `divisionId` and `divisionName`.

**Past event navigation URL:**
```
/team/{teamNumber}/event/{eventId}?divisionId={id}&matchType={type}&eventName={name}&...
```
(No change to URL shape — `divisionId` is already a param here, just now correct.)

**Future event navigation URL:**
```
/event-rankings/{eventId}?matchType={type}&eventName={name}&divisionId={id}&divisionName={name}&returnUrl=/team/{teamNumber}&highlightTeam={teamNumber}
```
(`divisionId` and `divisionName` are new params.)

**UX during division lookup:** Show a brief loading state on the event card (spinner or disabled state) while the division is being resolved. The lookup should complete in under 2 seconds in normal conditions.

---

#### 4. `useEventRankings.ts`

Add `divisionId?: number` parameter. When present, append `&divisionId={id}` to the fetch URL. Cache key updated to include `divisionId`.

---

#### 5. `event-rankings/[eventId]/page.tsx`

- Read `divisionId` and `divisionName` from `useSearchParams()`.
- Pass `divisionId` to `useEventRankings`.
- When `divisionName` is present: show a division badge in the event header alongside the existing `matchType` badge (e.g. `Math Division`).
- Update stats card label: "Teams in Division" instead of "Total Teams" when filtered.

---

## Data Flow Summary

```
User taps event card
  └─ event.divisions.length > 1?
       ├─ No  → use divisions[0] directly → navigate
       └─ Yes → GET /api/events/:eventId/teams/:teamNumber/division
                   ├─ Success → { divisionId, divisionName } → navigate with division params
                   └─ Error   → navigate without division params (graceful fallback)

Past event path:
  /team/:teamNumber/event/:eventId?divisionId=102&...
    └─ match endpoint already correct (uses divisionId from URL)

Future event path:
  /event-rankings/:eventId?divisionId=102&divisionName=Math+Division&...
    └─ useEventRankings(eventId, matchType, grade, divisionId=102)
         └─ GET /api/events/:eventId/rankings?divisionId=102
              └─ fetches /divisions/102/teams instead of /events/teams
```

---

## Files Changed

| File | Type of change |
|---|---|
| `src/api/server.js` | Add new division lookup endpoint; extend rankings endpoint with `divisionId` param; add in-memory cache Map |
| `frontend-nextjs/src/components/team/EventsSection.tsx` | Fix `handleEventClick` to resolve division before navigating |
| `frontend-nextjs/src/hooks/useEventRankings.ts` | Add `divisionId` param |
| `frontend-nextjs/src/app/event-rankings/[eventId]/page.tsx` | Read division params from URL; show division badge; pass divisionId to hook |

---

## Testing Notes

- **Single-division event (regular):** No new API call made, behaviour identical to today.
- **Multi-division event (Worlds) — past:** Correct division's match list shown. Previously showed empty list.
- **Multi-division event (Worlds) — future:** Only division teams shown in rankings (~80 teams vs 500+). Division name badge shown in header.
- **Division lookup failure:** App falls back to unfiltered view — no crash, no blank page.
- **Team not found in any division:** Same fallback — unfiltered rankings shown.
