-- ============================================================================
-- Migration: Add Composite Primary Key for Team Number and Match Type
-- ============================================================================
-- Purpose: Allow same team number to exist in different match types (VRC, VEXIQ, VEXU)
-- Risk Level: LOW - Uses transaction with automatic rollback on error
-- Estimated Time: 5-10 seconds
-- 
-- What this does:
-- 1. Backs up existing data to a temporary table
-- 2. Drops the old primary key constraint
-- 3. Creates new composite primary key (teamNumber, matchType)
-- 4. Preserves all existing data
-- ============================================================================

BEGIN;

-- Step 1: Create backup table (for safety)
CREATE TABLE IF NOT EXISTS skills_standings_backup_v1 AS 
SELECT * FROM skills_standings;

-- Step 2: Drop the old primary key constraint
ALTER TABLE skills_standings DROP CONSTRAINT IF EXISTS skills_standings_pkey;

-- Step 3: Ensure matchType column exists and has default
ALTER TABLE skills_standings 
  ALTER COLUMN matchType SET DEFAULT 'VRC',
  ALTER COLUMN matchType SET NOT NULL;

-- Step 4: Update any NULL matchType values to 'VRC' (safety)
UPDATE skills_standings SET matchType = 'VRC' WHERE matchType IS NULL;

-- Step 5: Add composite primary key
ALTER TABLE skills_standings 
  ADD CONSTRAINT skills_standings_pkey PRIMARY KEY (teamNumber, matchType);

-- Step 6: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_skills_standings_matchtype ON skills_standings(matchType);
CREATE INDEX IF NOT EXISTS idx_skills_standings_teamnumber ON skills_standings(teamNumber);

-- Step 7: Verify migration
DO $$
DECLARE
  backup_count INTEGER;
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM skills_standings_backup_v1;
  SELECT COUNT(*) INTO current_count FROM skills_standings;
  
  IF backup_count != current_count THEN
    RAISE EXCEPTION 'Data count mismatch! Backup: %, Current: %', backup_count, current_count;
  END IF;
  
  RAISE NOTICE 'Migration successful! Rows preserved: %', current_count;
END $$;

COMMIT;

-- Migration completed successfully!
-- To drop backup table after confirming everything works:
-- DROP TABLE skills_standings_backup_v1;

