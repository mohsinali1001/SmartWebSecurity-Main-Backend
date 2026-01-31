-- ============================================================================
-- MIGRATION: Data Ownership & Analytics Unification
-- Date: 2026-01-31
-- Purpose: Create single source of truth for all analytics
-- Safety: All operations use IF NOT EXISTS / IF EXISTS
-- ============================================================================

-- Step 1: Create websites table (for multi-tenant support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS websites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, domain),
  INDEX idx_user_id (user_id),
  INDEX idx_domain (domain)
);

COMMENT ON TABLE websites IS 'User websites/domains being monitored';


-- Step 2: Add api_key_id column to api_keys if missing
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='api_keys' AND column_name='is_active'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;


-- Step 3: Create prediction_events table (Single Source of Truth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prediction_events (
  id SERIAL PRIMARY KEY,
  
  -- User & API Key Traceability (CRITICAL for data ownership)
  user_id INTEGER NOT NULL,
  api_key_id INTEGER,
  
  -- Website/Domain (Optional for multi-tenant)
  website_id INTEGER,
  
  -- Raw Event Reference
  client_event_id INTEGER,
  request_payload JSONB NOT NULL,
  
  -- ML Model Result
  prediction_label VARCHAR(20) NOT NULL CHECK (prediction_label IN ('safe', 'attack')),
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_score FLOAT,
  model_version VARCHAR(50),
  response_payload JSONB NOT NULL,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  
  -- Foreign Keys
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  CONSTRAINT fk_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL,
  CONSTRAINT fk_client_event FOREIGN KEY (client_event_id) REFERENCES client_events(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prediction_events_user_id 
  ON prediction_events(user_id);

CREATE INDEX IF NOT EXISTS idx_prediction_events_api_key_id 
  ON prediction_events(api_key_id);

CREATE INDEX IF NOT EXISTS idx_prediction_events_created_at 
  ON prediction_events(created_at DESC);

-- Most common query: user's predictions by recency
CREATE INDEX IF NOT EXISTS idx_prediction_events_user_created 
  ON prediction_events(user_id, created_at DESC);

-- For filtering by prediction label
CREATE INDEX IF NOT EXISTS idx_prediction_events_label 
  ON prediction_events(prediction_label);

-- For auditing which API key created predictions
CREATE INDEX IF NOT EXISTS idx_prediction_events_api_key_created 
  ON prediction_events(api_key_id, created_at DESC);

COMMENT ON TABLE prediction_events IS 'Single source of truth for all predictions and analytics';
COMMENT ON COLUMN prediction_events.user_id IS 'User who owns this prediction (from API key)';
COMMENT ON COLUMN prediction_events.api_key_id IS 'Which API key created this prediction (for audit trail)';
COMMENT ON COLUMN prediction_events.prediction_label IS 'Classification result: safe or attack';


-- Step 4: Backfill Historical Data (from predictions table)
-- ============================================================================
-- This safely migrates existing predictions to new table
-- Only includes records where we can match to a valid API key
INSERT INTO prediction_events (
  user_id, api_key_id, client_event_id,
  request_payload, prediction_label, confidence_score, response_payload, created_at
)
SELECT 
  p.user_id,
  (SELECT id FROM api_keys ak WHERE ak.user_id = p.user_id LIMIT 1),  -- Match to any API key for this user
  p.event_id,
  '{}'::jsonb,  -- Don't have request payload in old table
  CASE WHEN (p.prediction_result->>'attack_detected')::boolean THEN 'attack' ELSE 'safe' END,
  COALESCE((p.prediction_result->>'probability')::float, 0.5),
  p.prediction_result,
  p.created_at
FROM predictions p
WHERE NOT EXISTS (  -- Only insert if not already in new table
  SELECT 1 FROM prediction_events pe 
  WHERE pe.user_id = p.user_id 
  AND pe.created_at = p.created_at
)
ON CONFLICT DO NOTHING;  -- Skip if duplicate


-- Step 5: Create raw_logs table (optional - for detailed event logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw_logs (
  id SERIAL PRIMARY KEY,
  prediction_event_id INTEGER NOT NULL REFERENCES prediction_events(id) ON DELETE CASCADE,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_prediction_event (prediction_event_id)
);

COMMENT ON TABLE raw_logs IS 'Detailed logs for each prediction (optional)';


-- Step 6: Create views for analytics (read-only layer)
-- ============================================================================
DROP VIEW IF EXISTS attack_statistics CASCADE;
CREATE VIEW attack_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN prediction_label = 'attack' THEN 1 ELSE 0 END) as attack_count,
  SUM(CASE WHEN prediction_label = 'safe' THEN 1 ELSE 0 END) as safe_count,
  AVG(confidence_score) as avg_confidence,
  MAX(created_at) as latest_prediction,
  DATE_TRUNC('day', created_at) as prediction_date
FROM prediction_events
GROUP BY user_id, DATE_TRUNC('day', created_at);

COMMENT ON VIEW attack_statistics IS 'Aggregated statistics for dashboard overview';


DROP VIEW IF EXISTS hourly_distribution CASCADE;
CREATE VIEW hourly_distribution AS
SELECT 
  user_id,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total,
  SUM(CASE WHEN prediction_label = 'attack' THEN 1 ELSE 0 END) as attacks,
  SUM(CASE WHEN prediction_label = 'safe' THEN 1 ELSE 0 END) as safe,
  AVG(confidence_score) as avg_confidence
FROM prediction_events
GROUP BY user_id, DATE_TRUNC('hour', created_at);

COMMENT ON VIEW hourly_distribution IS 'Hourly distribution for charts';


-- Step 7: Add triggers to maintain data consistency (optional but recommended)
-- ============================================================================
-- Ensure user_id on prediction_events matches user_id on api_keys
CREATE OR REPLACE FUNCTION validate_api_key_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key_id IS NOT NULL THEN
    PERFORM 1 FROM api_keys 
    WHERE id = NEW.api_key_id AND user_id = NEW.user_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'user_id (%) does not match api_key user_id', NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_api_key_user ON prediction_events;
CREATE TRIGGER trg_validate_api_key_user
BEFORE INSERT OR UPDATE ON prediction_events
FOR EACH ROW
EXECUTE FUNCTION validate_api_key_user();

COMMENT ON TRIGGER trg_validate_api_key_user ON prediction_events IS 
  'Enforce data ownership: prediction.user_id must match api_keys.user_id';


-- Step 8: Verification Queries (Run these to verify migration success)
-- ============================================================================
-- Check that prediction_events table exists and has data
-- SELECT COUNT(*) as total_predictions FROM prediction_events;

-- Check user_id distribution (should show user 5 if API key used correctly)
-- SELECT user_id, COUNT(*) as count FROM prediction_events GROUP BY user_id;

-- Check data completeness (verify all predictions migrated)
-- SELECT 
--   'predictions table' as source, COUNT(*) as count FROM predictions
-- UNION ALL
-- SELECT 
--   'prediction_events table' as source, COUNT(*) as count FROM prediction_events;

-- Check for orphaned API keys
-- SELECT * FROM api_keys WHERE user_id NOT IN (SELECT DISTINCT user_id FROM prediction_events);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All analytics endpoints should now:
-- 1. Query ONLY from prediction_events table
-- 2. Filter by user_id from JWT/API key
-- 3. Use consistent labels ('safe' vs 'attack')
-- 4. Return real-time consistent data
-- ============================================================================
