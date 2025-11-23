-- =====================================================
-- SQL Queries to Remove Duplicate VRC Records
-- =====================================================
-- 
-- IMPORTANT: Run these queries in order:
-- 1. First, use the SELECT queries to identify duplicates
-- 2. Review the results carefully
-- 3. Then use the DELETE query to remove duplicates
--
-- =====================================================

-- =====================================================
-- STEP 1: Find Duplicate Team Numbers (if any exist)
-- =====================================================
-- This shouldn't find anything if primary key constraint is working,
-- but check just in case
SELECT 
  teamNumber,
  COUNT(*) as duplicate_count,
  array_agg(teamName) as team_names,
  array_agg(score) as scores,
  array_agg(rank) as ranks
FROM skills_standings
WHERE matchType = 'VRC'
GROUP BY teamNumber
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, teamNumber;

-- =====================================================
-- STEP 2: Find Duplicate Team Names (Most Common Case)
-- =====================================================
-- This finds teams with the same name but different team numbers
SELECT 
  teamName,
  COUNT(*) as duplicate_count,
  array_agg(teamNumber ORDER BY score DESC, lastUpdated DESC) as team_numbers,
  array_agg(score ORDER BY score DESC) as scores,
  array_agg(rank ORDER BY score DESC) as ranks
FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName IS NOT NULL 
  AND teamName != ''
GROUP BY teamName
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, teamName
LIMIT 50;

-- =====================================================
-- STEP 3: View Full Details of Duplicate Team Names
-- =====================================================
-- Replace 'Your Team Name' with an actual duplicate team name from Step 2
SELECT 
  teamNumber,
  teamName,
  organization,
  rank,
  score,
  autonomousSkills,
  driverSkills,
  lastUpdated
FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName = 'Your Team Name'  -- Replace with actual team name
ORDER BY score DESC, lastUpdated DESC;

-- =====================================================
-- STEP 4: DELETE Duplicate Team Numbers (if they exist)
-- =====================================================
-- This keeps the record with the highest score (or most recent if scores are equal)
-- WARNING: This will delete records! Use with caution.
DELETE FROM skills_standings
WHERE matchType = 'VRC'
  AND (teamNumber, matchType) IN (
    SELECT teamNumber, matchType
    FROM (
      SELECT 
        teamNumber,
        matchType,
        ROW_NUMBER() OVER (
          PARTITION BY teamNumber 
          ORDER BY score DESC, lastUpdated DESC, teamNumber
        ) as rn
      FROM skills_standings
      WHERE matchType = 'VRC'
    ) ranked
    WHERE rn > 1
  );

-- =====================================================
-- STEP 5: DELETE Duplicate Team Names (Recommended)
-- =====================================================
-- This removes duplicate team names, keeping the one with highest score
-- WARNING: This will delete records! Use with caution.
-- 
-- For a specific team name:
DELETE FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName = 'Your Duplicate Team Name'  -- Replace with actual team name
  AND teamNumber NOT IN (
    SELECT teamNumber
    FROM skills_standings
    WHERE matchType = 'VRC' 
      AND teamName = 'Your Duplicate Team Name'  -- Same team name here
    ORDER BY score DESC, lastUpdated DESC, teamNumber
    LIMIT 1
  );

-- =====================================================
-- STEP 6: DELETE ALL Duplicate Team Names (Bulk Operation)
-- =====================================================
-- This removes ALL duplicate team names in one operation
-- Keeps the record with highest score for each duplicate team name
-- WARNING: This will delete multiple records! Use with extreme caution.
DELETE FROM skills_standings
WHERE matchType = 'VRC'
  AND teamName IS NOT NULL
  AND teamName != ''
  AND (teamNumber, teamName) NOT IN (
    SELECT DISTINCT ON (teamName)
      teamNumber,
      teamName
    FROM skills_standings
    WHERE matchType = 'VRC'
      AND teamName IS NOT NULL
      AND teamName != ''
    ORDER BY teamName, score DESC, lastUpdated DESC, teamNumber
  );

-- =====================================================
-- STEP 7: Verify Deletion Results
-- =====================================================
-- After deletion, verify no duplicates remain
SELECT 
  teamName,
  COUNT(*) as count
FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName IS NOT NULL 
  AND teamName != ''
GROUP BY teamName
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- =====================================================
-- RECOMMENDED APPROACH:
-- =====================================================
-- 1. Run STEP 2 to see all duplicate team names
-- 2. Review the results to understand the scope
-- 3. For each duplicate team name, run STEP 3 to see details
-- 4. Use STEP 5 to delete duplicates for specific team names one by one
--    (safer than bulk deletion)
-- 5. After each deletion, verify with STEP 7
-- 
-- OR use STEP 6 for bulk deletion (faster but less control)
-- =====================================================


