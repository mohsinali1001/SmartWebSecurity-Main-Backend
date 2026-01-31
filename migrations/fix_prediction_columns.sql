-- Final Database Schema Fix
-- This ensures the predictions table has all required columns with correct names

-- Step 1: Rename 'prediction' column to 'prediction_result' if it exists
ALTER TABLE IF EXISTS predictions 
RENAME COLUMN IF EXISTS prediction TO prediction_result;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS prediction_result JSONB;

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN;

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS ip VARCHAR(50);

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(200);

-- Step 3: Ensure all critical columns exist
ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS attack_detected BOOLEAN;

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS risk_score FLOAT;

ALTER TABLE IF EXISTS predictions 
ADD COLUMN IF NOT EXISTS prediction_timestamp TIMESTAMP DEFAULT now();

-- Step 4: Create or verify indexes
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(prediction_timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_attack_detected ON predictions(attack_detected);

-- Step 5: Verify events table structure
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMP DEFAULT now();

ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS ip VARCHAR(50);

ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_api_key ON events(api_key);
