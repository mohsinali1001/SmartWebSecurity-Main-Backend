# Database Setup Guide

## Quick Setup

1. **Make sure you're in the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the setup script:**
   ```bash
   npm run setup-full-schema
   ```

## Alternative: Run directly with Node

If `npm run setup-full-schema` doesn't work, try:

```bash
node migrations/setupFullSchema.js
```

## Verify Database Connection

Make sure your PostgreSQL database is running and the connection details in `config/db.js` are correct:

- Host: localhost
- Port: 5432
- Database: digitalaxis_db
- User: postgres
- Password: 1234

## Common Issues

### Issue: "Cannot find module"
**Solution:** Make sure you're in the `backend` directory when running the command.

### Issue: "Database connection error"
**Solution:** 
1. Check if PostgreSQL is running
2. Verify database credentials in `config/db.js`
3. Make sure the database `digitalaxis_db` exists

### Issue: "Table already exists"
**Solution:** This is normal if you've run the script before. The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

## Manual SQL Execution

If the script still doesn't work, you can manually run the SQL:

1. Open pgAdmin or psql
2. Connect to your database
3. Run the SQL from `migrations/create_full_schema.sql`

