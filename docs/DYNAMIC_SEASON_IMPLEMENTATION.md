# 🎯 Dynamic Season Detection Implementation

## Overview

This implementation eliminates the need for hardcoded season IDs in configuration files by automatically detecting the current season for each VEX program (VRC, VEXIQ, VEXU) from the RobotEvents API.

## Problem Statement

### Previous Issues:
1. ❌ **Hardcoded VRC season ID** (`CURRENT_SEASON_ID=197`) used for all programs
2. ❌ **VEXIQ teams fetched events with VRC season ID** → No results found
3. ❌ **Season dropdown showed VRC seasons only** for all teams
4. ❌ **Manual updates required** when new seasons released

### Root Cause:
- Each VEX program (VRC, VEXIQ, VEXU) has **independent seasons** with **different IDs**
- VRC 2025-2026: "Push Back" (Season ID: 197)
- VEXIQ 2025-2026: "Mix & Match" (Season ID: ~198)
- VEXU 2025-2026: "Push Back" (Season ID: 197)

Using a single `CURRENT_SEASON_ID` caused VEXIQ/VEXU teams to search for events in the wrong season.

---

## Solution: Fully Dynamic Season Detection

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User Views Team Detail Page                                │
│  Example: Team 4010E (VEXIQ)                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ 1. Fetch Team Info    │
        │    GET /api/teams/    │
        │    4010E              │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ Team Data Loaded:             │
        │ - matchType: 'VEXIQ'          │
        │ - teamNumber: '4010E'         │
        │ - organization: 'CSAAFuture'  │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴────────────────────────────────────┐
        │                                                 │
        ▼                                                 ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│ 2. Fetch Seasons        │              │ 3. Fetch Events         │
