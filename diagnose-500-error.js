#!/usr/bin/env node

/**
 * Complete 500 Error Diagnostic & Fix Guide
 * This script identifies why /api/dashboard/overview returns 500 errors
 */

import pool from "./config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

console.log("\n🔍 DIAGNOSTIC: Dashboard Overview 500 Error Analysis\n");
console.log("=" .repeat(60));

// Test 1: Database Connection
console.log("\n1️⃣  Testing Database Connection...");
try {
  const result = await pool.query("SELECT NOW() as time");
  console.log(`   ✅ Database: Connected`);
  console.log(`   ⏰ Server time: ${result.rows[0].time}`);
} catch (error) {
  console.error(`   ❌ Database Error: ${error.message}`);
  process.exit(1);
}

// Test 2: JWT Configuration
console.log("\n2️⃣  Testing JWT Configuration...");
if (!process.env.JWT_SECRET) {
  console.error(`   ❌ JWT_SECRET is not set in .env`);
  process.exit(1);
} else {
  console.log(`   ✅ JWT_SECRET is configured`);
}

// Test 3: Create a valid token
console.log("\n3️⃣  Creating Test Token...");
const testToken = jwt.sign(
  { id: 1, email: "test@example.com" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);
console.log(`   ✅ Token created: ${testToken.substring(0, 30)}...`);

// Test 4: Decode the token to verify
console.log("\n4️⃣  Verifying Token Decoding...");
try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log(`   ✅ Token decoded successfully`);
  console.log(`   📋 Decoded data:`, JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error(`   ❌ Token decode error: ${error.message}`);
  process.exit(1);
}

// Test 5: Check predictions table structure
console.log("\n5️⃣  Checking Predictions Table Structure...");
try {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'predictions'
    ORDER BY ordinal_position
  `);
  console.log(`   ✅ Found ${result.rows.length} columns:`);
  result.rows.forEach(col => {
    console.log(`      - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
  });
  
  // Check for critical columns
  const columns = result.rows.map(r => r.column_name);
  const required = ['id', 'user_id', 'event_id', 'is_anomaly', 'prediction_result'];
  const missing = required.filter(col => !columns.includes(col));
  
  if (missing.length > 0) {
    console.error(`\n   ❌ MISSING CRITICAL COLUMNS: ${missing.join(", ")}`);
    console.error(`   This is likely causing the 500 error!`);
  } else {
    console.log(`   ✅ All critical columns present`);
  }
} catch (error) {
  console.error(`   ❌ Table structure error: ${error.message}`);
}

// Test 6: Test the actual getOverview query
console.log("\n6️⃣  Testing GetOverview Query (User ID = 1)...");
try {
  const userId = 1;
  
  // Test total count
  const totalResult = await pool.query(
    "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
    [userId]
  );
  console.log(`   ✅ Total predictions count: ${totalResult.rows[0].count}`);
  
  // Test attacks count
  const attacksResult = await pool.query(
    `SELECT COUNT(*) as count FROM predictions WHERE user_id = $1 AND (prediction_result->>'attack_detected')::boolean = true`,
    [userId]
  );
  console.log(`   ✅ Total attacks count: ${attacksResult.rows[0].count}`);
  
  // Test latest prediction join
  const latestResult = await pool.query(
    `SELECT p.id, p.event_id, p.prediction_timestamp, p.prediction_result, 
            (p.prediction_result->>'attack_detected')::boolean as attack_detected, 
            p.risk_score, p.is_anomaly,
            ce.payload as event_payload
     FROM predictions p
     LEFT JOIN client_events ce ON p.event_id = ce.id
     WHERE p.user_id = $1 
     ORDER BY p.prediction_timestamp DESC 
     LIMIT 1`,
    [userId]
  );
  console.log(`   ✅ Latest prediction fetched: ${latestResult.rows.length > 0 ? "Found" : "None"}`);
  
  // Test recent predictions
  const recentResult = await pool.query(
    `SELECT p.id, p.event_id, p.prediction_timestamp, p.prediction_result, 
            (p.prediction_result->>'attack_detected')::boolean as attack_detected, 
            p.risk_score, p.is_anomaly,
            ce.payload as event_payload
     FROM predictions p
     LEFT JOIN client_events ce ON p.event_id = ce.id
     WHERE p.user_id = $1 
     ORDER BY p.prediction_timestamp DESC 
     LIMIT 10`,
    [userId]
  );
  console.log(`   ✅ Recent predictions fetched: ${recentResult.rows.length} records`);
  
  console.log("\n✅ All getOverview queries work correctly!");
} catch (error) {
  console.error(`   ❌ Query error: ${error.message}`);
  console.error(`   Code: ${error.code}`);
  console.error(`   Hint: ${error.hint}`);
  console.error(`   Detail: ${error.detail}`);
}

// Test 7: Check for null/undefined issues in responses
console.log("\n7️⃣  Checking for Data Serialization Issues...");
try {
  const userId = 1;
  const recentResult = await pool.query(
    `SELECT p.id, p.prediction_result, e.payload as event_payload
     FROM predictions p
     LEFT JOIN events e ON p.event_id = e.id
     WHERE p.user_id = $1 LIMIT 1`,
    [userId]
  );
  
  if (recentResult.rows.length > 0) {
    const row = recentResult.rows[0];
    console.log(`   📊 Sample prediction record:`);
    console.log(`      - ID: ${row.id} (${typeof row.id})`);
    console.log(`      - prediction type: ${typeof row.prediction}`);
    console.log(`      - event_payload type: ${typeof row.event_payload}`);
    
    // Try to serialize
    try {
      const json = JSON.stringify(row);
      console.log(`   ✅ Record serializes to JSON successfully`);
    } catch (error) {
      console.error(`   ❌ Serialization error: ${error.message}`);
    }
  }
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`);
}

console.log("\n" + "=".repeat(60));
console.log("✅ Diagnostic Complete\n");

// Print recommendations
console.log("COMMON FIXES FOR 500 ERRORS:");
console.log("1. Ensure attack_detected and prediction columns exist:");
console.log("   ALTER TABLE predictions ADD COLUMN IF NOT EXISTS attack_detected BOOLEAN DEFAULT false;");
console.log("   ALTER TABLE predictions ADD COLUMN IF NOT EXISTS prediction JSONB;");
console.log("\n2. Restart the backend server after database changes");
console.log("\n3. Check Railway logs: https://railway.app -> Select project -> Deployments -> View logs");
console.log("\n4. Verify JWT_SECRET is set in Railway environment variables");
console.log("\n5. Check that the frontend is sending valid tokens");

process.exit(0);
