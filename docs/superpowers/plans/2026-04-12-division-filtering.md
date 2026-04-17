# Division Filtering for World Championship Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect and apply division filtering for World Championship events so users see only their division's teams in both match history (past events) and rankings (future events), fixing an existing bug where `divisions[0]` caused empty/wrong results at Worlds.

**Architecture:** Three backend changes in `server.js` (cache Map + new division lookup endpoint + extended rankings endpoint) and three frontend changes (EventsSection navigation fix + hook update + rankings page UI). All changes are backward-compatible — single-division events take a fast path with no new API calls.

**Tech Stack:** Node.js 18 (ESM), Express 4, React 19, Next.js 15 App Router, TypeScript, RobotEvents API v2, TanStack React Query

---

## File Map

| File | What changes |
|---|---|
| `src/api/server.js` | Add `divisionCache` Map (line ~244); add `GET /api/events/:eventId/teams/:teamNumber/division` (before line 1285); extend `GET /api/events/:eventId/rankings` with optional `?divisionId` param |
| `frontend-nextjs/src/components/team/EventsSection.tsx` | Replace `handleEventClick` with async division-resolving version; add `resolvingEventId` state; add `Loader2` spinner to card header |
| `frontend-nextjs/src/hooks/useEventRankings.ts` | Add optional `divisionId` param to signature, URL, and cache key |
| `frontend-nextjs/src/types/skills.ts` | Add `divisionId` and `divisionName` optional fields to `EventRankingsResponse` |
| `frontend-nextjs/src/app/event-rankings/[eventId]/page.tsx` | Read `divisionId`/`divisionName` from URL params; pass to hook; show purple division badge; update stat card label |

---

## Task 1: Backend — Division cache + division lookup endpoint

**Files:**
- Modify: `src/api/server.js`

Adds an in-memory cache and a new endpoint that walks a multi-division event's divisions on RobotEvents until it finds the one containing the target team.

- [ ] **Step 1: Add the `divisionCache` Map to `src/api/server.js`**

Find line 244 — it reads `// Initialize database schema`. Insert the following block **immediately above** that comment:

```js
// In-memory cache for team division assignments.
// Division assignments never change during an event so lifetime caching is safe.
// Key: "eventId:TEAMNUMBER" → value: { divisionId: number, divisionName: string }
const divisionCache = new Map();
```

- [ ] **Step 2: Add the division lookup endpoint**

Find the comment `// Get event rankings - teams in a specific event with their world rankings` (line ~1285). Insert the following block **immediately before** that comment:

```js
// Resolve which division a team belongs to at a multi-division event (e.g. World Championship).
// The frontend passes the division IDs and names it already knows (from the team events response)
// as comma-separated query params, avoiding a redundant GET /events/{id} API call.
//
// GET /api/events/:eventId/teams/:teamNumber/division
//   ?divisionIds=101,102,103
//   &divisionNames=Science Division,Math Division,Technology Division
//
// Returns: { divisionId: 102, divisionName: "Math Division" }
//      or: { divisionId: null, divisionName: null }  (team not found in any division)
app.get('/api/events/:eventId/teams/:teamNumber/division', async (req, res) => {
  const { eventId, teamNumber } = req.params;
  const { divisionIds, divisionNames } = req.query;

  if (!divisionIds) {
    return res.status(400).json({ error: 'divisionIds query param is required' });
  }

  const cacheKey = `${eventId}:${teamNumber.toUpperCase()}`;
  if (divisionCache.has(cacheKey)) {
    return res.json(divisionCache.get(cacheKey));
  }

  const apiToken = process.env.ROBOTEVENTS_API_TOKEN;
  if (!apiToken) {
    return res.status(500).json({ error: 'RobotEvents API token not configured' });
  }

  const ids = divisionIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  const names = divisionNames ? divisionNames.split(',').map(n => n.trim()) : [];

  try {
    for (let i = 0; i < ids.length; i++) {
      const divId = ids[i];
      const divName = names[i] || `Division ${divId}`;
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await fetch(
          `https://www.robotevents.com/api/v2/events/${eventId}/divisions/${divId}/teams?page=${currentPage}&per_page=250`,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'RobotEvents API rate limit exceeded' });
          }
          // Skip this division on error and try the next one
          console.warn(`Division ${divId} team lookup failed with status ${response.status}, skipping`);
          break;
        }

        const data = await response.json();
        const teams = data.data || [];
        const found = teams.find(t => t.number.toUpperCase() === teamNumber.toUpperCase());

        if (found) {
          const result = { divisionId: divId, divisionName: divName };
          divisionCache.set(cacheKey, result);
          return res.json(result);
        }

        const meta = data.meta || {};
        hasMorePages = meta.current_page < meta.last_page;
        currentPage++;
      }
    }

    // Team not found in any of the provided divisions
    const notFound = { divisionId: null, divisionName: null };
    divisionCache.set(cacheKey, notFound);
    return res.json(notFound);

  } catch (error) {
    console.error(`Error resolving division for team ${teamNumber} at event ${eventId}:`, error);
    return res.status(500).json({ error: 'Failed to resolve team division' });
  }
});
```

- [ ] **Step 3: Verify the server starts without errors**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
node --input-type=module -e "
import('./src/api/server.js').then(() => {
  setTimeout(() => process.exit(0), 2000);
}).catch(e => { console.error(e); process.exit(1); });
" 2>&1 | head -20
```

