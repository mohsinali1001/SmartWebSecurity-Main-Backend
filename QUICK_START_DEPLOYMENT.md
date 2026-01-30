# Quick Start - Deploy to GitHub & Railway

## 🚀 TL;DR - Quick Deployment (5 minutes)

### Prerequisites
- [ ] GitHub account
- [ ] Railway account  
- [ ] Git installed
- [ ] Node.js 16+ installed

### Step 1: Prepare Code (Local)
```bash
cd Main/backend

# Verify setup works
npm install
npm run setup-full-schema
npm start

# If everything works, continue...
```

### Step 2: Commit & Push to GitHub
```bash
git add .
git commit -m "refactor: event-based data model for production"
git remote add origin https://github.com/YOUR_USERNAME/digital-axis-main-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Connect Railway to GitHub
1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select your repository
4. Click "Deploy"

### Step 4: Configure Railway Variables
In Railway Dashboard:
```env
DATABASE_URL=<from Railway PostgreSQL plugin>
MODEL_SERVICE_URL=https://smartwebsecurity-ml-production.up.railway.app
JWT_SECRET=<random 32-char string>
PORT=5000
NODE_ENV=production
```

### Step 5: Add PostgreSQL Database
1. Click "Add Service" in Railway
2. Select "PostgreSQL"
3. Wait 2-3 minutes for initialization
4. Copy DATABASE_URL to variables

### Step 6: Wait for Deployment
- Railway builds and deploys automatically
- Check "Deployments" tab for status
- Takes 3-5 minutes total

### Step 7: Verify it Works
```bash
# Get URL from Railway dashboard (e.g., https://project-prod.up.railway.app)
curl https://project-prod.up.railway.app/health

# Test API
curl -X POST https://project-prod.up.railway.app/api/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"network_packet_size": 512}'
```

---

## 📋 Prerequisites Checklist

### Must Have Before Starting
```
✅ GitHub Account - Free at github.com
✅ Railway Account - Free at railway.app (connect to GitHub)
✅ Git Installed - Download from git-scm.com
✅ Node.js 16+ - Download from nodejs.org
✅ Database URL - Will get from Railway PostgreSQL plugin
✅ ML API URL - Already have: https://smartwebsecurity-ml-production.up.railway.app
✅ JWT Secret - Will generate in step 4
```

### Verify Prerequisites
```bash
# Check Git
git --version

# Check Node.js
node --version
npm --version

# Should see versions like:
# git version 2.39.0
# v18.12.0
# 9.1.3
```

---

## ⚠️ Important Before You Deploy

### Code Must Be Ready
- [ ] No hardcoded passwords in code
- [ ] `.env` file is NOT in git (add to `.gitignore`)
- [ ] All files committed: `git status` shows nothing to commit
- [ ] Works locally: `npm start` runs without errors

### Database Must Exist
- [ ] PostgreSQL running locally for testing
- [ ] Can create tables: `npm run setup-full-schema` succeeds
- [ ] Tables appear in database

### Environment Variables Ready
- [ ] `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- [ ] `MODEL_SERVICE_URL` accessible (test with curl)
- [ ] `JWT_SECRET` is random (use: `openssl rand -hex 32`)
- [ ] `CORS_ORIGINS` includes your frontend domain

---

## 🔧 Detailed Prerequisites

### 1. GitHub Account & Repository

