/**
 * VEX Robotics Competition Season Configuration
 * 
 * Update this file when a new season starts to automatically
 * update the default season across the application.
 */

export const CURRENT_SEASON_ID = '197'; // VRC 2025-2026: Push Back
export const CURRENT_SEASON_NAME = 'Push Back';
export const CURRENT_SEASON_YEARS = '2025-2026';

/**
 * Historical season IDs for reference
 */
export const SEASON_IDS = {
  PUSH_BACK: '197',      // 2025-2026
  HIGH_STAKES: '190',    // 2024-2025
  OVER_UNDER: '181',     // 2023-2024
  SPIN_UP: '173',        // 2022-2023
  TIPPING_POINT: '154',  // 2021-2022
} as const;

/**
 * Season display names
 */
export const SEASON_NAMES = {
  '197': 'Push Back (2025-2026)',
  '190': 'High Stakes (2024-2025)',
  '181': 'Over Under (2023-2024)',
  '173': 'Spin Up (2022-2023)',
  '154': 'Tipping Point (2021-2022)',
} as const;

