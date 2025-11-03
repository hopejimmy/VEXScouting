# Database Migration Guide

## Migration 001: Composite Primary Key for Match Types

### Purpose
Fix database schema to allow the same team number to exist in different match types (VRC, VEXIQ, VEXU) without overwriting each other.

### Problem Being Solved
**Before**: Uploading VEXIQ data for team "12345A" would overwrite existing VRC data for the same team number.

**After**: Team "12345A" can exist separately in VRC, VEXIQ, and VEXU with independent rankings and scores.

---

## 🚀 How to Apply Migration

### Option 1: Automatic Migration (Recommended for Production)

The server will automatically handle the migration on startup if using a fresh database. For existing databases, follow Option 2.

### Option 2: Manual Migration (For Existing Production Data)

#### Step 1: Backup Database (CRITICAL!)

**In Railway Dashboard:**
1. Go to your PostgreSQL service
2. Click "Backups" tab
3. Create a manual backup
4. Wait for confirmation

#### Step 2: Run Migration Script

```bash
# From project root
cd src/utils
node runMigration.js 001_add_composite_primary_key.sql
```

**Expected Output:**
```
======================================================================
🔧 Running Migration: 001_add_composite_primary_key.sql
======================================================================

📖 Migration SQL loaded
⏳ Executing migration...

✅ Migration completed successfully!

======================================================================
MIGRATION SUCCESS
======================================================================
```

#### Step 3: Verify Migration

Test that both VRC and VEXIQ data can coexist:

1. Upload a VRC skills file
2. Upload a VEXIQ skills file with same team numbers
3. Search with VRC filter → Should show VRC teams
4. Search with VEXIQ filter → Should show VEXIQ teams

---

## 🔄 Rollback Instructions

**If something goes wrong**, you can rollback:

```bash
cd src/utils
node runMigration.js 001_rollback_composite_primary_key.sql
```

This will:
- Restore the original single-column primary key
- Keep your data intact
- Remove indexes created by the migration

---

## 📊 What Changed

### Database Schema

**Before:**
```sql
CREATE TABLE skills_standings (
    teamNumber TEXT PRIMARY KEY,  -- Single column key
    matchType TEXT DEFAULT 'VRC',
    ...
)
```

**After:**
```sql
CREATE TABLE skills_standings (
    teamNumber TEXT NOT NULL,
    matchType TEXT NOT NULL DEFAULT 'VRC',
    PRIMARY KEY (teamNumber, matchType),  -- Composite key
    ...
)
```

### Upload Logic

**Before:**
```sql
ON CONFLICT (teamNumber) DO UPDATE ...
-- Would overwrite matchType
```

**After:**
```sql
ON CONFLICT (teamNumber, matchType) DO UPDATE ...
-- Only updates matching (teamNumber, matchType) pair
```

---

## ✅ Migration Safety Features

1. **Transaction Wrapper**: All changes in BEGIN...COMMIT block (auto-rollback on error)
2. **Backup Table**: Creates `skills_standings_backup_v1` before changes
3. **Data Verification**: Checks row count before/after migration
4. **Rollback Script**: Ready-to-use rollback SQL
5. **No Data Loss**: Preserves all existing records

---

## 🧪 Testing Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] Search by team number works
- [ ] Filter by match type works
- [ ] Upload VRC file succeeds
- [ ] Upload VEXIQ file succeeds
- [ ] Same team number exists in both VRC and VEXIQ
- [ ] Team details page loads correctly
- [ ] Favorites and compare features work

---

## 📞 Support

If you encounter issues:

1. Check the backup table exists: `SELECT COUNT(*) FROM skills_standings_backup_v1;`
2. Review migration logs above
3. If needed, run rollback script
4. Restore from Railway backup if necessary

---

## 🎯 Success Criteria

Migration is successful when:

✅ Server starts without database errors  
✅ Upload accepts VRC, VEXIQ, and VEXU files  
✅ Search filters work correctly by match type  
✅ Same team numbers can exist in different match types  
✅ All existing data is preserved  


