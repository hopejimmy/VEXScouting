/**
 * VEX Robotics Season Configuration
 * 
 * NOTE: As of the dynamic season implementation, seasons are now automatically
 * fetched from the RobotEvents API based on the team's program (VRC, VEXIQ, VEXU).
 * 
 * The system automatically:
 * - Detects the current season for each program
 * - Returns the most recent season as default
 * - No manual updates needed when new seasons release
 * 
 * This file is kept for reference and backward compatibility only.
 */

/**
 * @deprecated - Seasons are now fetched dynamically from RobotEvents API
 * The current season is automatically detected as the most recent season
 * for each program (VRC, VEXIQ, VEXU)
 */

/**
 * Historical VRC season IDs for reference only
 */
export const VRC_SEASON_IDS = {
  PUSH_BACK: '197',      // 2025-2026
  HIGH_STAKES: '190',    // 2024-2025
  OVER_UNDER: '181',     // 2023-2024
  SPIN_UP: '173',        // 2022-2023
  TIPPING_POINT: '154',  // 2021-2022
} as const;

/**
 * Historical VEXIQ season IDs for reference only
 * VERIFIED from RobotEvents API on 2025-11-10
 */
export const VEXIQ_SEASON_IDS = {
  MIX_AND_MATCH: '196',  // 2025-2026 - VERIFIED ✅
  RAPID_RELAY: '189',    // 2024-2025
  FULL_VOLUME: '180',    // 2023-2024
} as const;

/**
 * Historical VEXU season IDs for reference only
 * VERIFIED from RobotEvents API on 2025-11-10
 */
export const VEXU_SEASON_IDS = {
  PUSH_BACK: '198',      // 2025-2026 - VERIFIED ✅
  HIGH_STAKES: '191',    // 2024-2025
  OVER_UNDER: '182',     // 2023-2024
} as const;

/**
 * Program-specific season information
 * NOTE: This is dynamically fetched from RobotEvents API
 * These constants are for reference only
 * VERIFIED from RobotEvents API on 2025-11-10
 */
export const CURRENT_SEASONS_BY_PROGRAM = {
  VRC: {
    name: 'Push Back',
    years: '2025-2026',
    id: '197',
    programId: '1'
  },
  VEXIQ: {
    name: 'Mix & Match',
    years: '2025-2026',
    id: '196',           // VERIFIED ✅
    programId: '41'      // CRITICAL: Program ID is 41, not 4!
  },
  VEXU: {
    name: 'Push Back',
    years: '2025-2026',
    id: '198',           // VERIFIED ✅
    programId: '4'       // CRITICAL: Program ID is 4, not 41!
  }
} as const;

