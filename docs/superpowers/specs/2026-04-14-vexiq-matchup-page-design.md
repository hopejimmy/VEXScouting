# VEXIQ Match-up Page Design

**Date:** 2026-04-14
**Branch:** `feature/vexiq-matchup-page`
**Status:** Approved

## Problem

The team event match list page (`/team/[teamNumber]/event/[eventId]`) renders every match as a red-vs-blue alliance layout borrowed from VRC. This is wrong for VEX IQ. VEX IQ TeamWork matches are **cooperative**: two teams play together on the same side, score the same points, and there are no opponents. The current UI shows VEXIQ partner teams as if they were enemies, and offers a "Predict Matches" button that computes meaningless red-vs-blue win probabilities.

We need a VEXIQ-appropriate match-up view that surfaces the focused team and its partner together, with each team's season-best Driver Skills score from our database, for pre-match scouting.

## Scope

- **In scope:** Read-only display changes to the match list page when `matchType === 'VEXIQ'`. Reuses existing data fetch paths. No schema, backend, or API changes.
- **Out of scope:** Per-match manual score input or persistence. Any VEXIQ-specific match prediction/analysis. Changes to `/event-rankings/[eventId]`. Changes to VRC or VEXU rendering.

## Architecture

**Single route, conditional rendering.** `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx` stays at the same URL for all match types. After `useTeamMatches` resolves, the render tree branches on `team.matchType` (available from the URL `matchType` param already being passed through):

- `matchType === 'VEXIQ'` → new VEXIQ list (no predict button, new card component).
- otherwise → existing VRC/VEXU rendering (untouched).

Shared across both branches: `useTeamMatches`, header, back button, Refresh button, "View Event Rankings" fallback (with `divisionId` forwarded), `isOngoing` detection, 60-second polling for live events, `mounted` SSR guard, and all loading/error/empty states.

Match card rendering is extracted from the page file into two components:

- `frontend-nextjs/src/components/team/VrcMatchCard.tsx` — moved from the current inline `MatchCard`, behavior unchanged.
- `frontend-nextjs/src/components/team/VexiqMatchCard.tsx` — new.

The page file shrinks: orchestration (data fetching, polling, buttons, states) stays; per-match rendering moves out.

## Data

The VEXIQ card needs each team's season-best **driver skills** and season **rank** from `skills_standings`, scoped to `matchType='VEXIQ'`.

The existing `useTeamPerformance` hook is **not reusable**: it is hard-coded to VRC seasons (`seasonId = 197` in `src/api/server.js` at the `/api/analysis/performance` route) and returns match-analysis fields (`opr`, `winRate`, `tier`) — not per-matchType driver skill + rank.

We add a new lightweight batch endpoint and hook:

**Backend — new endpoint:**

```
GET /api/teams/skills-batch?teams=252A,18886C&matchType=VEXIQ
→ [{ teamNumber: "252A", highestDriverSkills: 78, rank: 4 }, ...]
```

- One SQL query against `skills_standings` with `teamNumber = ANY($1) AND matchtype = $2`.
- Returns only teams present in the table; missing teams are absent from the result.
- No writes, no external API calls, no auth required (matches `/api/search` and `/api/teams/:teamNumber` which are public reads).

**Frontend — new hook** `useTeamDriverSkills(teamNumbers: string[], matchType: string)`:

- React Query with `queryKey: ['teamDriverSkills', matchType, sortedTeams.join(',')]`.
- `enabled: teamNumbers.length > 0 && matchType === 'VEXIQ'`.
- Returns `{ teamNumber, highestDriverSkills, rank }[]`.
- `staleTime: 5 * 60 * 1000` (matches `useTeamPerformance`).

**Collection in page:**

```ts
const allVexiqTeamNumbers = useMemo(() => {
  if (matchType !== 'VEXIQ' || !matches) return [];
  const set = new Set<string>();
  matches.forEach(m => m.alliances.forEach(a => a.teams.forEach(t => set.add(t.team.name))));
  return Array.from(set);
}, [matches, matchType]);

const { data: skillsList } = useTeamDriverSkills(allVexiqTeamNumbers, matchType);
const skillsMap = useMemo(() => {
  const map: Record<string, { highestDriverSkills: number; rank: number }> = {};
  skillsList?.forEach(d => { map[d.teamNumber] = d; });
  return map;
}, [skillsList]);
```

Missing teams render `—` with tooltip in the card.

## VexiqMatchCard Component

**Props:**

```ts
interface VexiqMatchCardProps {
  match: Match;
  teamNumber: string;                              // focused team
  skillsMap: Record<string, { highestDriverSkills: number; rank: number }>;
}
```

**Layout** (one card per match):

```
┌──────────────────────────────────────────────────┐
│ TeamWork #5 · 10:42 AM          [SCORE 142]      │  header
├──────────────────────────────────────────────────┤
│  ┌──YOU──────┐     +     ┌──PARTNER────────┐     │
│  │ 252A      │           │ 18886C    #12   │     │  team row
│  │ Best      │           │ Best            │     │
│  │ Driver    │           │ Driver          │     │
│  │ Skill: 78 │           │ Skill: 62       │     │
│  └───────────┘           └─────────────────┘     │
└──────────────────────────────────────────────────┘
```

