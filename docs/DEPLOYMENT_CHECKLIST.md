# 🚀 Production Deployment Checklist

## ✅ **Pre-Deployment Setup**

- [ ] All code committed and pushed to GitHub
- [ ] RobotEvents API token ready
- [ ] Generated strong JWT secret (`openssl rand -base64 32`)
- [ ] Railway account created
- [ ] Vercel account created

## 🚂 **Railway Backend Deployment**

- [ ] Create new Railway project
- [ ] Deploy from GitHub repository
- [ ] Add PostgreSQL database service
- [ ] Configure environment variables:
  - [ ] `DATABASE_URL` (auto-provided)
  - [ ] `NODE_ENV=production`
  - [ ] `JWT_SECRET` (strong secret)
  - [ ] `ROBOTEVENTS_API_TOKEN`
  - [ ] `ADMIN_USERNAME` & `ADMIN_PASSWORD` (change defaults!)
  - [ ] `ADMIN_EMAIL`
  - [ ] `CURRENT_SEASON_ID=190`
- [ ] Backend deployment successful
- [ ] Copy backend URL

## ▲ **Vercel Frontend Deployment**

- [ ] Import GitHub repository to Vercel
- [ ] Set root directory to `frontend-nextjs`
- [ ] Configure environment variables:
  - [ ] `NEXT_PUBLIC_API_URL` (Railway backend URL)
- [ ] Frontend deployment successful
- [ ] Copy frontend URL

## 🔧 **Post-Deployment Configuration**

- [ ] Update Railway `FRONTEND_URL` with Vercel URL
- [ ] Test API health check: `{backend-url}/api/health`
- [ ] Test frontend loads correctly
- [ ] Test login with admin credentials
- [ ] Test admin panel access
- [ ] Upload initial data (optional)

## 🧪 **Testing Checklist**

- [ ] Homepage loads and search works
- [ ] Team details pages load
- [ ] Events section displays correctly
- [ ] Favorites functionality works
- [ ] Compare functionality works
- [ ] Login/logout works
- [ ] Admin panel accessible
- [ ] User management works
- [ ] Data upload works (admin only)

## 🔐 **Security Checklist**

- [ ] Changed default admin password
- [ ] JWT secret is strong and secure
- [ ] CORS configured properly
- [ ] API tokens secured (not exposed in frontend)
- [ ] Database uses SSL in production

## 📊 **Monitoring Setup**

- [ ] Check Railway dashboard for metrics
- [ ] Check Vercel analytics for usage
- [ ] Monitor application logs
- [ ] Set up alerts (optional)

## 🎉 **Go Live**

- [ ] Share app URL with team
- [ ] Document login credentials for users
- [ ] Monitor first user sessions
- [ ] Gather feedback

---

## 🆘 **Quick Troubleshooting**

### Frontend can't connect to backend
```bash
# Check Vercel environment variables
NEXT_PUBLIC_API_URL should match Railway backend URL

# Check Railway CORS settings
FRONTEND_URL should match Vercel frontend URL
```

### Database connection issues
```bash
# Check Railway database service status
# Verify DATABASE_URL is set correctly
# Free tier has limited concurrent connections
```

### Authentication not working
```bash
# Verify JWT_SECRET is set in Railway
# Check admin user creation in logs
# Verify token is being sent from frontend
```

---

## 📱 **Your Deployment URLs**

Backend (Railway): `https://_____.up.railway.app`  
Frontend (Vercel): `https://_____.vercel.app`

**Default Admin Credentials**:  
Username: `admin`  
Password: (what you set in Railway environment)

---

✅ **Deployment Complete!** 🎊 