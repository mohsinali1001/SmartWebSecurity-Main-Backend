# 🔧 Troubleshooting: "Failed to Load Overview Data"

## Common Causes & Solutions

### Issue 1: JWT Token Not Valid ⚠️ (Most Common)

**Symptoms:**
- Overview loads blank
- Network tab shows 401 Unauthorized
- Error message: "Invalid or expired token"

**Solution:**

1. **Check if you're logged in:**
   - Make sure you have a valid JWT token from login
   - Token should be in `localStorage` under key like `token` or `jwt`

2. **Test the token:**
   ```bash
   # Get your token from frontend (DevTools Console)
   localStorage.getItem('token')
   
   # Test with curl
   curl http://localhost:5000/api/dashboard/overview \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **If you don't have a token:**
   - Go to login page
   - Enter credentials
   - Wait for token to be created
   - Then try accessing dashboard

### Issue 2: JWT_SECRET Mismatch Between Frontend & Backend ⚠️

**Symptoms:**
- Token works locally but not on Railway
- Different JWT_SECRET in .env vs Railway variables
- Frontend generated token with one secret, backend validates with another

**Solution:**

1. **Check Railway environment variables:**
   - Go to Railway dashboard
   - Select your project
   - Go to Variables tab
   - Verify `JWT_SECRET` is set

2. **Make sure it matches:**
   - Frontend and backend must use SAME JWT_SECRET
   - Generate new tokens after changing JWT_SECRET

3. **Set JWT_SECRET in .env:**
   ```env
   JWT_SECRET=your-32-character-random-string
   ```

### Issue 3: CORS Blocking the Request ⚠️

**Symptoms:**
- Network tab shows CORS error
- Error: "Access to XMLHttpRequest blocked by CORS policy"
- Frontend can't connect to backend API

**Solution:**

1. **Add frontend domain to CORS_ORIGINS:**
   ```env
   # Local development
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   
   # Production
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.com
   ```

2. **Update in Railway:**
   - Go to Railway Variables
   - Update `CORS_ORIGINS`
   - Redeploy or restart service

3. **Test CORS:**
   ```bash
   curl -i http://localhost:5000/api/dashboard/overview \
     -H "Authorization: Bearer TOKEN" \
     -H "Origin: http://localhost:3000"
   
   # Should see: Access-Control-Allow-Origin header in response
   ```

### Issue 4: Database Connection Failed ⚠️

**Symptoms:**
- Error: "Connection refused" or "ECONNREFUSED"
- Database is not responding
- Local database not running or crashed

**Solution:**

1. **Check if PostgreSQL is running:**
   ```bash
   # Windows: Check Services
   # macOS: Check postgres status
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Verify DATABASE_URL:**
   ```env
   # Format should be:
   # postgresql://user:password@host:port/database
   DATABASE_URL=postgresql://postgres:password@localhost:5432/railway
   ```

3. **Test database connection:**
   ```bash
   psql <DATABASE_URL>
   SELECT 1;
   \q
   ```

4. **If Railway deployment:**
   - Check PostgreSQL plugin is running
   - Wait 5 minutes for full initialization
   - Check service logs for connection errors

### Issue 5: No User Data (Empty Dashboard is Normal)

**Symptoms:**
- Overview loads but shows:
  - `total_predictions: 0`
  - `total_attacks: 0`
  - `latest_prediction: null`
  - `recent_predictions: []`

**Solution:**
- This is NORMAL for new user!
- Create a test event/prediction:
  ```bash
  curl -X POST http://localhost:5000/api/predict \
    -H "Authorization: Bearer API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"network_packet_size": 512}'
  ```
- Then refresh dashboard

### Issue 6: Server Not Running

**Symptoms:**
- Error: "Connection refused" to localhost:5000
- Frontend can't reach backend at all
- Network error in browser console

**Solution:**

1. **Start the server:**
   ```bash
   cd Main/backend
   npm start
   ```

2. **Verify it started:**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Check for startup errors:**
   - Look at console output
   - Check for `Error` messages
   - Verify port 5000 is free

---

## 🔍 Diagnostic Steps

### Step 1: Check Frontend Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click on `/api/dashboard/overview` request
4. Check:
   - **Status Code:** Should be 200
   - **Response:** Should be JSON with data
   - **Headers:** Should have `Authorization: Bearer TOKEN`

### Step 2: Check Backend Logs
```bash
# If running locally
# Look at console output for errors
# Watch for: ❌ prefix in logs

# If on Railway
railway logs --service=backend
# Watch for errors starting with ❌
```

### Step 3: Test API Directly
```bash
# Get a valid JWT token first
# From frontend: localStorage.getItem('token')

# Then test
curl -X GET http://localhost:5000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_ACTUAL_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# Check for:
# - Status 200 (success) or 401 (auth failed)
# - Response body with prediction data
# - Error message if failure
```

### Step 4: Check Database
```bash
psql <DATABASE_URL>

-- Check user exists
SELECT * FROM users LIMIT 1;

-- Check predictions exist
SELECT COUNT(*) FROM predictions;

-- Check events exist
SELECT COUNT(*) FROM events;

\q
```

---

## 🧪 Verification Checklist

```
✅ JWT_SECRET same in .env and Railway
✅ CORS_ORIGINS includes frontend domain
✅ Frontend has valid JWT token (not expired)
✅ Backend is running (npm start)
✅ Database is connected (PostgreSQL running)
✅ User is logged in on frontend
✅ Network tab shows 200 status code
✅ Backend logs show no errors
✅ Database has at least one user record
```

---

## 📝 Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "No token provided" | Missing Authorization header | Add token to header |
| "Invalid or expired token" | Bad JWT_SECRET or expired token | Regenerate token or check SECRET |
| "CORS error" | Frontend not in CORS_ORIGINS | Add domain to CORS_ORIGINS |
| "Connection refused" | Database not running | Start PostgreSQL |
| "user_id is undefined" | User not authenticated | Login first |
| "column X does not exist" | Database schema not initialized | Run `npm run setup-full-schema` |
| "Empty dashboard" | No predictions yet | Create a test prediction |

---

## 🆘 Still Stuck?

### Check These Files

1. **`.env` file:**
   - JWT_SECRET is set
   - DATABASE_URL is correct format
   - CORS_ORIGINS includes your domain

2. **`server.js`:**
   - Server listening on correct port
   - CORS middleware configured
   - Database imported correctly

3. **`controllers/predictController.js`:**
   - getOverview function has error handling
   - Query syntax is correct
   - User authentication checked

### Enable Debug Logging

Add this to see more details:

```javascript
// In predictController.js getOverview function
console.log('🔍 DEBUG: userId=', userId);
console.log('🔍 DEBUG: totalResult=', totalResult.rows);
console.log('🔍 DEBUG: recentResult=', recentResult.rows);
```

Then run and check output.

---

## 📞 Need More Help?

1. Check `DEPLOYMENT.md` troubleshooting section
2. Review `DATABASE_FIX_COMPLETE.md`
3. Check error messages in:
   - Browser DevTools Console
   - Browser Network tab
   - Terminal where npm start runs
   - Railway logs (if deployed)

---

**Status: All Error Handling Improved** ✅

The backend now returns helpful error messages and default values when overview fails, making it easier to debug the real issue!