**Visual style** (from approved mockup, Design C):

- Focused ("YOU") card: light blue background (`bg-blue-50`), blue border (`border-blue-200`), label "YOU".
- Partner card: light yellow background (`bg-yellow-50`), amber border (`border-amber-200`), label "PARTNER".
- Center "+" separator: muted gray, font-bold, large.
- Driver skill number: large (18–20px), bold; blue for focused team, neutral gray for partner.
- Optional rank chip (`#12` style) shown inline with partner team number when rank data exists.

**Behavior:**

- **Team identification.** Flatten `match.alliances[*].teams[*]`. The team whose `team.name === teamNumber` is the focused team; the other is the partner. Ignore the `color` field (VEXIQ returns "red"/"blue" but they are cooperative partners, not opponents).
- **Score badge.** Show `match.alliances[0].score` (both alliance scores are identical in VEXIQ). Hide the badge when `match.started === false` or `match.scored === false` (match not yet played).
- **Driver skill lookup.** `skillsMap[teamNumber]?.highestDriverSkills`. If absent, render `—` inside a `<span title="No driver skill on record">` for keyboard/screen-reader tooltip access.
- **Rank chip.** `skillsMap[teamNumber]?.rank` → small `#N` chip next to team name. Omit if absent.
- **Partner team name is NOT clickable.** Per product decision.
- **Match header wording.** Use `match.name` verbatim from the API (e.g., `"TeamWork #5"`) — already VEXIQ-correct.

**Edge cases:**

- **Only 1 team in match** (scheduling quirk / sit-out): render the focused card and a muted placeholder card labeled "Partner TBD" on the right.
- **3+ teams in match** (defensive; VEXIQ TeamWork is always 2): render extras as additional partner cards stacked below the primary pair rather than crashing.
- **Empty `match.alliances`**: render the header only, no team row.

## VRC-only UI Removed from VEXIQ Branch

- **"Predict Matches" button** and all associated state (`predictionMode`, `handlePredictionToggle`, the availability `alert()`, and the conditional `MatchAnalysisCard` render inside each card). The VRC branch retains them unchanged.

Kept on both branches: Back, Refresh, "View Event Rankings" fallback.

## States

Shared with VRC branch (no changes):

- **Loading:** 5 skeleton cards.
- **Error:** red error card with `refetch()` button.
- **Empty (`!matches || matches.length === 0`):** "Match Schedule Not Available" dashed card with a "View Event Rankings" CTA.
- **`!mounted`:** returns `null` (SSR guard).

VEXIQ-specific:

- **`skillsMap` empty or partial:** cards render with `—` placeholders for missing driver skills. Never blocks render, never shows an alert.

## Accessibility

- Missing-data tooltip uses the `title` attribute (keyboard + screen-reader accessible).
- Rank chip and driver-skill number are plain text, not iconography.
- Color is never the sole information carrier — each card has explicit "YOU" / "PARTNER" text labels.

## Testing

Manual verification (this repo has no Jest/Vitest setup for the Next.js app; matches existing project convention):

1. Load a VEXIQ team's past event (e.g., Team `252A` at a VEXIQ event with matches).
   - No "Predict Matches" button visible.
   - Match cards render in the "You + Partner" layout.
   - Rank chip + driver skill shown for teams present in `skills_standings`.
   - `—` with tooltip shown for teams absent from `skills_standings`.
   - Score badge visible on played matches, hidden on unplayed.
   - Network tab: a single `GET /api/teams/skills-batch` call goes out when matches load; no call on VRC/VEXU pages.
2. Load a VRC team (e.g., `471B` at event `60404`) — confirm red-vs-blue layout, predict button, and prediction flow are **unchanged**.
3. Load a VEXU team — confirm VRC-style rendering still applies (VEXU is adversarial).
4. Load a live VEXIQ event — confirm 60-second polling still fires.
5. Verify Back button, Refresh button, and "View Event Rankings" fallback (with `divisionId` forwarded) work identically on both branches.
6. Defensive: artificially empty `skillsMap`, confirm page renders with `—` placeholders and no crash.

## Rollout

Single PR from `feature/vexiq-matchup-page` into `main`. No feature flag — scope is isolated behind `matchType === 'VEXIQ'`. VRC/VEXU paths are untouched; the new backend endpoint and frontend hook are only invoked on the VEXIQ branch.

## Files Changed

**Backend (new endpoint):**
- `src/api/server.js` — add `GET /api/teams/skills-batch` route.

**Frontend:**
- `frontend-nextjs/src/hooks/useTeamDriverSkills.ts` — new hook.
- `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx` — extract `MatchCard` into `VrcMatchCard.tsx`; add `matchType === 'VEXIQ'` branch; drop predict button/state in the VEXIQ branch.
- `frontend-nextjs/src/components/team/VrcMatchCard.tsx` — new (moved from page, unchanged logic).
- `frontend-nextjs/src/components/team/VexiqMatchCard.tsx` — new.

No changes to: database schema, `useTeamMatches`, `useTeamPerformance`, season resolver, routing, or URL params.
