# Quick Guide: Remove Duplicate VRC Records

## 🎯 Recommended Approach

### Step 1: Find Duplicates (SELECT Query)

Run this in **SELECT mode** to see all duplicate team names:

```sql
SELECT 
  teamName,
  COUNT(*) as duplicate_count,
  array_agg(teamNumber ORDER BY score DESC) as team_numbers,
  array_agg(score ORDER BY score DESC) as scores
FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName IS NOT NULL 
  AND teamName != ''
GROUP BY teamName
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, teamName
LIMIT 50;
```

This will show you:
- Which team names have duplicates
- How many duplicates exist
- The team numbers and scores for each duplicate

### Step 2: Delete Duplicates (DELETE Query)

**Option A: Delete ALL duplicates at once (Bulk Operation)**

Switch to **WRITE mode** and run:

```sql
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
```

**This will:**
- Keep the record with the **highest score** for each duplicate team name
- If scores are equal, keep the **most recent** one (by lastUpdated)
- Delete all other duplicate records

**Option B: Delete duplicates for a specific team name (Safer)**

If you want to delete duplicates one team name at a time:

```sql
DELETE FROM skills_standings
WHERE matchType = 'VRC' 
  AND teamName = 'Your Duplicate Team Name'
  AND teamNumber NOT IN (
    SELECT teamNumber
    FROM skills_standings
    WHERE matchType = 'VRC' 
      AND teamName = 'Your Duplicate Team Name'
    ORDER BY score DESC, lastUpdated DESC, teamNumber
    LIMIT 1
  );
```

Replace `'Your Duplicate Team Name'` with the actual team name from Step 1.

### Step 3: Verify Deletion

After deletion, verify no duplicates remain:

```sql
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
```

If this returns no rows, all duplicates have been removed! ✅

---

## 📋 Quick Copy-Paste Queries

### 1. Find Duplicates
```sql
SELECT teamName, COUNT(*) as count, array_agg(teamNumber) as team_numbers
FROM skills_standings
WHERE matchType = 'VRC' AND teamName IS NOT NULL 
GROUP BY teamName
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### 2. Delete ALL Duplicates (Bulk)
```sql
DELETE FROM skills_standings
WHERE matchType = 'VRC'
  AND teamName IS NOT NULL
  AND teamName != ''
  AND (teamNumber, teamName) NOT IN (
    SELECT DISTINCT ON (teamName)
      teamNumber, teamName
    FROM skills_standings
    WHERE matchType = 'VRC' AND teamName IS NOT NULL AND teamName != ''
    ORDER BY teamName, score DESC, lastUpdated DESC, teamNumber
  );
```

### 3. Verify No Duplicates Remain
```sql
SELECT teamName, COUNT(*) as count
FROM skills_standings
WHERE matchType = 'VRC' AND teamName IS NOT NULL 
GROUP BY teamName
HAVING COUNT(*) > 1;
```

---

## ⚠️ Important Notes

1. **Backup First**: Consider backing up your database before bulk deletions
2. **Test First**: Run the SELECT query first to see what will be deleted
3. **Confirmation**: The admin UI will ask for confirmation before executing DELETE queries
4. **Transaction Safety**: All DELETE operations run in transactions and will rollback on error
5. **Keeps Best Record**: The query keeps the record with the highest score (or most recent if scores are equal)

---

## 🎯 What Gets Kept?

For each duplicate team name, the query keeps:
1. **Highest score** (if scores differ)
2. **Most recent** (if scores are equal, by lastUpdated)
3. **First teamNumber** (if scores and dates are equal, alphabetical)

All other duplicate records are deleted.