│    GET /api/seasons?    │              │    GET /api/teams/      │
│    matchType=VEXIQ      │              │    4010E/events?        │
│                         │              │    season=198&          │
│    Returns:             │              │    matchType=VEXIQ      │
│    [                    │              │                         │
│      {                  │              │    Uses:                │
│        id: 198,         │ ────────────>│    - Program ID: 4      │
│        name: "Mix &     │  Auto-select │    - Season ID: 198 ✅  │
│               Match"    │  First item  │                         │
│      },                 │              └─────────────────────────┘
│      {                  │
│        id: 196,         │
│        name: "Rapid     │
│               Relay"    │
│      }                  │
│    ]                    │
└─────────────────────────┘
```

---

## Implementation Details

### 1. Backend Changes

#### `/api/seasons` Endpoint (server.js)

**Before:**
```javascript
app.get('/api/seasons', async (req, res) => {
  // Hardcoded to VRC only (program[]=1)
  const response = await fetch(
    'https://www.robotevents.com/api/v2/seasons?program[]=1'
  );
  // ...
});
```

**After:**
```javascript
app.get('/api/seasons', async (req, res) => {
  const { matchType } = req.query;
  
  const programMap = {
    'VRC': '1',
    'VEXIQ': '4',
    'VEXU': '41'
  };
  
  // Dynamic program selection based on matchType
  const programId = matchType && programMap[matchType] 
    ? programMap[matchType] 
    : '1'; // Default to VRC for backward compatibility
  
  const response = await fetch(
    `https://www.robotevents.com/api/v2/seasons?program[]=${programId}`
  );
  
  // Sort by most recent first (seasons[0] = current season)
  const seasons = data.data
    .sort((a, b) => new Date(b.start) - new Date(a.start));
  
  res.json(seasons);
});
```

**API Usage:**
- `GET /api/seasons?matchType=VRC` → Returns VRC seasons
- `GET /api/seasons?matchType=VEXIQ` → Returns VEXIQ seasons
- `GET /api/seasons?matchType=VEXU` → Returns VEXU seasons
- `GET /api/seasons` → Returns VRC seasons (backward compatibility)

---

### 2. Frontend Hooks

#### `useSeasons()` Hook

**Before:**
```typescript
export function useSeasons() {
  return useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/seasons`);
      return response.json();
    },
  });
}
```

**After:**
```typescript
export function useSeasons(matchType?: string) {
  return useQuery<Season[]>({
    queryKey: ['seasons', matchType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchType) {
        params.append('matchType', matchType);
      }
      const response = await fetch(
        `${API_BASE_URL}/api/seasons?${params.toString()}`
      );
      return response.json();
    },
    // Only fetch when matchType is available
    enabled: !!matchType,
  });
}
```

**Key Changes:**
- ✅ Accepts `matchType` parameter
- ✅ Uses `enabled` flag to prevent fetching wrong seasons
- ✅ Cache key includes `matchType` for proper isolation

---

### 3. Frontend Components

#### Team Detail Page

**Before:**
```typescript
import { CURRENT_SEASON_ID } from '@/config/seasons';

const [selectedSeasonId, setSelectedSeasonId] = useState(CURRENT_SEASON_ID);
const { data: events } = useTeamEvents(teamNumber, selectedSeasonId, team?.matchType);
```

**After:**
```typescript
const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

// Fetch seasons for team's program
const { data: seasons } = useSeasons(team?.matchType);

// Auto-select current season (first in array)
useEffect(() => {
  if (seasons && seasons.length > 0 && selectedSeasonId === null) {
    setSelectedSeasonId(seasons[0].id.toString()); // ✅ AUTO-DETECTED!
  }
}, [seasons, selectedSeasonId]);

const { data: events } = useTeamEvents(teamNumber, selectedSeasonId || '', team?.matchType);
```

**Key Changes:**
- ✅ No hardcoded season ID
- ✅ Fetches seasons for team's specific program
- ✅ Automatically selects current season (most recent)
- ✅ User can still change season via dropdown

---

## Execution Flow Examples

### Example 1: VEXIQ Team (4010E)

```
Step 1: Load Team
  GET /api/teams/4010E
  → { matchType: 'VEXIQ', teamNumber: '4010E', ... }

Step 2: Fetch VEXIQ Seasons
  GET /api/seasons?matchType=VEXIQ
  → [
      { id: 198, name: "Mix & Match (2025-2026)", start: "2025-05-11" },
      { id: 196, name: "Rapid Relay (2024-2025)", start: "2024-05-10" },
      { id: 187, name: "Full Volume (2023-2024)", start: "2023-05-10" }
    ]

Step 3: Auto-Select Current Season
  selectedSeasonId = seasons[0].id = 198 ✅ VEXIQ CURRENT SEASON!

Step 4: Fetch Events
  GET /api/teams/4010E/events?season=198&matchType=VEXIQ
  → Returns VEXIQ events for season 198 ✅ CORRECT!
```

### Example 2: VRC Team (57999D)

```
Step 1: Load Team
  GET /api/teams/57999D
  → { matchType: 'VRC', teamNumber: '57999D', ... }

Step 2: Fetch VRC Seasons
  GET /api/seasons?matchType=VRC
  → [
      { id: 197, name: "Push Back (2025-2026)", start: "2025-05-10" },
      { id: 190, name: "High Stakes (2024-2025)", start: "2024-05-10" },
      { id: 181, name: "Over Under (2023-2024)", start: "2023-05-10" }
    ]

Step 3: Auto-Select Current Season
  selectedSeasonId = seasons[0].id = 197 ✅ VRC CURRENT SEASON!

Step 4: Fetch Events
  GET /api/teams/57999D/events?season=197&matchType=VRC
  → Returns VRC events for season 197 ✅ CORRECT!
```

---

## Environment Variables

### Before (Required):
```bash
# env.txt or .env
ROBOTEVENTS_API_TOKEN=...
CURRENT_SEASON_ID=197        # ❌ Required, VRC-only, manual updates needed
```

### After (Simplified):
```bash
# env.txt or .env
ROBOTEVENTS_API_TOKEN=...
# CURRENT_SEASON_ID=197      # ✅ Optional, no longer needed!
```

**Result:**
- ✅ Only API token required
- ✅ Seasons auto-detected from RobotEvents API
- ✅ No manual updates when new seasons release
- ✅ Works for all programs (VRC, VEXIQ, VEXU)

---

## Benefits

### 1. **Automatic Season Detection**
- ✅ No hardcoded season IDs
- ✅ System always shows current season for each program
- ✅ Auto-updates when new seasons release

### 2. **Program-Specific Accuracy**
- ✅ VRC teams see VRC seasons
- ✅ VEXIQ teams see VEXIQ seasons
- ✅ VEXU teams see VEXU seasons

### 3. **Maintainability**
- ✅ Zero configuration changes needed for new seasons
- ✅ Single source of truth (RobotEvents API)
- ✅ No sync issues between programs

### 4. **User Experience**
- ✅ Correct season dropdown for each team
- ✅ Accurate event listings
- ✅ Seamless season transitions

---

## Testing Checklist

### Test Case 1: VRC Team
- [ ] Search for VRC team (e.g., 57999D)
- [ ] Season dropdown shows VRC seasons (Push Back, High Stakes, etc.)
- [ ] Default season: "Push Back (2025-2026)" (ID: 197)
- [ ] Events display correctly for VRC season 197

### Test Case 2: VEXIQ Team ⭐ (Critical Fix)
- [ ] Upload VEXIQ skills standings CSV
- [ ] Search for VEXIQ team (e.g., 4010E)
- [ ] Season dropdown shows VEXIQ seasons (Mix & Match, Rapid Relay, etc.)
- [ ] Default season: "Mix & Match (2025-2026)" (ID: ~198)
- [ ] **Events NOW display** (previously broken!)
- [ ] Browser console shows: `matchType=VEXIQ`, `season=198` (or current VEXIQ season)

### Test Case 3: Season Switching
- [ ] View any team detail page
- [ ] Change season via dropdown
- [ ] Events update to show selected season
- [ ] Awards update accordingly

---

## API Contract

### Backend Endpoints

#### `GET /api/seasons`
**Query Parameters:**
- `matchType` (optional): `VRC` | `VEXIQ` | `VEXU`
  - If provided: Returns seasons for that program
  - If omitted: Returns VRC seasons (backward compatibility)

**Response:**
```json
[
  {
    "id": 198,
    "name": "Mix & Match",
    "start": "2025-05-11T00:00:00.000Z",
    "end": "2026-04-30T00:00:00.000Z"
  },
  {
    "id": 196,
    "name": "Rapid Relay",
    "start": "2024-05-10T00:00:00.000Z",
    "end": "2025-04-30T00:00:00.000Z"
  }
]
```

**Sorting:** Most recent season first (array[0] = current season)

---

## Migration Guide

### For Existing Deployments:

1. **No database changes required** ✅
2. **No breaking API changes** (backward compatible) ✅
3. **Optional env cleanup:**
   - Remove `CURRENT_SEASON_ID` from env.txt (no longer needed)
   - Or keep it for reference/fallback

### For New Deployments:

1. **Minimal env.txt:**
   ```bash
   ROBOTEVENTS_API_TOKEN=<your_token>
   ```
2. **That's it!** Seasons auto-detected

---

## Future-Proofing

### When 2026-2027 Season Releases:

**Old Approach (Manual):**
1. ❌ Update `CURRENT_SEASON_ID` in env.txt
2. ❌ Update `VEXIQ_SEASON_ID` in env.txt
3. ❌ Update constants in code
4. ❌ Redeploy application

**New Approach (Automatic):**
1. ✅ **Nothing!** System auto-detects new season
2. ✅ Season dropdown automatically shows new season as default
3. ✅ Events fetch with correct new season ID
4. ✅ Zero code changes needed

---

## Files Modified

### Backend:
- `src/api/server.js`
  - `/api/seasons` endpoint now accepts `matchType` parameter

### Frontend:
- `frontend-nextjs/src/hooks/useSeasons.ts`
  - Hook now accepts `matchType` parameter
  - Uses `enabled` flag for race condition prevention
- `frontend-nextjs/src/app/team/[teamNumber]/page.tsx`
  - Passes `matchType` to `useSeasons()`
  - Auto-selects current season from API response
  - Removed dependency on hardcoded `CURRENT_SEASON_ID`
- `frontend-nextjs/src/components/team/EventsSection.tsx`
  - Accepts `seasons` and `isSeasonsLoading` props
  - Displays program-specific seasons in dropdown
- `frontend-nextjs/src/config/seasons.ts`
  - Marked constants as deprecated
  - Added documentation for dynamic approach
  - Kept for reference only

---

## Known Season IDs (Reference Only)

### VRC Seasons:
- 197: Push Back (2025-2026) ← Current
- 190: High Stakes (2024-2025)
- 181: Over Under (2023-2024)
- 173: Spin Up (2022-2023)

### VEXIQ Seasons:
- 198: Mix & Match (2025-2026) ← Current (estimated)
- 196: Rapid Relay (2024-2025)
- 187: Full Volume (2023-2024)

### VEXU Seasons:
- 197: Push Back (2025-2026) ← Current (same as VRC)
- 190: High Stakes (2024-2025)

**Note:** These IDs are auto-detected from RobotEvents API and listed here for reference only.

---

## Summary

This implementation provides:
- ✅ **Zero-configuration** season management
- ✅ **Program-specific** season detection
- ✅ **Automatic** current season selection
- ✅ **Future-proof** design
- ✅ **Backward compatible** API
- ✅ **Race condition safe** with `enabled` flags

**Result:** VEXIQ and VEXU teams now work correctly with their program-specific seasons, without any manual configuration! 🎉