**Create GitHub Account:**
- Go to [github.com](https://github.com)
- Sign up (free)
- Verify email

**Create Repository:**
- Click "+" → "New repository"
- Name: `digital-axis-main-backend`
- Description: "Main backend for Digital Axis AI Attack Detector"
- Visibility: Private
- Don't initialize with any files (we have code already)
- Click "Create repository"

**Get Repository URL:**
- Copy HTTPS URL: `https://github.com/USERNAME/digital-axis-main-backend.git`

### 2. Railway Account & Connection

**Create Railway Account:**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub
- Authorize Railway to access your GitHub

**Create New Project:**
- In Railway dashboard: "New Project"
- Select "Deploy from GitHub repo"
- Find and select `digital-axis-main-backend`
- Choose `main` branch
- Click "Deploy"

### 3. PostgreSQL Setup (Local Testing First)

**Install PostgreSQL:**
- Download from [postgresql.org](https://postgresql.org)
- Follow installation wizard
- Remember the password you set!

**Test Connection:**
```bash
psql -U postgres -c "SELECT 1"
```

**Create Test Database:**
```bash
createdb digitalaxis_test
```

### 4. Generate Secrets

**JWT Secret (Random String):**
```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()
```

**Example outputs:**
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

### 5. ML Model API (Already Available)

**No setup needed!** The ML API is already deployed:
```
https://smartwebsecurity-ml-production.up.railway.app
```

**Test it works:**
```bash
curl https://smartwebsecurity-ml-production.up.railway.app/health
```

### 6. CORS Origins Configuration

**For Local Development:**
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**For Production:**
Add your frontend domain:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.com
```

---

## 📝 Environment Variables Reference

### What Each Variable Does

**DATABASE_URL**
- Where the database lives
- Format: `postgresql://user:pass@host:port/database`
- Get from: Railway PostgreSQL plugin

**MODEL_SERVICE_URL**
- Where ML predictions come from
- Already set: `https://smartwebsecurity-ml-production.up.railway.app`
- Must be accessible from Railway

**JWT_SECRET**
- Secret key for authentication
- Must be random (32+ characters)
- Same on all instances (don't change after launch!)

**PORT**
- Which port the server listens on
- Set to: `5000`
- Railway will expose this to internet

**NODE_ENV**
- Set to: `production` (for Railway)
- Set to: `development` (for local)

**CORS_ORIGINS**
- Which domains can access the API
- Comma-separated list
- Must include frontend domain

---

## 🧪 Test Checklist

### Before Pushing to GitHub
```bash
cd Main/backend

# 1. Install dependencies
npm install

# 2. Setup database locally
npm run setup-full-schema

# 3. Start server
npm start

# 4. In another terminal, test API
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "network_packet_size": 512,
    "protocol_type": "TCP"
  }'

# 5. Should see a response (not error)
# If OK, stop server (Ctrl+C) and continue
```

### After Deploying to Railway
```bash
# Get URL from Railway dashboard
PROD_URL="https://your-project-production.up.railway.app"

# 1. Test it's running
curl $PROD_URL/health
# Should get response (or 404, that's OK)

# 2. Test database
railway connect postgres
SELECT COUNT(*) FROM users;
\q

# 3. Check logs
railway logs
# Should see no errors

# 4. Monitor metrics
# In Railway dashboard, view Metrics tab
# Should see activity, no errors
```

---

## ⚡ Common Mistakes to Avoid

### ❌ Don't Do These

```bash
# ❌ Push .env file (it has passwords!)
git add .env
git commit -m "add env"

# Fix: Make sure .env is in .gitignore
echo ".env" >> .gitignore
git rm --cached .env

# ❌ Hardcode database password in code
const password = "mypassword123";

# Fix: Use environment variables
const password = process.env.DATABASE_PASSWORD;

# ❌ Forget to set DATABASE_URL in Railway
# Railway will fail to start

# Fix: Add DATABASE_URL to Railway variables before deploying

# ❌ Use localhost in production
const dbUrl = "localhost:5432"

# Fix: Use environment variable that changes per environment
const dbUrl = process.env.DATABASE_URL;
```

---

## 🆘 If Something Goes Wrong

### Deployment Failed on Railway
1. Check logs: `railway logs`
2. Look for red/error messages
3. Fix in code locally
4. Push new commit: `git push origin main`
5. Railway auto-redeploys

### Database Connection Error
1. Verify `DATABASE_URL` in Railway dashboard
2. Check PostgreSQL plugin is running
3. Wait 5 minutes for full initialization
4. Try again

### API Returns 502 Error
1. Check `railway logs` for error messages
2. Restart service: Railway dashboard → More → Restart
3. Check if `PORT=5000` in variables

### Frontend Can't Connect
1. Check `CORS_ORIGINS` includes frontend URL
2. Clear browser cache (Ctrl+Shift+Delete)
3. Test with curl first: `curl -i $PROD_URL/api/predict`
4. Check CORS headers in response

---

## ✅ After Successful Deployment

You should have:
- ✅ Code on GitHub (main branch)
- ✅ Service running on Railway
- ✅ PostgreSQL database live
- ✅ API responding to requests
- ✅ Dashboard accessible from frontend
- ✅ ML predictions working
- ✅ Data stored in database

---

## 📚 Learn More

For detailed information:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment guide
- **[REFACTOR_CHANGES.md](./REFACTOR_CHANGES.md)** - Technical details
- **[FIX_SUMMARY.md](./FIX_SUMMARY.md)** - What was fixed

---

## 🎯 Next: Follow Deployment Steps

1. Read this entire file
2. Check off all prerequisites
3. Run local tests
4. Follow step-by-step in "TL;DR" section
5. Verify deployment works
6. Connect frontend

**Estimated Time:** 15-30 minutes total

**Good luck! 🚀**
