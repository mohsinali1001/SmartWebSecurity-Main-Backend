# Main Backend - Event-Based Model Refactor

## 📋 Summary of Changes

The Main backend has been completely refactored to align with the Client backend's **event-based data model**. This fixes the deployment data loading failures and enables proper event-prediction linking.

### Problems Fixed ✅
1. **Data Loading Failures** - Events now stored and retrievable from database
2. **Orphaned Predictions** - Predictions now properly linked to events via `event_id`
3. **Missing Event History** - Complete request/response history preserved
4. **Query Performance** - New indexes enable fast lookups by user, event, and timestamp

## 🗂️ Database Architecture

### Old Schema ❌
```
API Request
    ↓
Model Prediction
    ↓
Store in predictions table (with api_key only)
    ❌ Lost original request data
    ❌ No event tracking
```

### New Schema ✅
```
API Request
    ↓
Create event record
    ↓
Call model prediction
    ↓
Store prediction linked to event
    ✅ Complete request-response history
    ✅ Event traceable to user
    ✅ Prediction linked to event
```

## 📊 New Tables & Schema

### events Table
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  api_key TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB NOT NULL,        -- Original request
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);
```

### predictions Table (Enhanced)
```sql
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),  -- 🆕 Links to event
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB,
  prediction JSONB,
  risk_score FLOAT,               -- 🆕 Extracted from model
  attack_detected BOOLEAN,        -- 🆕 Easy querying
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);
```

## 🔗 Relationships

```
users (id) 
  ↓ 1-to-Many
events (user_id)
  ↓ 1-to-Many
predictions (event_id)
```

**Query Example:**
```sql
-- Get all predictions for a user with event details
SELECT p.*, e.payload as event_payload
FROM predictions p
JOIN events e ON p.event_id = e.id
WHERE p.user_id = 1
ORDER BY p.timestamp DESC;
```

## 🚀 Updated Endpoints

### POST /api/predict
**Now returns:**
```json
{
  "success": true,
  "event_id": 123,           // 🆕 Links to events table
  "prediction_id": 456,      // 🆕 Links to predictions table
  "prediction": {...},
  "attack_detected": true,   // 🆕 Direct boolean
  "risk_score": 0.85        // 🆕 Direct number
}
```

### GET /api/dashboard/overview
**Enhanced with:**
- Event payload alongside predictions
- Boolean `attack_detected` field
- Calculated risk scores

### GET /api/dashboard/events (NEW)
**Returns:**
```json
{
  "events": [
    {
      "id": 123,
      "user_id": 1,
      "timestamp": "2024-01-30T...",
      "payload": {...},
      "prediction_count": 1,
      "attacks_detected": 1
    }
  ]
}
```

### GET /api/dashboard/stats (NEW)
**Returns:**
```json
{
  "total_events": 150,
  "total_predictions": 150,
  "total_attacks": 25,
  "avg_risk_score": 0.42,
  "max_risk_score": 0.98,
  "min_risk_score": 0.10
}
```

## 🔧 Modified Files

### controllers/predictController.js
- ✅ `predict()` - Now creates event, then prediction
- ✅ `getOverview()` - Includes event payloads
- ✅ `getPredictions()` - JOINs with events table
- ✅ `getEvents()` - NEW endpoint
- ✅ `getStats()` - NEW endpoint

### routes/predictRoutes.js
- ✅ Added `/dashboard/events` route
- ✅ Added `/dashboard/stats` route

### migrations/create_full_schema.sql
- ✅ Added `events` table definition
- ✅ Updated `predictions` table with `event_id`
- ✅ Added performance indexes

### migrations/migrate_to_event_based_schema.sql (NEW)
- ✅ Safe migration for existing databases
- ✅ Optional: Backfill events from old predictions
- ✅ Optional: Link predictions to events

## 📈 Performance Improvements

### New Indexes
```sql
idx_events_user_id        -- Fast event lookup by user
idx_events_timestamp      -- Fast time-range queries
idx_events_api_key        -- Fast API key tracking
idx_predictions_event_id  -- Fast event-prediction associations
```

### Query Performance
- **Before:** Filter predictions only by user
- **After:** Filter predictions by user, event, timestamp, attack status
- **Result:** Dashboard loads faster, more accurate filtering

## 🔄 Migration Path

### For New Deployments
1. Clone repository with updated code
2. Deploy to Railway
3. `create_full_schema.sql` runs automatically
4. Ready to use ✅

### For Existing Deployments
1. Run migration script:
   ```bash
   node migrations/setupFullSchema.js
   ```
2. Or manually run:
   ```bash
   psql < migrations/migrate_to_event_based_schema.sql
   ```
3. Verify tables:
   ```bash
   SELECT COUNT(*) FROM events;
   SELECT COUNT(*) FROM predictions;
   ```

## ✨ Data Flow Example

### 1. API Request
```json
POST /api/predict
{
  "network_packet_size": 512,
  "protocol_type": "TCP",
  "session_duration": 1800
}
```

### 2. Event Created
```
INSERT INTO events (user_id, api_key, payload, ip, endpoint)
  VALUE (1, 'abc...xyz', {...}, '192.168.1.1', '/api/predict')
  RETURNING id → 123
```

### 3. Model Prediction Called
```
ML API returns:
{
  "prediction": 1,
  "risk_score": 0.85,
  "attack_detected": true
}
```

### 4. Prediction Stored
```
INSERT INTO predictions (user_id, event_id, payload, prediction, risk_score, attack_detected)
  VALUES (1, 123, {...}, {...}, 0.85, true)
  RETURNING id → 456
```

### 5. Response to Client
```json
{
  "success": true,
  "event_id": 123,
  "prediction_id": 456,
  "attack_detected": true,
  "risk_score": 0.85
}
```

## 🧪 Testing the Migration

### Test Event Creation
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "network_packet_size": 512,
    "protocol_type": "TCP"
  }'
```

### Test Dashboard Overview
```bash
curl http://localhost:5000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Events Endpoint
```bash
curl http://localhost:5000/api/dashboard/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Statistics
```bash
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Troubleshooting

### Issue: "event_id references non-existent event"
**Cause:** Predictions created before events table existed
**Solution:** Run migration script to create events table

### Issue: "Column event_id doesn't exist"
**Cause:** Old schema still in use
**Solution:**
```bash
node migrations/setupFullSchema.js
```

### Issue: "Foreign key constraint failed"
**Cause:** Trying to insert prediction without valid event_id
**Solution:** Ensure event is created first (already handled in updated code)

## 📝 Deployment Checklist

- [ ] Pull latest code from GitHub
- [ ] Run database setup: `npm run setup-full-schema`
- [ ] Verify DATABASE_URL in .env
- [ ] Test `/api/predict` endpoint
- [ ] Test `/api/dashboard/overview`
- [ ] Check logs for any errors
- [ ] Monitor predictions in database
- [ ] Confirm data appears in dashboard

## 🔗 Related Documentation

- See `MIGRATION_GUIDE.md` for step-by-step migration
- See `Client/COMPLETE_CHANGES_DOCUMENTATION.md` for Client backend changes
- See `API_ENDPOINTS.md` for complete API reference

## ✅ Ready to Deploy!

All changes are backward-compatible. Existing API keys and users will work seamlessly with the new event-based system.

```bash
git add .
git commit -m "Refactor: Update to event-based data model for proper event-prediction linking"
git push origin main
```

Deploy with confidence! 🚀
