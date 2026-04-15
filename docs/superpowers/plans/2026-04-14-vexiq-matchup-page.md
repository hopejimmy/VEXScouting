# VEXIQ Match-up Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the team event match list with a cooperative "You + Partner" layout (with season-best Driver Skills) when `matchType === 'VEXIQ'`, while leaving the VRC/VEXU red-vs-blue path untouched.

**Architecture:** Add a small read-only backend endpoint (`GET /api/teams/skills-batch`) that returns `{ teamNumber, highestDriverSkills, rank }` rows from `skills_standings` for a list of teams scoped by `matchType`. Frontend adds a `useTeamDriverSkills` hook, extracts the existing VRC match card into its own file, and adds a new `VexiqMatchCard` component. The event page branches on `matchType` at render time.

**Tech Stack:** Node/Express (`src/api/server.js`), PostgreSQL (`skills_standings` table, lowercase column names), Next.js 15 App Router, React Query (`@tanstack/react-query`), TailwindCSS, shadcn/ui (Card, Badge), framer-motion.

**Reference spec:** `docs/superpowers/specs/2026-04-14-vexiq-matchup-page-design.md`

**Testing note:** This repo has no Jest/Vitest setup for either backend or the Next.js app. "Tests" below are explicit manual verification steps (curl commands, browser checks) with concrete pass/fail criteria. Every task ends with a commit.

---

## File Structure

**Backend:**
- **Modify** `src/api/server.js` — add one new route handler near the existing `/api/teams/:teamNumber` handler (around line 1263).

**Frontend:**
- **Create** `frontend-nextjs/src/hooks/useTeamDriverSkills.ts` — new React Query hook.
- **Create** `frontend-nextjs/src/components/team/VrcMatchCard.tsx` — move the existing `MatchCard` + `TeamRow` helpers out of the page file.
- **Create** `frontend-nextjs/src/components/team/VexiqMatchCard.tsx` — new component.
- **Modify** `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx` — branch on `matchType`, remove inline `MatchCard`/`TeamRow`, gate VRC-only fetches/state.

**No changes** to DB schema, `useTeamMatches`, `useTeamPerformance`, season resolver, routing, or URL params.

---

## Task 1: Backend — `/api/teams/skills-batch` endpoint

**Files:**
- Modify: `src/api/server.js` (insert immediately after the existing `/api/teams/:teamNumber` handler, around line 1263)

**Goal:** Return driver skills + rank for a batch of teams, scoped by `matchType`.

- [ ] **Step 1: Write the endpoint**

In `src/api/server.js`, insert this handler immediately after the closing `});` of the `/api/teams/:teamNumber` route (around line 1263, before the `/api/analysis/performance` route):

```js
// Batch driver-skills lookup for VEXIQ match-up pages.
// Returns only the fields needed for per-match cards: driver skill + rank, scoped by matchType.
app.get('/api/teams/skills-batch', async (req, res) => {
  try {
    const { teams, matchType } = req.query;
    if (!teams) {
      return res.status(400).json({ error: 'teams parameter required (comma-separated list)' });
    }
    if (!matchType) {
      return res.status(400).json({ error: 'matchType parameter required (e.g. VEXIQ)' });
    }

    const teamList = teams.split(',').map(t => t.trim()).filter(Boolean);
    if (teamList.length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT teamNumber, highestDriverSkills, rank
         FROM skills_standings
        WHERE teamNumber = ANY($1)
          AND matchType = $2`,
      [teamList, matchType]
    );

    const rows = result.rows.map(r => ({
      teamNumber: r.teamnumber,
      highestDriverSkills: r.highestdriverskills,
      rank: r.rank,
    }));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching skills batch:', error);
    res.status(500).json({ error: 'Error fetching skills batch' });
  }
});
```

- [ ] **Step 2: Start backend locally and verify happy path**

Run (from repo root):

```bash
npm run dev:api   # or: node src/api/server.js — whichever the repo uses
```

Then in a second terminal:

```bash
curl -s 'http://localhost:3000/api/teams/skills-batch?teams=252A,18886C&matchType=VEXIQ' | python3 -m json.tool
```

Expected: a JSON array with zero or more objects, each shaped `{"teamNumber": "...", "highestDriverSkills": <number>, "rank": <number>}`. No server error logs.

If the local DB has no VEXIQ rows, the array will be `[]` — that is still a pass for this step.

- [ ] **Step 3: Verify matchType filter actually isolates programs**

```bash
curl -s 'http://localhost:3000/api/teams/skills-batch?teams=252A&matchType=VEXIQ' | python3 -m json.tool
curl -s 'http://localhost:3000/api/teams/skills-batch?teams=252A&matchType=VRC'   | python3 -m json.tool
```

Expected: for team `252A` (which exists in both programs, per prior bug history), the two responses return **different** `highestDriverSkills` / `rank` values. This confirms the matchType filter is correct.

If only one of them returns a row, that is also a valid pass — it means `252A` only exists in one program in your local DB.

- [ ] **Step 4: Verify validation errors**

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/teams/skills-batch'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/teams/skills-batch?teams=252A'
```

