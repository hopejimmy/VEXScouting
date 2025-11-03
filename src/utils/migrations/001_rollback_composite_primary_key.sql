-- ============================================================================
-- ROLLBACK: Revert Composite Primary Key Migration
-- ============================================================================
-- Purpose: Restore original single-column primary key if needed
-- Use this ONLY if the migration causes issues
-- ============================================================================

BEGIN;

-- Step 1: Drop composite primary key
ALTER TABLE skills_standings DROP CONSTRAINT IF EXISTS skills_standings_pkey;

-- Step 2: Restore original primary key (single column)
ALTER TABLE skills_standings 
  ADD CONSTRAINT skills_standings_pkey PRIMARY KEY (teamNumber);

-- Step 3: Drop indexes created by migration
DROP INDEX IF EXISTS idx_skills_standings_matchtype;
DROP INDEX IF EXISTS idx_skills_standings_teamnumber;

-- Step 4: Restore data from backup if needed
-- Uncomment if data was corrupted:
-- TRUNCATE TABLE skills_standings;
-- INSERT INTO skills_standings SELECT * FROM skills_standings_backup_v1;

-- Step 5: Verify rollback
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM skills_standings;
  RAISE NOTICE 'Rollback complete! Current rows: %', row_count;
END $$;

COMMIT;

-- Rollback completed!

