# Database Setup Guide

## Overview
This backend uses an **event-based data model** that tracks API requests as events and links predictions to those events for complete request-response history.

## Quick Setup

1. **Make sure you're in the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` or create `.env` with:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   MODEL_SERVICE_URL=https://your-ml-api-endpoint
   JWT_SECRET=your-jwt-secret
   PORT=5000
   ```

4. **Run the setup script:**
   ```bash
   npm run setup-full-schema
   ```

## Alternative: Run directly with Node

If `npm run setup-full-schema` doesn't work, try:

```bash
node migrations/setupFullSchema.js
```

## Database Schema

### Three Main Tables

**users** - User accounts
- id, email, password_hash, created_at

**events** - API requests
- id, user_id, api_key, timestamp, payload, ip, endpoint

**predictions** - ML predictions linked to events
- id, user_id, event_id, timestamp, payload, prediction, risk_score, attack_detected

### Relationships
```
users (1) ──────→ (many) events ──────→ (many) predictions
          user_id              event_id
```

## Verify Setup

After running the setup, verify the tables exist:

```bash
# Connect to your database
psql -U postgres -d your_database

# Check tables
\dt

# Check events table structure
\d events

# Check predictions table structure
\d predictions
```

## For Production (Railway)

1. Ensure `DATABASE_URL` points to Railway PostgreSQL
2. Set `NODE_ENV=production` in environment
3. Run `npm run setup-full-schema` once after deployment
4. Verify in Railway dashboard that tables were created

## Common Issues

### Issue: "Cannot find module"
**Solution:** Make sure you're in the `backend` directory and have run `npm install`

### Issue: "Database connection error"
**Solution:** 
1. Check if PostgreSQL is running (for local development)
2. Verify `DATABASE_URL` in `.env` file
3. Make sure the database exists and is accessible
4. Check user permissions

### Issue: "Table already exists"
**Solution:** This is normal! The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: "Foreign key constraint failed"
**Solution:** Ensure tables are created in order:
1. users
2. api_keys
3. events
4. predictions

The script handles this automatically.

## Migration from Old Schema

If migrating from the previous schema:

```bash
# Run the migration script
node migrations/setupFullSchema.js

# Or manually run the migration
psql -f migrations/migrate_to_event_based_schema.sql
```

## Manual SQL Execution

If the script fails, you can manually run the SQL:

1. Open pgAdmin or psql terminal
2. Connect to your database
3. Run the SQL from `migrations/create_full_schema.sql`

```bash
psql -U postgres -d your_database -f migrations/create_full_schema.sql
```

## Testing the Connection

After setup, test the connection:

```bash
# Start the backend
npm start

# In another terminal, test the API
curl http://localhost:5000/api/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## For More Information

- See `REFACTOR_CHANGES.md` for details on the event-based model
- See `MIGRATION_GUIDE.md` for step-by-step migration instructions
- See `API_ENDPOINTS.md` for complete API reference


