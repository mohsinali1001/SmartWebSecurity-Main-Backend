// Ensure database schema is up-to-date
import pool from "../config/db.js";

export async function ensureSchema() {
  const client = await pool.connect();
  try {
    console.log("🔄 Ensuring database schema is up-to-date...");

    // 0. Handle column rename: 'prediction' -> 'prediction_result'
    try {
      await client.query(`
        ALTER TABLE IF EXISTS predictions 
        RENAME COLUMN IF EXISTS prediction TO prediction_result;
      `);
      console.log("✓ Renamed 'prediction' column to 'prediction_result'");
    } catch (error) {
      // Column might not exist or might already be renamed, that's fine
      if (!error.message.includes("does not exist")) {
        console.log("ℹ️  Column rename status: column already in correct form");
      }
    }

    // 1. Create users table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log("✓ Users table ready");

    // 2. Create api_keys table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        key TEXT UNIQUE NOT NULL,
        label TEXT,
        created_at TIMESTAMP DEFAULT now(),
        expires_at TIMESTAMP NULL
      );
    `);
    console.log("✓ API keys table ready");

    // 3. Create events table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        api_key TEXT NOT NULL REFERENCES api_keys(key) ON DELETE CASCADE,
        event_timestamp TIMESTAMP DEFAULT now(),
        payload JSONB NOT NULL,
        ip VARCHAR(50),
        endpoint VARCHAR(200),
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log("✓ Events table ready");

    // 3b. Create client_events table if not exists (main event table for predictions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_events (
        id SERIAL PRIMARY KEY,
        "timestamp" TIMESTAMP DEFAULT now(),
        payload JSONB,
        forwarded BOOLEAN DEFAULT false,
        forward_status INTEGER,
        forward_response JSONB,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ Client events table ready");

    // 4. Create predictions table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES client_events(id) ON DELETE CASCADE,
        prediction_timestamp TIMESTAMP DEFAULT now(),
        prediction_result JSONB NOT NULL,
        risk_score FLOAT,
        is_anomaly BOOLEAN,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log("✓ Predictions table ready");

    // 5. Add missing columns to client_events table if needed
    const clientEventsColumns = [
      { name: 'user_id', type: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'payload', type: 'JSONB' },
      { name: 'forwarded', type: 'BOOLEAN DEFAULT false' },
      { name: 'forward_status', type: 'INTEGER' },
      { name: 'forward_response', type: 'JSONB' }
    ];

    for (const col of clientEventsColumns) {
      try {
        await client.query(`
          ALTER TABLE client_events 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
        `);
        console.log(`✓ Column '${col.name}' ensured in client_events table`);
      } catch (error) {
        console.log(`ℹ️  Column '${col.name}' status: already exists or error`);
      }
    }

    // 6. Add missing columns to predictions table if needed
    const columnsToAdd = [
      { name: 'is_anomaly', type: 'BOOLEAN' },
      { name: 'risk_score', type: 'FLOAT' },
      { name: 'prediction_timestamp', type: 'TIMESTAMP DEFAULT now()' },
      { name: 'prediction_result', type: 'JSONB NOT NULL' }
    ];

    for (const col of columnsToAdd) {
      try {
        await client.query(`
          ALTER TABLE predictions 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
        `);
        console.log(`✓ Column '${col.name}' ensured in predictions table`);
      } catch (error) {
        console.log(`ℹ️  Column '${col.name}' status: already exists`);
      }
    }

    // 7. Create indexes for better performance
    const indexes = [
      { name: 'idx_api_keys_user_id', table: 'api_keys', columns: '(user_id)' },
      { name: 'idx_api_keys_key', table: 'api_keys', columns: '(key)' },
      { name: 'idx_events_user_id', table: 'events', columns: '(user_id)' },
      { name: 'idx_events_timestamp', table: 'events', columns: '(event_timestamp)' },
      { name: 'idx_events_api_key', table: 'events', columns: '(api_key)' },
      { name: 'idx_client_events_user_id', table: 'client_events', columns: '(user_id)' },
      { name: 'idx_client_events_timestamp', table: 'client_events', columns: '("timestamp")' },
      { name: 'idx_predictions_user_id', table: 'predictions', columns: '(user_id)' },
      { name: 'idx_predictions_event_id', table: 'predictions', columns: '(event_id)' },
      { name: 'idx_predictions_timestamp', table: 'predictions', columns: '(prediction_timestamp)' }
    ];

    for (const idx of indexes) {
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}${idx.columns};
        `);
        console.log(`✓ Index '${idx.name}' ready`);
      } catch (error) {
        console.log(`ℹ️  Index '${idx.name}' status: already exists`);
      }
    }

    console.log("✅ Database schema is up-to-date!");
    return true;
  } catch (error) {
    console.error("❌ Error ensuring schema:", error);
    throw error;
  } finally {
    client.release();
  }
}