Expected: startup logs appear, no `SyntaxError` or `ReferenceError`, process exits cleanly.

- [ ] **Step 4: Smoke test the new endpoint**

With the server running (`npm start` in a separate terminal):

```bash
# Missing divisionIds → should return 400
curl -s "http://localhost:3000/api/events/12345/teams/99999A/division" | jq .
# Expected: { "error": "divisionIds query param is required" }

# Valid call with a fake event/team → should return null (not found)
curl -s "http://localhost:3000/api/events/12345/teams/99999A/division?divisionIds=1,2&divisionNames=Science,Math" | jq .
# Expected: { "divisionId": null, "divisionName": null }
```

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js
git commit -m "feat: add division lookup endpoint with in-memory cache"
```

---

## Task 2: Backend — Extend rankings endpoint with divisionId filter

**Files:**
- Modify: `src/api/server.js` (rankings handler, lines ~1286–1443)

When `?divisionId=` is present, fetch teams from `/divisions/{divId}/teams` instead of `/events/{eventId}/teams`. All downstream DB logic is unchanged.

- [ ] **Step 1: Extract `divisionId` from the query string**

Find this line inside the rankings handler (line ~1288):

```js
  const { matchType, grade } = req.query; // Add grade filter
```

Replace it with:

```js
  const { matchType, grade, divisionId, divisionName } = req.query;
  const parsedDivisionId = divisionId ? parseInt(divisionId) : null;
