-- Migration: Convert old predictions table to event-based schema
-- This migration creates the events table and restructures predictions

-- Step 1: Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),
  payload JSONB NOT NULL,
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);

-- Step 2: Add missing columns to predictions table if they don't exist
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS risk_score FLOAT;

ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS attack_detected BOOLEAN;

ALTER TABLE predictions 
RENAME COLUMN timestamp TO created_at;

-- Step 3: Add back timestamp column for compatibility
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT now();

-- Step 4: Create missing indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_api_key ON events(api_key);
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);

-- Step 5: Optional - Extract attack_detected from prediction JSONB
-- Uncomment and run if you want to populate attack_detected from existing predictions
/*
UPDATE predictions
SET attack_detected = (
  CASE 
    WHEN prediction->>'prediction' = '1' THEN true
    WHEN prediction->>'attack_detected' = 'true' THEN true
    ELSE false
  END
)
WHERE attack_detected IS NULL;
*/

-- Step 6: Extract risk_score from prediction JSONB if not already set
/*
UPDATE predictions
SET risk_score = CAST(prediction->>'risk_score' AS FLOAT)
WHERE risk_score IS NULL 
  AND prediction->>'risk_score' IS NOT NULL;
*/

-- Step 7: If migrating from API key-only tracking, create events from predictions
-- This creates event records for predictions that don't have event_ids yet
/*
INSERT INTO events (user_id, api_key, timestamp, payload, ip, endpoint, created_at)
SELECT DISTINCT
  p.user_id,
  p.api_key,
  p.timestamp,
  p.payload,
  p.ip,
  p.endpoint,
  p.created_at
FROM predictions p
WHERE p.event_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM events e 
    WHERE e.user_id = p.user_id 
      AND e.api_key = p.api_key 
      AND e.timestamp = p.timestamp
  );
*/

-- Step 8: Link predictions back to events (if needed)
/*
UPDATE predictions p
SET event_id = e.id
FROM events e
WHERE p.event_id IS NULL
  AND p.user_id = e.user_id
  AND p.api_key = e.api_key
  AND ABS(EXTRACT(EPOCH FROM (p.timestamp - e.timestamp))) < 1;
*/
