# 🚀 Database Migration Deployment Guide

## Overview

This guide covers deploying the composite primary key migration to production (Railway).

## ⚠️ IMPORTANT: Read Before Deploying

This is a **database schema change**. Follow these steps carefully.

---

## 📋 Pre-Deployment Checklist

- [ ] Read this entire document
- [ ] Backup Railway database (see Step 1)
- [ ] Note current DATABASE_URL setting
- [ ] Have rollback script ready
- [ ] Estimated downtime: 2-3 minutes

---

## 🎯 Deployment Steps

### Step 1: Backup Database (CRITICAL!)

**In Railway Dashboard:**

1. Go to your PostgreSQL service
2. Click **"Backups"** tab
3. Click **"Create Backup"** button
4. Wait for "Backup successful" message
5. ✅ **DO NOT PROCEED without backup**

### Step 2: Deploy Code to Railway

The code is already pushed to GitHub. Railway will automatically detect and deploy.

**What will happen:**
- Railway detects new commit
- Builds Docker image
- Starts new container
- **Server will auto-apply schema changes on startup** (for new databases)

### Step 3: Apply Migration (For Existing Production Database)

**If you have existing production data**, you need to manually run the migration:

#### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migration
railway run node src/utils/runMigration.js 001_add_composite_primary_key.sql
```

#### Option B: Using Railway Dashboard

1. Go to your backend service in Railway
2. Click **"Settings"** → **"Variables"**  
3. Temporarily add: `RUN_MIGRATION=true`
4. The server will detect this and run migration on next startup
5. Remove the variable after successful migration

#### Option C: Manual SQL Execution

1. Connect to Railway PostgreSQL using any PostgreSQL client
2. Copy contents of `src/utils/migrations/001_add_composite_primary_key.sql`
3. Execute the SQL
4. Verify success message

### Step 4: Verify Deployment

1. **Check Railway Logs:**
   - Look for "✅ Database schema initialized successfully"
   - No errors about primary key conflicts

2. **Test API Endpoints:**
   ```bash
   # Health check
   curl https://vexscouting-production.up.railway.app/api/health
   
   # Search test
   curl https://vexscouting-production.up.railway.app/api/search?q=1234&matchType=VRC
   ```

3. **Test Upload:**
   - Login to admin panel
   - Upload a VRC skills file
   - Upload a VEXIQ skills file with same team numbers
   - Verify both appear in search with respective filters

### Step 5: Monitor for 24 Hours

Watch for any issues:
- Search functionality works
- Upload works for all match types
- No duplicate key errors in logs

---

## 🔄 Rollback Procedure (If Needed)

**If something goes wrong:**

### Quick Rollback Steps:

1. **Stop the service** (in Railway dashboard)

2. **Run rollback migration:**
   ```bash
   railway run node src/utils/runMigration.js 001_rollback_composite_primary_key.sql
   ```

3. **Revert code:**
   ```bash
   # On your local machine
   git revert HEAD
   git push origin feature/login
   ```

4. **Restore from backup** (if data corrupted):
   - In Railway PostgreSQL service
   - Go to Backups tab
   - Click "Restore" on the backup you created

5. **Restart service**

---

## ✅ Success Criteria

Migration is successful when:

✅ Railway deployment shows "Live" status  
✅ API health check returns 200 OK  
✅ Search works with matchType filters  
✅ Upload accepts VRC and VEXIQ files  
✅ Same team number exists in both VRC and VEXIQ  
✅ No database errors in Railway logs  

---

## 🎯 What Changed

### Before Migration:
- Team "12345A" can only exist once
- Uploading VEXIQ data overwrites VRC data
- **Data loss issue!**

### After Migration:
- Team "12345A" can exist in VRC, VEXIQ, and VEXU separately
- Each match type has independent data
- No data loss when uploading different match types

---

## 📊 Testing Checklist

After deployment, verify:

### Basic Functionality:
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Search by team number works
- [ ] Filter by match type works

### Upload Testing:
- [ ] Upload VRC skills file succeeds
- [ ] Upload VEXIQ skills file succeeds  
- [ ] Upload VEXU skills file succeeds
- [ ] Same team number in multiple match types

### Search Testing:
- [ ] Search with VRC filter shows only VRC teams
- [ ] Search with VEXIQ filter shows only VEXIQ teams
- [ ] Team detail page loads correctly
- [ ] Favorites feature works
- [ ] Compare feature works

---

## 🆘 Support

### Common Issues:

**Issue**: Migration script fails with "relation does not exist"
- **Solution**: The table hasn't been created yet. Deploy code first, then run migration.

**Issue**: Duplicate key violation
- **Solution**: Old primary key constraint still exists. Run rollback, then migration again.

**Issue**: Data missing after migration
- **Solution**: Restore from backup created in Step 1.

### Need Help?

1. Check Railway deployment logs
2. Review migration logs
3. Verify backup exists
4. Run rollback if needed

---

## 📝 Post-Deployment Notes

After successful deployment:

1. **Keep backup** for at least 7 days
2. **Monitor logs** for any unusual activity
3. **Test thoroughly** with real data
4. **Document any issues** encountered
5. **Update team** on the changes

---

## 🎉 Congratulations!

Once deployed successfully:
- ✅ Your database can now handle multiple match types properly
- ✅ No more data loss when uploading different competition files
- ✅ VRC, VEXIQ, and VEXU teams can coexist with same numbers

**The system is now production-ready for multi-competition support!**