Expected: both print `400`.

```bash
curl -s 'http://localhost:3000/api/teams/skills-batch?teams=&matchType=VEXIQ'
```

Expected: `[]` (empty teams parameter after filter → empty array, not 400).

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js
git commit -m "feat(api): add GET /api/teams/skills-batch for VEXIQ match-up cards"
```

---

## Task 2: Frontend hook `useTeamDriverSkills`

**Files:**
- Create: `frontend-nextjs/src/hooks/useTeamDriverSkills.ts`

**Goal:** React Query wrapper for the new batch endpoint.

- [ ] **Step 1: Create the hook file**

Write the entire file contents:

```ts
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface TeamDriverSkills {
  teamNumber: string;
  highestDriverSkills: number;
  rank: number;
}

/**
 * Batch-fetch season-best Driver Skills score and rank for a list of teams,
 * scoped by matchType. Used by the VEXIQ match-up page.
 *
 * Missing teams (not in skills_standings) are simply absent from the returned
 * array. Callers should fall back to a placeholder when a teamNumber is missing.
 *
 * Only fires when matchType === 'VEXIQ' and there is at least one team number,
 * so the VRC/VEXU rendering path never triggers this request.
 */
export function useTeamDriverSkills(teamNumbers: string[], matchType: string | undefined) {
  const sortedKey = [...teamNumbers].sort().join(',');
  return useQuery<TeamDriverSkills[]>({
    queryKey: ['teamDriverSkills', matchType, sortedKey],
    queryFn: async () => {
      if (teamNumbers.length === 0 || !matchType) return [];
      const params = new URLSearchParams({
        teams: teamNumbers.join(','),
        matchType,
      });
      const response = await fetch(`${API_BASE_URL}/api/teams/skills-batch?${params.toString()}`);
      if (!response.ok) {
        console.error('Failed to fetch driver skills batch');
        return [];
      }
      return response.json();
    },
    enabled: teamNumbers.length > 0 && matchType === 'VEXIQ',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
cd frontend-nextjs && npx tsc --noEmit
```

Expected: no errors about `useTeamDriverSkills.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend-nextjs/src/hooks/useTeamDriverSkills.ts
git commit -m "feat(frontend): add useTeamDriverSkills hook for VEXIQ batch lookups"
```

---

## Task 3: Extract `VrcMatchCard` from the page

**Files:**
- Create: `frontend-nextjs/src/components/team/VrcMatchCard.tsx`
- Modify: `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx`

**Goal:** Pure refactor — move the existing `MatchCard` and `TeamRow` components (currently inline at the bottom of the page file, lines 283–412) into their own file with zero behavior change. This locks in a clean seam before adding the VEXIQ branch.

- [ ] **Step 1: Create `VrcMatchCard.tsx` with the extracted component**

Write the entire file contents. This is the current `MatchCard` + `TeamRow` inline code, with imports adjusted to be stand-alone:

```tsx
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/hooks/useTeamMatches';
import { PerformanceData } from '@/hooks/useTeamPerformance';
import { MatchAnalysisCard } from '@/components/analysis/MatchAnalysisCard';

export function VrcMatchCard({
    match,
    teamNumber,
    predictionMode,
    performanceMap,
}: {
    match: Match;
    teamNumber: string;
    predictionMode: boolean;
    performanceMap: Record<string, PerformanceData>;
}) {
    const redAlliance = match.alliances.find(a => a.color === 'red');
    const blueAlliance = match.alliances.find(a => a.color === 'blue');

    const redScore = redAlliance?.score || 0;
    const blueScore = blueAlliance?.score || 0;

    let result: 'win' | 'loss' | 'tie' | null = null;
    const isRed = redAlliance?.teams.some(t => t.team.name === teamNumber);

    if (match.started) {
        if (redScore === blueScore) result = 'tie';
        else if (isRed) result = redScore > blueScore ? 'win' : 'loss';
        else result = blueScore > redScore ? 'win' : 'loss';
    }

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900">{match.name}</span>
                        <Badge variant="outline" className="bg-white">
                            {new Date(match.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    </div>
                    {result && (
                        <Badge className={`
              ${result === 'win' ? 'bg-green-100 text-green-700 border-green-200' : ''}
              ${result === 'loss' ? 'bg-red-100 text-red-700 border-red-200' : ''}
              ${result === 'tie' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
            `}>
                            {result.toUpperCase()}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className={`p-4 ${result && (redScore > blueScore ? 'bg-red-50/30' : '')}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-red-600">Red Alliance</span>
                            <span className="text-2xl font-bold text-gray-900">{redScore}</span>
                        </div>
                        <div className="space-y-2">
                            {redAlliance?.teams.map((t) => (
                                <TeamRow
                                    key={t.team.id}
                                    team={t}
                                    isFocused={t.team.name === teamNumber}
                                    performanceData={performanceMap[t.team.name]}
                                    showAnalysis={predictionMode}
                                />
                            ))}
                        </div>
                    </div>
                    <div className={`p-4 ${result && (blueScore > redScore ? 'bg-blue-50/30' : '')}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-blue-600">Blue Alliance</span>
                            <span className="text-2xl font-bold text-gray-900">{blueScore}</span>
                        </div>
                        <div className="space-y-2">
                            {blueAlliance?.teams.map((t) => (
                                <TeamRow
                                    key={t.team.id}
                                    team={t}
                                    isFocused={t.team.name === teamNumber}
                                    performanceData={performanceMap[t.team.name]}
                                    showAnalysis={predictionMode}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {predictionMode && (
                    <MatchAnalysisCard
                        redAlliance={redAlliance?.teams.map(t => t.team.name) || []}
                        blueAlliance={blueAlliance?.teams.map(t => t.team.name) || []}
                        performanceMap={performanceMap}
                    />
                )}
            </CardContent>
        </Card>
    );
}

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
                {team.sitting && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Sit</Badge>
                )}
            </div>

            <div className="flex items-center space-x-2">
                {showAnalysis && (
                    <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-700">
                        {performanceData ? `WR: ${performanceData.winRate}` : 'WR: N/A'}
                    </Badge>
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

- [ ] **Step 2: Remove the inline `MatchCard` and `TeamRow` from `page.tsx`**

In `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx`, delete lines 283–412 (the `function MatchCard(...)` block through the end of `function TeamRow(...)`). Add an import at the top of the file:

Replace this line (currently around line 11):

```tsx
import { useTeamMatches, Match } from '@/hooks/useTeamMatches';
```

Keep it as-is, and immediately after the existing import block (before `import { useMemo } from 'react';`), add:

```tsx
import { VrcMatchCard } from '@/components/team/VrcMatchCard';
```

Then in the JSX, change the `<MatchCard` usage (around line 267) to `<VrcMatchCard`:

```tsx
{matches.map((match) => (
    <VrcMatchCard
        key={match.id}
        match={match}
        teamNumber={teamNumber}
        predictionMode={predictionMode}
        performanceMap={performanceMap}
    />
))}
```

Also remove the now-unused `MatchAnalysisCard` import from `page.tsx` (the card is used only inside `VrcMatchCard` now).

- [ ] **Step 3: Typecheck + dev build**

```bash
cd frontend-nextjs && npx tsc --noEmit
```

Expected: no new errors.

```bash
cd frontend-nextjs && npm run dev
```

Expected: dev server starts, no build errors in terminal.

- [ ] **Step 4: Manual smoke test — VRC path unchanged**

With backend and frontend both running:

1. Open a VRC team with matches (e.g. `http://localhost:3001/team/471B/event/60404?matchType=VRC&eventName=Test`).
2. Confirm red-vs-blue match cards render identically to before this refactor.
3. Click **Predict Matches** → alert fires if no performance data, or predictions render if present.
4. Open browser devtools Network tab → confirm `/api/analysis/performance` still fires.
5. No console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend-nextjs/src/components/team/VrcMatchCard.tsx \
        frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx
git commit -m "refactor(frontend): extract VrcMatchCard from event match list page"
```

---

## Task 4: Create `VexiqMatchCard` component

**Files:**
- Create: `frontend-nextjs/src/components/team/VexiqMatchCard.tsx`

**Goal:** New card matching the approved "You + Partner" mockup.

- [ ] **Step 1: Create the component file**

Write the entire file contents:

```tsx
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/hooks/useTeamMatches';
import { TeamDriverSkills } from '@/hooks/useTeamDriverSkills';

interface VexiqMatchCardProps {
    match: Match;
    teamNumber: string;
    skillsMap: Record<string, TeamDriverSkills>;
}

export function VexiqMatchCard({ match, teamNumber, skillsMap }: VexiqMatchCardProps) {
    // VEXIQ is cooperative: the "red" and "blue" fields are partners, not opponents.
    // Flatten all teams from every alliance and split into focused vs. partners.
    const allTeams = match.alliances.flatMap(a => a.teams);
    const focused = allTeams.find(t => t.team.name === teamNumber);
    const partners = allTeams.filter(t => t.team.name !== teamNumber);

    // VEXIQ alliances score identically; pick the first available.
    const score = match.alliances[0]?.score ?? 0;
    const showScoreBadge = match.started && match.scored;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900">{match.name}</span>
                        <Badge variant="outline" className="bg-white">
                            {new Date(match.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    </div>
                    {showScoreBadge && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                            SCORE {score}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                    <TeamPanel role="you" team={focused?.team.name ?? teamNumber} skills={skillsMap[focused?.team.name ?? teamNumber]} sitting={focused?.sitting} />
                    <div className="flex items-center justify-center text-slate-400 font-bold text-2xl px-1">+</div>
                    {partners.length > 0 ? (
                        <TeamPanel role="partner" team={partners[0].team.name} skills={skillsMap[partners[0].team.name]} sitting={partners[0].sitting} />
                    ) : (
                        <PartnerPlaceholder />
                    )}
                </div>

                {/* Defensive: in the unexpected case of 3+ teams in a VEXIQ match,
                    render extras below the main pair instead of dropping them. */}
                {partners.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {partners.slice(1).map(p => (
                            <TeamPanel key={p.team.id} role="partner" team={p.team.name} skills={skillsMap[p.team.name]} sitting={p.sitting} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TeamPanel({
    role,
    team,
    skills,
    sitting,
}: {
    role: 'you' | 'partner';
    team: string;
    skills?: TeamDriverSkills;
    sitting?: boolean;
}) {
    const isYou = role === 'you';
    const panelClasses = isYou
        ? 'bg-blue-50 border border-blue-200'
        : 'bg-yellow-50 border border-amber-200';
    const labelClasses = isYou ? 'text-blue-700' : 'text-amber-700';
    const valueClasses = isYou ? 'text-sky-600' : 'text-slate-700';

    return (
        <div className={`${panelClasses} rounded-lg p-3 text-center`}>
            <div className={`text-[10px] font-semibold tracking-wider uppercase ${labelClasses}`}>
                {isYou ? 'YOU' : 'PARTNER'}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-bold text-[15px] text-slate-900">{team}</span>
                {typeof skills?.rank === 'number' && (
                    <Badge variant="outline" className="text-[10px] font-normal text-gray-500 bg-white h-5 px-1.5">
                        #{skills.rank}
                    </Badge>
                )}
                {sitting && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Sit</Badge>
                )}
            </div>
            <div className="text-[10px] text-slate-500 mt-2">Best Driver Skill</div>
            <div className={`text-[18px] font-bold ${valueClasses}`}>
                {typeof skills?.highestDriverSkills === 'number' ? (
                    skills.highestDriverSkills
                ) : (
                    <span title="No driver skill on record">—</span>
                )}
            </div>
        </div>
    );
}

function PartnerPlaceholder() {
    return (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-center flex items-center justify-center">
            <span className="text-sm text-slate-400">Partner TBD</span>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend-nextjs && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend-nextjs/src/components/team/VexiqMatchCard.tsx
git commit -m "feat(frontend): add VexiqMatchCard cooperative match-up component"
```

---

## Task 5: Wire the VEXIQ branch into the event page

**Files:**
- Modify: `frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx`

**Goal:** Branch the rendering by `matchType`, gate the VRC-only performance fetch and predict-mode state, wire up the new VEXIQ hook + card.

- [ ] **Step 1: Add imports**

Near the top of `page.tsx`, add alongside the other imports:

```tsx
import { useTeamDriverSkills } from '@/hooks/useTeamDriverSkills';
import { VexiqMatchCard } from '@/components/team/VexiqMatchCard';
```

- [ ] **Step 2: Gate `useTeamPerformance` and `predictionMode` on non-VEXIQ**

Find the `allTeamNumbers` memo (around line 65 in the current file). Leave it as-is (it's cheap and used by both paths). Replace the `useTeamPerformance` call and the `predictionMode` state so they are effectively no-ops on the VEXIQ path.

Change this block (around lines 62–92):

```tsx
const [predictionMode, setPredictionMode] = useState(false);

// Collect all unique teams for batch fetching analysis
const allTeamNumbers = useMemo(() => {
    if (!matches) return [];
    const set = new Set<string>();
    matches.forEach(m => {
        m.alliances.forEach(a => a.teams.forEach(t => set.add(t.team.name)));
    });
    return Array.from(set);
}, [matches]);

// ... comment block ...

// Fetch performance data
const { data: performanceList } = useTeamPerformance(allTeamNumbers);

const performanceMap = useMemo(() => {
    const map: Record<string, PerformanceData> = {};
    if (performanceList) {
        performanceList.forEach(d => map[d.teamNumber] = d);
    }
    return map;
}, [performanceList]);
```

To this (no edits to `allTeamNumbers`; add `isVexiq` gate and parallel VEXIQ fetch):

```tsx
const [predictionMode, setPredictionMode] = useState(false);

const isVexiq = matchType === 'VEXIQ';

// Collect all unique teams for batch fetching analysis
const allTeamNumbers = useMemo(() => {
    if (!matches) return [];
    const set = new Set<string>();
    matches.forEach(m => {
        m.alliances.forEach(a => a.teams.forEach(t => set.add(t.team.name)));
    });
    return Array.from(set);
}, [matches]);

// VRC/VEXU: fetch match-analysis performance for the Predict Matches feature.
// Disable entirely on the VEXIQ path since that card doesn't use it.
const { data: performanceList } = useTeamPerformance(isVexiq ? [] : allTeamNumbers);

const performanceMap = useMemo(() => {
    const map: Record<string, PerformanceData> = {};
    if (performanceList) {
        performanceList.forEach(d => map[d.teamNumber] = d);
    }
    return map;
}, [performanceList]);

// VEXIQ: fetch season-best Driver Skills + rank for the cooperative match-up card.
// The hook is internally gated on matchType === 'VEXIQ', so this is a no-op elsewhere.
const { data: driverSkillsList } = useTeamDriverSkills(allTeamNumbers, matchType);

const skillsMap = useMemo(() => {
    const map: Record<string, import('@/hooks/useTeamDriverSkills').TeamDriverSkills> = {};
    driverSkillsList?.forEach(d => { map[d.teamNumber] = d; });
    return map;
}, [driverSkillsList]);
```

- [ ] **Step 3: Hide the "Predict Matches" button on VEXIQ**

In the button row JSX (around lines 181–207), wrap the `<Button variant={predictionMode ? "default" : "outline"}...>Predict Matches</Button>` element in a conditional:

```tsx
{!isVexiq && (
    <Button
        variant={predictionMode ? "default" : "outline"}
        onClick={handlePredictionToggle}
        className={`flex items-center space-x-2 ${predictionMode ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
    >
        <Trophy className="w-4 h-4" />
        <span>{predictionMode ? 'Hide Analysis' : 'Predict Matches'}</span>
    </Button>
)}
```

The Refresh and View Event Rankings buttons stay unchanged for both paths.

- [ ] **Step 4: Swap the match list renderer on VEXIQ**

Find the `matches.map((match) => (<VrcMatchCard ...` block added in Task 3 (around line 266). Replace it with:

```tsx
{matches.map((match) =>
    isVexiq ? (
        <VexiqMatchCard
            key={match.id}
            match={match}
            teamNumber={teamNumber}
            skillsMap={skillsMap}
        />
    ) : (
        <VrcMatchCard
            key={match.id}
            match={match}
            teamNumber={teamNumber}
            predictionMode={predictionMode}
            performanceMap={performanceMap}
        />
    )
)}
```

- [ ] **Step 5: Typecheck + dev build**

```bash
cd frontend-nextjs && npx tsc --noEmit
```

Expected: no errors.

```bash
cd frontend-nextjs && npm run dev
```

Expected: compiles cleanly, no warnings about unused `predictionMode` / `performanceMap`.

- [ ] **Step 6: Commit**

```bash
git add frontend-nextjs/src/app/team/[teamNumber]/event/[eventId]/page.tsx
git commit -m "feat(frontend): branch event match list on matchType to render VexiqMatchCard"
```

---

## Task 6: End-to-end manual verification

**Files:** none (QA only).

**Goal:** Confirm the full spec testing plan passes against a running local stack.

- [ ] **Step 1: Start backend and frontend**

Terminal 1: `npm run dev:api` (or whatever command this repo uses; confirm `http://localhost:3000/api/teams/skills-batch?...` responds).
Terminal 2: `cd frontend-nextjs && npm run dev`.

- [ ] **Step 2: VEXIQ team happy path**

1. Navigate to a VEXIQ team at an event with matches — easiest path: open `/` (home), filter to VEXIQ, click a team with past events, click a past VEXIQ event in the Events section.
2. The URL should end with `…/event/<eventId>?…&matchType=VEXIQ…`.

Confirm on the page:
- [ ] No "Predict Matches" button visible.
- [ ] Each match card shows "YOU" on the left and "PARTNER" on the right, with a "+" between.
- [ ] Focused team has a blue-tinted panel; partner has a yellow-tinted panel.
- [ ] Teams present in `skills_standings` (VEXIQ) show a numeric "Best Driver Skill" and a `#<rank>` chip.
- [ ] Teams absent from the table show `—` for driver skill and no rank chip; hovering the `—` shows the tooltip "No driver skill on record".
- [ ] Match header shows the API-provided name (e.g. `TeamWork #5`).
- [ ] Scored matches show a green `SCORE <number>` badge; unscored matches hide it.

Browser devtools Network tab:
- [ ] A single `GET /api/teams/skills-batch?teams=…&matchType=VEXIQ` request is sent.
- [ ] No `GET /api/analysis/performance` request is sent.

- [ ] **Step 3: VRC team unchanged**

1. Navigate to a VRC team with matches (e.g. `471B` at event `60404`).
2. Confirm: red-vs-blue layout unchanged, Predict Matches button visible, clicking it runs the existing prediction flow.
3. Browser devtools Network tab: `GET /api/analysis/performance` fires; `skills-batch` does **not** fire.

- [ ] **Step 4: VEXU team unchanged**

1. Navigate to a VEXU team with matches.
2. Confirm red-vs-blue layout (VEXU is adversarial) and Predict Matches button behave unchanged.
3. `skills-batch` does not fire.

- [ ] **Step 5: Shared controls work identically on both paths**

On both a VEXIQ and a VRC event match list page:
- [ ] Back button returns to team detail page.
- [ ] Refresh button re-fetches matches (spinner animates).
- [ ] "View Event Rankings" button navigates to `/event-rankings/<eventId>` with `divisionId`, `matchType`, `highlightTeam`, `returnUrl` set.
- [ ] If loaded during a live event window, a 60-second poll ticks (confirm by watching Network tab).

- [ ] **Step 6: Defensive — empty `skillsMap`**

In browser devtools, block the `/api/teams/skills-batch` request (right-click → Block request URL) and reload a VEXIQ match page.
- [ ] Page still renders. Every team's driver skill shows `—` with tooltip.
- [ ] No unhandled errors in the console.

- [ ] **Step 7: Push branch and open PR**

```bash
git push -u origin feature/vexiq-matchup-page
gh pr create --title "VEXIQ match-up page: cooperative You+Partner layout" --body "$(cat <<'EOF'
## Summary
- Adds `GET /api/teams/skills-batch` for batch driver-skill + rank lookups scoped by matchType.
- Branches the team event match list on `matchType`: VEXIQ renders a new cooperative "You + Partner" card (with season-best Driver Skills); VRC/VEXU rendering is unchanged.
- Extracts the existing VRC match card into `VrcMatchCard.tsx` for a clean split.

See spec: `docs/superpowers/specs/2026-04-14-vexiq-matchup-page-design.md`

## Test plan
- [ ] VEXIQ team page shows You+Partner layout, Best Driver Skill, rank chip, no Predict button
- [ ] Teams missing from `skills_standings` render `—` with tooltip
- [ ] VRC team page unchanged (red-vs-blue, Predict button, prediction flow)
- [ ] VEXU team page unchanged
- [ ] Only one `/api/teams/skills-batch` request per VEXIQ page load; none on VRC/VEXU
- [ ] Back / Refresh / View Event Rankings work identically across paths

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Architecture (Task 3, Task 5), Data endpoint + hook (Tasks 1, 2), VexiqMatchCard props/layout/edge cases (Task 4), VRC-only UI removed (Task 5 step 3), states (Task 4 for VEXIQ, Task 3 preserves VRC), accessibility via `title` tooltip (Task 4), testing plan (Task 6), rollout (Task 6 step 7). All spec sections map to at least one task.
- **Type consistency:** `TeamDriverSkills` interface defined in Task 2 is imported in Task 4 (`VexiqMatchCard`) and inline-referenced via `import(...)` in Task 5. `skillsMap` is the name everywhere. `highestDriverSkills` and `rank` field names match the backend transform in Task 1.
- **No placeholders:** every step has either exact code, exact commands, or concrete pass/fail criteria. No "TBD" / "implement error handling" phrasing.
