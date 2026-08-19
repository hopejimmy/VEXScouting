# Graph Report - .  (2026-05-29)

## Corpus Check
- 125 files · ~113,566 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 535 nodes · 919 edges · 33 communities (25 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 26 edges
2. `useAuth()` - 21 edges
3. `Card()` - 17 edges
4. `Badge()` - 17 edges
5. `compilerOptions` - 16 edges
6. `CardContent()` - 16 edges
7. `CardHeader()` - 14 edges
8. `Team` - 13 edges
9. `Button()` - 12 edges
10. `useFavorites()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `DatabaseStatusContent()` --calls--> `formatDate()`  [INFERRED]
  frontend-nextjs/src/app/admin/database/page.tsx → src/utils/dbTest.ts
- `SkillsSectionProps` --references--> `Team`  [EXTRACTED]
  frontend-nextjs/src/components/team/SkillsSection.tsx → frontend-nextjs/src/types/skills.ts
- `FavoriteTeamCard()` --calls--> `getMatchTypeBadgeColor()`  [INFERRED]
  frontend-nextjs/src/app/favorites/page.tsx → frontend-nextjs/src/app/team/[teamNumber]/page.tsx
- `CompareTeamCard()` --calls--> `getMatchTypeBadgeColor()`  [INFERRED]
  frontend-nextjs/src/app/compare/page.tsx → frontend-nextjs/src/app/team/[teamNumber]/page.tsx
- `TeamsResponse` --references--> `Team`  [EXTRACTED]
  frontend-nextjs/src/app/page.tsx → frontend-nextjs/src/types/skills.ts

## Communities (33 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (37): TeamCard(), TeamsResponse, ComparePage(), CompareTeamCard(), CompareContext, CompareContextType, useCompare(), FavoritesContext (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (54): allowedOperations, allTeams, app, awards, basePoolConfig, bodyStr, conditions, contentType (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (35): AdminDashboardContent(), AnalysisDashboard(), LogEntry, TrackedTeam, LoginModal(), LoginModalProps, ProtectedRoute(), ProtectedRouteProps (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (33): RankingsTable(), RankingsTableProps, SortDirection, SortField, EventRankingsPage(), useMultipleTeamAwards(), useEventRankings(), cn() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (41): dependencies, axios, class-variance-authority, clsx, framer-motion, lucide-react, next, node-fetch (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (32): author, dependencies, bcryptjs, cors, csv-parser, dotenv, express, express-rate-limit (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (18): MatchAnalysisCard(), MatchAnalysisCardProps, MatchListPage(), TeamDriverSkills, useTeamDriverSkills(), Match, MatchAlliance, MatchTeam (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (15): calculateEventStats(), delay(), ensureTeamAnalysis(), fetchAllPages(), getTeamPerformance(), getTeamPerformanceV2(), math, processEvent() (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): author, dependencies, bcryptjs, cors, csv-parser, dotenv, express, jsonwebtoken (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (12): fetchSeasonFromApi(), getCurrentSeasonId(), PROGRAM_CONFIG, refreshSeasonId(), saveSeasonToDb(), seasonCache, DATASETS, fetchAndUpsertDataset() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (11): __dirname, __filename, formatDate(), initializeDb(), main(), SkillsStandingRow, storeSkillsStandings(), __dirname (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (10): Database, dataDir, db, dbPath, fs, insertStmt, parseCSV(), path (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (7): geist, geistMono, metadata, AuthProvider(), CompareProvider(), FavoritesProvider(), ReactQueryProvider()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (3): AwardsBadge(), AwardsBadgeProps, Award

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): cmds, phases, install, setup, nixPkgs, start, cmd

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): adminLimiter, adminMax, authLimiter, max, publicLimiter, windowMs

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): CURRENT_SEASONS_BY_PROGRAM, VEXIQ_SEASON_IDS, VEXU_SEASON_IDS, VRC_SEASON_IDS

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (3): __dirname, __filename, pool

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (4): initializeDatabase(), startApplication(), startServer(), testDatabaseConnection()

## Knowledge Gaps
- **247 isolated node(s):** `nixPkgs`, `cmds`, `cmd`, `name`, `version` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `DatabaseStatusContent()` connect `Community 2` to `Community 12`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `formatDate()` connect `Community 12` to `Community 2`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `nixPkgs`, `cmds`, `cmd` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08704557091653865 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06568832983927324 - nodes in this community are weakly interconnected._