```

- [ ] **Step 2: Replace the teams-fetch URL to be division-aware**

Inside the rankings `while (hasMorePages)` loop, find:

```js
      const teamsResponse = await fetch(
        `https://www.robotevents.com/api/v2/events/${eventId}/teams?page=${currentPage}`,
```

Replace that one line with:

```js
      const teamsEndpoint = parsedDivisionId
        ? `https://www.robotevents.com/api/v2/events/${eventId}/divisions/${parsedDivisionId}/teams?page=${currentPage}`
        : `https://www.robotevents.com/api/v2/events/${eventId}/teams?page=${currentPage}`;

      const teamsResponse = await fetch(
        teamsEndpoint,
```

- [ ] **Step 3: Add `divisionId` and `divisionName` to the response**

Find the final `res.json({` call in the rankings handler. It currently starts:

```js
    res.json({
      eventId: parseInt(eventId),
      eventName: eventInfo?.name || 'Unknown Event',
      matchType: matchType || 'VRC',
      grade: grade || 'All',
      rankings,
```

Add `divisionId` and `divisionName` after `grade`:

```js
    res.json({
      eventId: parseInt(eventId),
      eventName: eventInfo?.name || 'Unknown Event',
      matchType: matchType || 'VRC',
      grade: grade || 'All',
      divisionId: parsedDivisionId || null,
      divisionName: divisionName || null,
      rankings,
```

- [ ] **Step 4: Verify no regression — rankings without divisionId unchanged**

With server running:

```bash
curl -s "http://localhost:3000/api/events/12345/rankings?matchType=VRC" | jq '{divisionId, divisionName}'
# Expected: { "divisionId": null, "divisionName": null }
```

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js
git commit -m "feat: extend rankings endpoint with optional divisionId filter for World Championship events"
```

---

## Task 3: Frontend — Fix EventsSection division resolution

**Files:**
- Modify: `frontend-nextjs/src/components/team/EventsSection.tsx`

Replace the broken `event.divisions[0]` with async division resolution for multi-division events. Single-division events take the fast path with no API call.

- [ ] **Step 1: Add `useState` for loading state and `Loader2` icon**

Find the existing imports at the top of the file:

```tsx
import { Calendar, MapPin } from 'lucide-react';
```

Replace with:

```tsx
import { Calendar, MapPin, Loader2 } from 'lucide-react';
```

Find the component function body, immediately after `const router = useRouter();` (line ~44), add:

```tsx
  const [resolvingEventId, setResolvingEventId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

`useState` is already imported from React at line 1 — no import change needed there.

- [ ] **Step 2: Replace `handleEventClick` entirely**

Find the entire `handleEventClick` function (lines 56–81). Replace it with:

```tsx
  const handleEventClick = async (event: TeamEvent) => {
    if (resolvingEventId === event.id) return; // prevent double-click during lookup

    let divisionId: string = event.divisions[0]?.id?.toString() || '';
    let divisionName: string = event.divisions[0]?.name || '';

    // Multi-division events (World Championship) need an API call to find which
    // specific division this team competes in. Single-division events skip this.
    if (event.divisions.length > 1) {
      setResolvingEventId(event.id);
      try {
        const divisionIds = event.divisions.map(d => d.id).join(',');
        const divisionNames = event.divisions.map(d => d.name).join(',');
        const response = await fetch(
          `${API_BASE_URL}/api/events/${event.id}/teams/${teamNumber}/division` +
          `?divisionIds=${encodeURIComponent(divisionIds)}&divisionNames=${encodeURIComponent(divisionNames)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.divisionId) {
            divisionId = data.divisionId.toString();
            divisionName = data.divisionName || '';
          }
        }
        // On network error or divisionId: null — fall through with empty string.
        // The rankings page will show all teams (safe unfiltered fallback).
      } catch {
        // Network error — fall through to unfiltered navigation
      } finally {
        setResolvingEventId(null);
      }
    }

    if (!event.upcoming) {
      // Past event → match detail page
      const params = new URLSearchParams({
        divisionId,
        matchType,
        eventName: event.name,
        start: event.start,
        end: event.end
      });
      router.push(`/team/${teamNumber}/event/${event.id}?${params.toString()}`);
    } else {
      // Future event → rankings page
      const confirmed = window.confirm(
        `Would you like to see the world skills rankings for teams competing in "${event.name}"` +
        `${divisionName ? ` — ${divisionName}` : ''}?`
      );
      if (confirmed) {
        const params = new URLSearchParams({
          matchType,
          eventName: event.name,
          returnUrl: `/team/${teamNumber}`,
          highlightTeam: teamNumber,
        });
        if (divisionId) params.append('divisionId', divisionId);
        if (divisionName) params.append('divisionName', divisionName);
        router.push(`/event-rankings/${event.id}?${params.toString()}`);
      }
    }
  };
```

- [ ] **Step 3: Add spinner to the event card header**

Find in the card render (line ~139):

```tsx
                  <CardTitle className="flex justify-between items-start">
                    <span>{event.name}</span>
                    <Badge variant={event.upcoming ? "default" : "secondary"}>
                      {event.upcoming ? "Upcoming" : "Past"}
                    </Badge>
                  </CardTitle>
```

Replace with:

```tsx
                  <CardTitle className="flex justify-between items-start">
                    <span>{event.name}</span>
                    <div className="flex items-center gap-2">
                      {resolvingEventId === event.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      <Badge variant={event.upcoming ? "default" : "secondary"}>
                        {event.upcoming ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                  </CardTitle>
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting/frontend-nextjs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add frontend-nextjs/src/components/team/EventsSection.tsx
git commit -m "fix: resolve correct division for multi-division (Worlds) events before navigating"
```

---

## Task 4: Frontend — Extend useEventRankings with divisionId

**Files:**
- Modify: `frontend-nextjs/src/hooks/useEventRankings.ts`
- Modify: `frontend-nextjs/src/types/skills.ts`

- [ ] **Step 1: Update `EventRankingsResponse` in `skills.ts`**

Find the closing `}` of the `EventRankingsResponse` interface (line ~97 of `frontend-nextjs/src/types/skills.ts`). Add the two new optional fields before the closing brace:

```ts
export interface EventRankingsResponse {
  eventId: number;
  eventName: string;
  matchType: string;
  grade: string;
  divisionId?: number | null;
  divisionName?: string | null;
  rankings: EventRanking[];
  total: number;
  teamsInEvent: number;
  totalTeamsInEvent: number;
  teamsWithRankings: number;
  teamsWithoutRankings: number;
  gradeBreakdown: {
    'High School': number;
    'Middle School': number;
    'Elementary School': number;
    'Unknown': number;
  };
}
```

- [ ] **Step 2: Replace `useEventRankings.ts` entirely**

```ts
import { useQuery } from '@tanstack/react-query';
import type { EventRankingsResponse } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useEventRankings(
  eventId: string,
  matchType: string = 'VRC',
  grade?: string,
  divisionId?: string
) {
  return useQuery<EventRankingsResponse>({
    queryKey: ['event-rankings', eventId, matchType, grade, divisionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchType) params.append('matchType', matchType);
      if (grade && grade !== 'All') params.append('grade', grade);
      if (divisionId) params.append('divisionId', divisionId);

      const response = await fetch(
        `${API_BASE_URL}/api/events/${eventId}/rankings?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch event rankings');
      }

      return response.json();
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting/frontend-nextjs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend-nextjs/src/hooks/useEventRankings.ts frontend-nextjs/src/types/skills.ts
git commit -m "feat: add divisionId param to useEventRankings hook and EventRankingsResponse type"
```

---

## Task 5: Frontend — Show division badge on rankings page

**Files:**
- Modify: `frontend-nextjs/src/app/event-rankings/[eventId]/page.tsx`

- [ ] **Step 1: Read `divisionId` and `divisionName` from URL params**

Find this block (lines ~21–24):

```tsx
  const matchType = searchParams.get('matchType') || 'VRC';
  const returnUrl = searchParams.get('returnUrl') || '/';
  const highlightTeam = searchParams.get('highlightTeam') || undefined;
  const eventNameFromUrl = searchParams.get('eventName') || null;
```

Add two lines immediately after:

```tsx
  const divisionId = searchParams.get('divisionId') || undefined;
  const divisionName = searchParams.get('divisionName') || null;
```

- [ ] **Step 2: Pass `divisionId` to the hook**

Find (line ~28):

```tsx
  const { data, isLoading, error } = useEventRankings(eventId, matchType, selectedGrade);
```

Replace with:

```tsx
  const { data, isLoading, error } = useEventRankings(eventId, matchType, selectedGrade, divisionId);
```

- [ ] **Step 3: Add division badge to the event header**

Find the badge row inside the `{data && (...)}` block (lines ~123–128):

```tsx
                  <div className="flex items-center space-x-4 text-gray-600">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {data.matchType}
                    </Badge>
                    <span className="text-sm">Event ID: {data.eventId}</span>
                  </div>
```

Replace with:

```tsx
                  <div className="flex items-center flex-wrap gap-2 text-gray-600">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {data.matchType}
                    </Badge>
                    {(divisionName || data.divisionName) && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        {divisionName || data.divisionName}
                      </Badge>
                    )}
                    <span className="text-sm">Event ID: {data.eventId}</span>
                  </div>
```

- [ ] **Step 4: Update the "Total Teams" stat card label**

Find (lines ~172–177):

```tsx
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Total Teams</span>
                </CardTitle>
```

Replace with:

```tsx
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{divisionId ? 'Division Teams' : 'Total Teams'}</span>
                </CardTitle>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting/frontend-nextjs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 6: End-to-end manual test**

Start both servers:
```bash
# Terminal 1 — backend
cd /Users/jimmyzmhe/Desktop/git/VEXScouting && npm start

# Terminal 2 — frontend
cd /Users/jimmyzmhe/Desktop/git/VEXScouting/frontend-nextjs && npm run dev
```

Run through each scenario:

| Scenario | Steps | Expected result |
|---|---|---|
| **Worlds — future event** | Search any team attending Worlds → click the upcoming Worlds event card | Spinner appears on card (~1–2s), confirm dialog says division name, rankings page shows ~80 division teams, purple `Math Division` badge visible, stat card reads "Division Teams" |
| **Worlds — past event** | Same team, click a past Worlds event | Spinner appears, navigates to match detail with correct `divisionId` in URL, match list shows actual matches (not empty) |
| **Regular event — future** | Any team, click upcoming non-Worlds event | No spinner, navigates immediately, rankings page shows all event teams, no purple badge, stat card reads "Total Teams" |
| **Regular event — past** | Any team, click past non-Worlds event | No spinner, match list unchanged |

- [ ] **Step 7: Commit**

```bash
git add "frontend-nextjs/src/app/event-rankings/[eventId]/page.tsx"
git commit -m "feat: show division badge and division-filtered team count on rankings page for World Championship events"
```
