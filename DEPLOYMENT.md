# 🚀 VEX Scouting Platform - Production Deployment Guide

This guide will walk you through deploying your VEX Scouting application to production using **Vercel (Frontend) + Railway (Backend + Database)**.

## 📋 Prerequisites

- [ ] GitHub account (for code repository)
- [ ] Vercel account (free tier)
- [ ] Railway account (free $5/month credit)
- [ ] RobotEvents API token
- [ ] Your code pushed to a GitHub repository

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Railway       │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   Next.js App   │    │   Express API   │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ **Step 1: Prepare Your Repository**

### 1.1 Commit and Push Your Code
```bash
# Make sure all changes are committed
git add .
git commit -m "feat: Prepare app for production deployment"
git push origin main
```

### 1.2 Create Production Environment Template
Use the provided `env.template` file to understand what environment variables you'll need.

## 🚂 **Step 2: Deploy Backend to Railway**

### 2.1 Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Verify your email

### 2.2 Deploy Backend Service

1. **Click "New Project"**
2. **Select "Deploy from GitHub repo"**
3. **Choose your VEX Scouting repository**
4. **Configure the service:**
   - **Name**: `vex-scouting-api`
   - **Root Directory**: Leave empty (Railway will auto-detect)
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev` or `node src/api/server.js`

### 2.3 Add PostgreSQL Database

1. **In your Railway project dashboard**
2. **Click "New Service"**
3. **Select "Database" → "PostgreSQL"**
4. **Railway will automatically create the database and provide connection details**

### 2.4 Configure Environment Variables

In your Railway backend service, go to **Variables** tab and add:

```env
# Database (Railway auto-provides DATABASE_URL)
DATABASE_URL=${POSTGRES_URL}

# Server Config
NODE_ENV=production
PORT=3000

# Authentication (CRITICAL - Generate new secure values!)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
JWT_EXPIRES_IN=7d

# Admin Account (Change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecureProductionPassword123!
ADMIN_EMAIL=admin@yourdomain.com

# External APIs
ROBOTEVENTS_API_TOKEN=your-robotevents-api-token
CURRENT_SEASON_ID=190

# CORS (Will be updated after frontend deployment)
FRONTEND_URL=https://your-app-name.vercel.app
```

> 🔐 **Security Note**: Generate a strong JWT secret using: `openssl rand -base64 32`

### 2.5 Deploy Backend

1. **Click "Deploy"** - Railway will build and deploy your backend
2. **Wait for deployment to complete** (usually 2-5 minutes)
3. **Copy your backend URL** (e.g., `https://vex-scouting-api-production.up.railway.app`)

## ▲ **Step 3: Deploy Frontend to Vercel**

### 3.1 Create Vercel Account
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with your GitHub account

### 3.2 Deploy Frontend

1. **Click "New Project"**
2. **Import your GitHub repository**
3. **Configure deployment:**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend-nextjs`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)

### 3.3 Configure Environment Variables

In Vercel project settings, add these environment variables:

```env
# Backend API URL (Replace with your Railway backend URL)
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
```

### 3.4 Deploy Frontend

1. **Click "Deploy"**
2. **Wait for build and deployment** (usually 1-3 minutes)
3. **Copy your frontend URL** (e.g., `https://vex-scouting.vercel.app`)

## 🔧 **Step 4: Update CORS Configuration**

### 4.1 Update Backend Environment Variables

Go back to your **Railway backend service** → **Variables** and update:

```env
FRONTEND_URL=https://your-actual-vercel-app-url.vercel.app
```

### 4.2 Redeploy Backend

Railway will automatically redeploy when you update environment variables.

## ✅ **Step 5: Test Your Deployment**

### 5.1 Basic Functionality Test
1. **Visit your Vercel app URL**
2. **Test team search** (should load data from your database)
3. **Test login** with your admin credentials
4. **Test admin panel access**

### 5.2 API Health Check
Visit: `https://your-railway-backend-url.up.railway.app/api/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

## 🎛️ **Step 6: Post-Deployment Configuration**

### 6.1 Upload Initial Data (Optional)
1. **Login as admin**
2. **Go to Upload page**
3. **Upload your CSV data files**

### 6.2 Create Additional Users
1. **Access Admin Panel** → **User Management**
2. **Create user accounts** for your team

### 6.3 Configure Settings
1. **Admin Panel** → **System Settings**
2. **Update site name, admin email, etc.**

## 📊 **Monitoring & Maintenance**

### Railway Monitoring
- **Dashboard**: Monitor CPU, memory, and database usage
- **Logs**: View application logs for debugging
- **Metrics**: Track request volume and response times

### Vercel Monitoring
- **Analytics**: Monitor page views and performance
- **Functions**: Monitor serverless function executions
- **Deployments**: Track deployment history and status

## 🆓 **Free Tier Limits**

### Vercel Free Tier
- ✅ **100GB Bandwidth/month**
- ✅ **Unlimited personal projects**
- ✅ **Custom domains**
- ✅ **Auto-scaling**

### Railway Free Tier
- ✅ **$5 credit/month** (typically covers small apps)
- ✅ **500 execution hours/month**
- ✅ **Shared CPU/memory**
- ⚠️ **Apps sleep after inactivity** (restarts on request)

## 🚨 **Troubleshooting**

### Common Issues

#### Frontend Can't Connect to Backend
```bash
# Check environment variables
echo $NEXT_PUBLIC_API_URL

# Verify CORS settings in Railway
# Make sure FRONTEND_URL matches your Vercel URL
```

#### Database Connection Issues
```bash
# Check Railway database status
# Verify DATABASE_URL is properly set
# Check connection limits (free tier: 1 concurrent connection)
```

#### Authentication Issues
```bash
# Verify JWT_SECRET is set in Railway
# Check that admin user was created successfully
# Verify frontend is sending tokens correctly
```

## 🔄 **Continuous Deployment**

### Automatic Deployments
Both Vercel and Railway will automatically redeploy when you push to your main branch:

1. **Push code changes**:
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin main
   ```

2. **Automatic deployment triggers**:
   - Vercel rebuilds frontend
   - Railway rebuilds backend

## 🔐 **Security Checklist**

- [ ] Changed default admin password
- [ ] Generated strong JWT secret
- [ ] Updated admin email
- [ ] Configured CORS properly
- [ ] API token stored securely
- [ ] Database uses SSL in production

## 📈 **Scaling Considerations**

### When to Upgrade
- **>10 concurrent users**: Consider Railway Pro ($20/month)
- **>100GB bandwidth**: Consider Vercel Pro ($20/month)
- **High database usage**: Consider dedicated database hosting

### Alternative Hosting Options
- **Backend**: Render, Heroku, DigitalOcean App Platform
- **Database**: Supabase, PlanetScale, Neon
- **Frontend**: Netlify, GitHub Pages

## 🎉 **Congratulations!**

Your VEX Scouting Platform is now live in production! 

**Next Steps:**
1. Share the app URL with your team
2. Monitor usage and performance
3. Gather user feedback
4. Plan feature enhancements

---

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review Railway and Vercel logs
3. Verify environment variables
4. Test locally first

**Happy Scouting!** 🤖🏆 