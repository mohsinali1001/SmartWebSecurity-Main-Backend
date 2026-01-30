-- Create users table (update if needed)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  label TEXT,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP NULL
);

-- Create events table to track API calls
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

-- Create predictions table with proper event linking
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  prediction_timestamp TIMESTAMP DEFAULT now(),
  payload JSONB,
  prediction JSONB,
  risk_score FLOAT,
  attack_detected BOOLEAN,
  ip VARCHAR(50),
  endpoint VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_api_key ON events(api_key);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(prediction_timestamp);

