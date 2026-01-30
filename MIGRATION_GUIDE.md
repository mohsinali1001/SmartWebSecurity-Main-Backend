# Main Backend - Database Migration & Deployment Guide

## Overview
The Main backend has been updated to use an **event-based data storage model** aligned with the Client backend architecture. This ensures proper data tracking and fixes deployment loading failures.

## Key Changes

### 1. New Events Table
- Stores all API prediction requests
- Links predictions to the original request payload
- Tracks IP and endpoint information

### 2. Updated Predictions Table
- Now references `events` table via `event_id` (foreign key)
- Added `risk_score` and `attack_detected` columns for easy querying
- Properly indexed for fast lookups

### 3. New Data Flow
```
API Request → Event Created → Model Prediction → Prediction Linked to Event → Stored in DB
```

## Migration Steps for Existing Deployments

### Step 1: Backup Your Database
```bash
# Railway CLI or backup your database manually
pg_dump -h switchback.proxy.rlwy.net -U postgres -d railway > backup.sql
```

### Step 2: Run Migration
Execute the migration script in your database:

```sql
-- From: migrations/migrate_to_event_based_schema.sql
```

### Step 3: Update Environment Variables
Ensure your `.env` file has:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@switchback.proxy.rlwy.net:20289/railway
MODEL_SERVICE_URL=https://smartwebsecurity-ml-production.up.railway.app
JWT_SECRET=your-jwt-secret
PORT=5000
```

## Database Schema

### events table
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB NOT NULL,
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);
```

### predictions table (updated)
```sql
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB,
  prediction JSONB,
  risk_score FLOAT,
  attack_detected BOOLEAN,
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);
```

## API Endpoints

### Public Endpoints
- `POST /api/predict` - Requires API key
  - Creates event, calls model, stores prediction
  - Response includes: `event_id`, `prediction_id`, `attack_detected`, `risk_score`

### Dashboard Endpoints (Authenticated)
- `GET /api/dashboard/overview` - Quick stats and recent predictions
- `GET /api/dashboard/predictions` - Filtered predictions with pagination
- `GET /api/dashboard/events` - All events with prediction counts
- `GET /api/dashboard/stats` - Comprehensive statistics

## Deployment on GitHub

### Step 1: Update Repository
```bash
git add .
git commit -m "Refactor: Update to event-based data model for proper event-prediction linking"
git push origin main
```

### Step 2: Railway Redeployment
1. Go to Railway dashboard
2. Connect to your GitHub repository
3. Deploy from the updated `main` branch
4. The `create_full_schema.sql` will run automatically on deployment

### Step 3: Post-Deployment Verification
```bash
# Test API
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...payload...}'

# Check dashboard
curl -X GET http://localhost:5000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: "event_id foreign key error"
**Solution:** Run the migration script to create the events table first

### Issue: "events table doesn't exist"
**Solution:** Ensure the database initialization runs:
```bash
# Manually run the schema creation
psql -f migrations/create_full_schema.sql
```

### Issue: "Predictions not loading"
**Cause:** Old predictions table without event_id references
**Solution:** Run optional migration steps to create events from old predictions

## Performance Optimizations

The migration includes indexes for:
- `idx_events_user_id` - Fast user event lookups
- `idx_predictions_event_id` - Fast event-prediction associations
- `idx_predictions_user_id` - Fast user prediction lookups
- `idx_predictions_timestamp` - Fast time-range queries

## Rollback Plan (if needed)

```sql
-- Delete events table (will cascade delete predictions)
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Recreate old predictions table
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  api_key TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB,
  prediction JSONB,
  ip VARCHAR(50),
  endpoint VARCHAR(200)
);
```

## Support

For issues or questions:
1. Check the migration script for your specific database version
2. Verify API key and JWT token validity
3. Review logs for foreign key constraint errors
4. Ensure MODEL_SERVICE_URL is accessible

---

✅ **Ready to Deploy!** Follow the steps above to safely migrate and redeploy your backend.
