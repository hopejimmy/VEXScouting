# 🚨 CRITICAL: Program ID Mapping Correction

## Discovery

**Date:** 2025-11-10  
**Verified by:** Direct RobotEvents API Query

## The Bug

Our program ID mapping was **INCORRECT**! VEXIQ and VEXU were swapped.

### What We Had (WRONG):
```javascript
const programMap = {
  'VRC': '1',
  'VEXIQ': '4',   // ❌ WRONG - This is actually VEXU!
  'VEXU': '41'    // ❌ WRONG - This is actually VEXIQ!
};
```

### Correct Mapping (VERIFIED):
```javascript
const programMap = {
  'VRC': '1',      // ✅ VEX V5 Robotics Competition
  'VEXIQ': '41',   // ✅ VEX IQ Robotics Competition
  'VEXU': '4'      // ✅ VEX U University Competition
};
```

---

## API Verification Results

### Program ID: 1 (VRC - V5)
```
→ CURRENT | ID: 197  | VEX V5 Robotics Competition 2025-2026: Push Back
           | ID: 190  | VEX V5 Robotics Competition 2024-2025: High Stakes
           | ID: 181  | VRC 2023-2024: Over Under
```

### Program ID: 41 (VEXIQ - Correct!)
```
→ CURRENT | ID: 196  | VEX IQ Robotics Competition 2025-2026: Mix & Match ✅
           | ID: 189  | VEX IQ Robotics Competition 2024-2025: Rapid Relay
           | ID: 180  | VIQRC 2023-2024: Full Volume
```

### Program ID: 4 (VEXU - Correct!)
```
→ CURRENT | ID: 198  | VEX U Robotics Competition 2025-2026: Push Back ✅
           | ID: 191  | VEX U Robotics Competition 2024-2025: High Stakes
           | ID: 182  | VEXU 2023-2024: Over Under
```

---

## Correct Season IDs for 2025-2026

| Program | Season Name | Season ID | Program ID |
|---------|-------------|-----------|------------|
| **VRC** | Push Back | **197** | 1 |
| **VEXIQ** | Mix & Match | **196** ✅ | 41 ✅ |
| **VEXU** | Push Back | **198** ✅ | 4 ✅ |

---

## Impact

### Before Fix:
- VEXIQ teams searched with Program ID `4` (VEXU) → Found VEXU teams instead!
- VEXU teams searched with Program ID `41` (VEXIQ) → Found VEXIQ teams instead!
- **Complete data mismatch!** 🚨

### After Fix:
- VEXIQ teams search with Program ID `41` → Find correct VEXIQ teams ✅
- VEXU teams search with Program ID `4` → Find correct VEXU teams ✅
- Correct season IDs used for each program ✅

---

## Files Updated

1. **src/api/server.js** - All programMap instances corrected
2. **frontend-nextjs/src/config/seasons.ts** - Season IDs updated with verified values

---

## Testing Required

### CRITICAL: Test VEXIQ Team
- Upload VEXIQ CSV (skills-standings (11).csv)
- Search for team **4010E**
- Verify:
  - ✅ Team found correctly
  - ✅ Season dropdown shows "Mix & Match (2025-2026)"
  - ✅ Season ID: **196** (not 198!)
  - ✅ Events display correctly
  - ✅ Console shows: `program[]=41`, `season=196`

### Test VEXU Team (if any)
- Verify VEXU teams search with program ID `4`
- Season ID should be `198`

---

## Summary

**Answer to "What is the ID for Mix & Match?"**

✅ **Season ID: 196** (VERIFIED from RobotEvents API)  
✅ **Program ID: 41** for VEXIQ (VERIFIED from RobotEvents API)

The system will now auto-detect this, but the corrected program IDs are critical for finding the right teams!

