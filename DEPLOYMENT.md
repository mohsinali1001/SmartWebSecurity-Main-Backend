# Main Backend - Deployment Guide for GitHub & Railway

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Plan](#rollback-plan)

---

## 🔧 Prerequisites

### 1. GitHub Account & Repository
- [ ] GitHub account created
- [ ] Repository created for the project
- [ ] Have push access to the repository
- [ ] Git installed on your local machine

**Install Git (if needed):**
```bash
# Windows
choco install git
# or download from https://git-scm.com/

# macOS
brew install git

# Linux
sudo apt-get install git
```

### 2. Railway Account & Setup
- [ ] Railway account created at [railway.app](https://railway.app)
- [ ] Railway CLI installed
- [ ] Connected to GitHub account for deployments

**Install Railway CLI:**
```bash
# macOS/Linux
npm install -g @railway/cli

# Windows
npm install -g @railway/cli
```

**Verify installation:**
```bash
railway --version
```

### 3. PostgreSQL Database
- [ ] PostgreSQL database created on Railway
- [ ] Database URL obtained (format: `postgresql://user:pass@host:port/database`)
- [ ] Database credentials noted safely

**Get Railway Database URL:**
1. Go to Railway dashboard
2. Create new project
3. Add PostgreSQL plugin
4. Copy `DATABASE_URL` from Variables tab

### 4. ML Model API
- [ ] ML model service deployed and running
- [ ] API endpoint URL obtained
- [ ] Model service is publicly accessible
- [ ] Sample request/response tested locally

**Example ML Service URL:**
```
https://smartwebsecurity-ml-production.up.railway.app
```

### 5. Node.js Environment
- [ ] Node.js 16+ installed locally
- [ ] npm or yarn package manager
- [ ] All dependencies can be installed

**Check Node.js version:**
```bash
node --version    # Should be v16.0.0 or higher
npm --version     # Should be v7.0.0 or higher
```

### 6. Environment Secrets
- [ ] JWT Secret generated
- [ ] API keys created for testing
- [ ] CORS origins identified
- [ ] Database credentials secured

**Generate JWT Secret:**
```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[System.Guid]::NewGuid().ToString()
```

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All code committed to Git
- [ ] No hardcoded credentials in code
- [ ] `.env` file is in `.gitignore`
- [ ] `.gitignore` file exists and is correct
- [ ] No console.error calls left in production code

### Database
- [ ] `create_full_schema.sql` contains all table definitions
- [ ] Tables include: `users`, `api_keys`, `events`, `predictions`
- [ ] All foreign keys properly defined
- [ ] Indexes created for performance

### Configuration
- [ ] `.env` file configured locally with test values
- [ ] `DATABASE_URL` format correct
- [ ] `MODEL_SERVICE_URL` is accessible
- [ ] `JWT_SECRET` is strong and random
- [ ] `CORS_ORIGINS` includes frontend URLs
- [ ] `PORT` set to 5000 (default Railway port)

### Dependencies
- [ ] `package.json` has all required packages
- [ ] `package-lock.json` is committed
- [ ] No deprecated packages
- [ ] All imports resolve correctly

**Check dependencies:**
```bash
npm audit              # Check for security issues
npm install --prefer-offline  # Test local installation
```

### Testing
- [ ] Application runs locally: `npm start`
- [ ] Database connection works: `npm run setup-full-schema`
- [ ] API endpoint responds: `curl http://localhost:5000/api/predict`
- [ ] No errors in console output

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Git Repository

```bash
# Navigate to project directory
cd "d:\information security project 3rd Semester\Main"

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Check what will be committed
git status

# Commit changes with descriptive message
git commit -m "feat: refactor to event-based data model for proper event-prediction linking

- Created events table to track API requests
- Updated predictions table with event_id foreign key
- Added risk_score and attack_detected columns
- New endpoints: /dashboard/events, /dashboard/stats
- Improved query performance with indexes
- Migration support for existing databases"
```

### Step 2: Create Remote GitHub Repository

**Option A: Using GitHub Web Interface**
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `digital-axis-main-backend`
3. Description: `Main backend for Digital Axis AI Attack Detector`
4. Visibility: Private (if closed source)
5. Click "Create repository"

**Option B: Using GitHub CLI**
```bash
gh repo create digital-axis-main-backend \
  --private \
  --source=. \
  --remote=origin \
  --push
```

### Step 3: Connect Local Repository to GitHub

```bash
# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/digital-axis-main-backend.git

# Set main as default branch
git branch -M main

# Push code to GitHub
git push -u origin main
```

### Step 4: Connect Railway to GitHub

**In Railway Dashboard:**
1. Click "Create New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select: `YOUR_USERNAME/digital-axis-main-backend`
5. Select `main` branch
6. Click "Deploy"

### Step 5: Configure Environment Variables in Railway

**Add variables in Railway Dashboard:**

1. Go to Project Settings → Variables
2. Add the following:

```env
DATABASE_URL=postgresql://user:password@host:port/database
MODEL_SERVICE_URL=https://smartwebsecurity-ml-production.up.railway.app
JWT_SECRET=<generate-strong-random-string>
PORT=5000
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.com
```

**Database URL from Railway PostgreSQL Plugin:**
- In Railway, the PostgreSQL plugin automatically provides `DATABASE_URL`
- Copy it from the Variables tab

### Step 6: Add PostgreSQL Plugin (if not already added)

1. In Railway Project, click "Add Service"
2. Search for "PostgreSQL"
3. Click "PostgreSQL"
4. Wait for database to initialize (2-3 minutes)
5. Copy `DATABASE_URL` from generated variables

### Step 7: Initialize Database Schema

**Option A: Automatic (Recommended)**
Railway will auto-run `npm start` which connects to the database.

**Option B: Manual Initialization**

1. In Railway dashboard, go to PostgreSQL plugin
2. Open "Connect" tab
3. Copy connection string
4. Run locally:
```bash
psql <CONNECTION_STRING> < backend/migrations/create_full_schema.sql
```

Or add a setup hook in `package.json`:
```json
{
  "scripts": {
    "prestart": "node migrations/setupFullSchema.js",
    "start": "node server.js"
  }
}
```

### Step 8: Deploy

Railway will automatically deploy when you:
- Push to `main` branch on GitHub
- Changes detected in `/backend` directory
- Build process starts

**Monitor deployment:**
1. Go to Railway dashboard
2. Click on your project
3. View "Deployments" tab
4. Watch build logs in real-time

---

## ✔️ Post-Deployment Verification

### 1. Check Deployment Status

```bash
# View deployment logs
railway logs

# Check if service is running
railway status
```

### 2. Test API Endpoints

**Get the deployment URL:**
- From Railway dashboard, copy the URL under your service
- Format: `https://YOUR_PROJECT-production.up.railway.app`

**Test health check:**
```bash
curl https://YOUR_PROJECT-production.up.railway.app/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Test prediction endpoint:**
```bash
curl -X POST https://YOUR_PROJECT-production.up.railway.app/api/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "network_packet_size": 512,
    "protocol_type": "TCP",
    "session_duration": 1800
  }'
```

### 3. Verify Database

**Connect to production database:**
```bash
# Using Railway CLI
railway connect postgres

# Or use connection string
psql postgresql://user:pass@host:port/database
```

**Check tables exist:**
```sql
-- List all tables
\dt

-- Check users table
SELECT COUNT(*) FROM users;

-- Check events table
SELECT COUNT(*) FROM events;

-- Check predictions table
SELECT COUNT(*) FROM predictions;
```

### 4. Check Logs for Errors

```bash
railway logs --service=backend

# Filter for errors
railway logs | grep -i error

# Follow logs in real-time
railway logs --follow
```

### 5. Monitor Performance

**In Railway Dashboard:**
1. View "Metrics" tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Request count
   - Error rate
   - Response time

### 6. Test CORS Configuration

```bash
# Test CORS headers
curl -i https://YOUR_PROJECT-production.up.railway.app/api/predict \
  -H "Origin: https://your-frontend-domain.com"

# Look for Access-Control-Allow-Origin header
```

---

## 🐛 Troubleshooting

### Issue: Database Connection Failed

**Symptoms:**
```
❌ Database connection failed: Error: connect ECONNREFUSED
```

**Solutions:**
1. Verify `DATABASE_URL` is correct in Railway variables
2. Check PostgreSQL plugin is running:
   ```bash
   railway logs --service=postgres
   ```
3. Ensure database credentials are correct
4. Wait for PostgreSQL to fully initialize (5 minutes after creation)

### Issue: Model Service Unreachable

**Symptoms:**
```
Error calling model service: fetch failed
```

**Solutions:**
1. Verify `MODEL_SERVICE_URL` is correct
2. Check if ML service is running
3. Test manually: `curl https://smartwebsecurity-ml-production.up.railway.app`
4. Add error handling for timeout:
   ```javascript
   const timeout = 5000; // 5 seconds
   ```

### Issue: JWT Token Invalid

**Symptoms:**
```
401 Unauthorized: Invalid token
```

**Solutions:**
1. Verify `JWT_SECRET` in Railway matches `config/auth.js`
2. Generate new JWT token with correct secret
3. Check token expiration
4. Ensure Authorization header format: `Bearer TOKEN`

### Issue: Build Fails on Railway

**Symptoms:**
```
Build failed: npm ERR! ...
```

**Solutions:**
1. Check `package.json` syntax is valid
2. Ensure `node_modules` is in `.gitignore`
3. Verify Node.js version: `node --version`
4. Run locally: `npm install && npm start`
5. Check build logs in Railway dashboard

### Issue: CORS Errors in Frontend

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
1. Add frontend URL to `CORS_ORIGINS` in Railway variables:
   ```env
   CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
   ```
2. Redeploy after changing variables
3. Clear browser cache
4. Test with `curl -i` to verify headers

### Issue: 502 Bad Gateway

**Symptoms:**
```
Error 502: Bad Gateway
```

**Solutions:**
1. Check if server is running: `railway logs`
2. Verify port is 5000 in `.env`
3. Check for infinite loops in code
4. Restart service: Railway dashboard → More → Restart

### Issue: Out of Memory

**Symptoms:**
```
JavaScript heap out of memory
```

**Solutions:**
1. Increase Railway resources
2. Add memory limit: `NODE_OPTIONS=--max-old-space-size=512`
3. Check for memory leaks in code
4. Monitor with: `railway metrics`

---

## 🔄 Rollback Plan

### If Deployment Breaks Production

```bash
# View deployment history
railway deployments

# Rollback to previous version
railway rollback <DEPLOYMENT_ID>
```

**Manual Rollback via GitHub:**
```bash
# Revert last commit
git revert HEAD

# Push to trigger new deployment
git push origin main

# Railway will automatically deploy from updated commit
```

**Restore from Backup:**
```bash
# Backup current database
pg_dump <DATABASE_URL> > backup-broken.sql

# Restore from previous backup
psql <DATABASE_URL> < backup-previous.sql
```

---

## 📝 Deployment Checklist Summary

```bash
# Pre-deployment
- [ ] All code committed to Git
- [ ] .env file excluded from repo (.gitignore)
- [ ] package.json dependencies updated
- [ ] npm run setup-full-schema works locally
- [ ] npm start works locally
- [ ] No hardcoded credentials in code

# During deployment
- [ ] GitHub repository created
- [ ] Code pushed to main branch
- [ ] Railway project created
- [ ] PostgreSQL plugin added
- [ ] Environment variables configured
- [ ] Database schema initialized

# Post-deployment
- [ ] API endpoints respond with 200 status
- [ ] Database tables created (SELECT COUNT(*) FROM users)
- [ ] No errors in logs (railway logs)
- [ ] CORS headers present (curl -i)
- [ ] Model service callable
- [ ] JWT tokens work
- [ ] Frontend can connect

# Ongoing
- [ ] Monitor error rates
- [ ] Check database size
- [ ] Review performance metrics
- [ ] Set up alerting for failures
```

---

## 🔗 Useful Commands

```bash
# Railway CLI Commands
railway login                    # Authenticate with Railway
railway list                     # List projects
railway logs                     # View real-time logs
railway metrics                  # View performance metrics
railway connect postgres         # Connect to PostgreSQL
railway status                   # Check service status
railway env                      # View environment variables
railway env VARIABLE_NAME        # View specific variable
railway env:set VARIABLE VALUE   # Set variable

# GitHub Commands
git status                       # Check uncommitted changes
git add .                        # Stage all changes
git commit -m "message"          # Commit changes
git push origin main             # Push to GitHub
git log --oneline               # View commit history
git tag v1.0.0                  # Create version tag
git push origin v1.0.0          # Push tag to GitHub

# Database Commands
psql <DATABASE_URL>             # Connect to database
\dt                             # List tables
SELECT * FROM users;            # Query data
\q                              # Disconnect
pg_dump <URL> > backup.sql      # Backup database
```

---

## 📞 Support & Resources

- **Railway Documentation:** https://docs.railway.app
- **GitHub Guides:** https://guides.github.com
- **Node.js Documentation:** https://nodejs.org/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs

---

## ✨ Next Steps After Deployment

1. **Set up CI/CD:**
   - Add GitHub Actions for automated tests
   - Run linting on push
   - Auto-deploy on merge to main

2. **Set up Monitoring:**
   - Configure Railway alerts
   - Add error tracking (Sentry)
   - Monitor database performance

3. **Set up Backups:**
   - Schedule daily database backups
   - Store backups in secure location
   - Test restore procedure

4. **Document APIs:**
   - Update API documentation
   - Add code examples
   - Document error responses

---

**Last Updated:** January 30, 2026
**Status:** Ready for Production Deployment ✅
