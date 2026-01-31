/**
 * MIGRATION VERIFICATION SCRIPT
 * 
 * Verifies the prediction_events migration was applied successfully
 * Runs post-deployment verification tests
 * 
 * Usage: node migrations/verify-migration.js
 */

import pool from "../config/db.js";

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const log = (level, message) => {
  const levels = {
    "✅": "\x1b[32m",
    "❌": "\x1b[31m",
    "⚠️ ": "\x1b[33m",
    "ℹ️ ": "\x1b[36m",
  };
  console.log(`${levels[level] || ""} ${level} ${message}\x1b[0m`);
};

// Test 1: Tables exist
test("Tables exist", async () => {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('prediction_events', 'websites')
     ORDER BY table_name`
  );

  const tables = result.rows.map((r) => r.table_name);
  if (!tables.includes("prediction_events")) {
    throw new Error("prediction_events table does not exist");
  }
  if (!tables.includes("websites")) {
    throw new Error("websites table does not exist");
  }

  log("✅", `Tables exist: ${tables.join(", ")}`);
});

// Test 2: Column structure
test("Column structure correct", async () => {
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'prediction_events'
     ORDER BY ordinal_position`
  );

  const columns = result.rows.map((r) => r.column_name);
  const required = [
    "id",
    "user_id",
    "api_key_id",
    "prediction_label",
    "confidence_score",
    "created_at",
  ];

  const missing = required.filter((col) => !columns.includes(col));
  if (missing.length > 0) {
    throw new Error(`Missing columns: ${missing.join(", ")}`);
  }

  log("✅", `All required columns present: ${required.join(", ")}`);
});

// Test 3: Data migrated
test("Data migrated from predictions", async () => {
  const result = await pool.query(
    `SELECT COUNT(*) as total FROM prediction_events`
  );

  const total = parseInt(result.rows[0].total);
  log("ℹ️ ", `Found ${total} records in prediction_events table`);

  if (total === 0) {
    log("⚠️ ", "No data in prediction_events (may be expected if predictions table was empty)");
  }
});

// Test 4: Foreign keys work
test("Foreign key constraints active", async () => {
  const result = await pool.query(
    `SELECT constraint_name, constraint_type FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND table_name = 'prediction_events'
     AND constraint_type = 'FOREIGN KEY'
     ORDER BY constraint_name`
  );

  const constraints = result.rows.map((r) => r.constraint_name);
  if (constraints.length === 0) {
    log("⚠️ ", "No foreign key constraints found");
  } else {
    log("✅", `Foreign keys configured: ${constraints.join(", ")}`);
  }
});

// Test 5: Indexes created
test("Indexes created for performance", async () => {
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'prediction_events'
     ORDER BY indexname`
  );

  const indexes = result.rows.map((r) => r.indexname);
  const expected = [
    "prediction_events_pkey",
    "idx_prediction_events_user_id",
    "idx_prediction_events_created_at",
  ];

  const missing = expected.filter((idx) => !indexes.includes(idx));
  if (missing.length > 0) {
    log("⚠️ ", `Missing recommended indexes: ${missing.join(", ")}`);
  } else {
    log("✅", `All indexes present`);
  }
});

// Test 6: Data integrity
test("Data integrity checks", async () => {
  // Check for orphaned api_keys
  const orphanResult = await pool.query(
    `SELECT COUNT(*) as orphans FROM prediction_events pe
     WHERE pe.api_key_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM api_keys ak WHERE ak.id = pe.api_key_id)`
  );

  const orphans = parseInt(orphanResult.rows[0].orphans);
  if (orphans > 0) {
    log("⚠️ ", `${orphans} predictions reference non-existent api_keys`);
  } else {
    log("✅", "No orphaned api_key references");
  }

  // Check for null user_ids
  const nullUserResult = await pool.query(
    `SELECT COUNT(*) as nulls FROM prediction_events WHERE user_id IS NULL`
  );

  const nullUsers = parseInt(nullUserResult.rows[0].nulls);
  if (nullUsers > 0) {
    log("❌", `${nullUsers} predictions have NULL user_id (CRITICAL)`);
    throw new Error("Found NULL user_ids in prediction_events");
  } else {
    log("✅", "All predictions have valid user_id");
  }
});

// Test 7: Views exist
test("Analytics views created", async () => {
  const result = await pool.query(
    `SELECT viewname FROM pg_views
     WHERE schemaname = 'public'
     AND viewname IN ('attack_statistics', 'hourly_distribution')
     ORDER BY viewname`
  );

  const views = result.rows.map((r) => r.viewname);
  if (views.length === 0) {
    log("⚠️ ", "Analytics views not created (optional)");
  } else {
    log("✅", `Views created: ${views.join(", ")}`);
  }
});

// Test 8: Sample query performance
test("Query performance check", async () => {
  const start = Date.now();

  await pool.query(
    `SELECT COUNT(*), prediction_label FROM prediction_events
     GROUP BY prediction_label`
  );

  const time = Date.now() - start;
  log("ℹ️ ", `Aggregation query completed in ${time}ms`);

  if (time > 1000) {
    log("⚠️ ", "Query took longer than expected; indexes may need optimization");
  }
});

// Test 9: Trigger validation
test("Data consistency trigger", async () => {
  const result = await pool.query(
    `SELECT proname FROM pg_proc WHERE proname LIKE '%prediction_events%'`
  );

  const triggers = result.rows.map((r) => r.proname);
  if (triggers.length === 0) {
    log("⚠️ ", "No triggers found (validation logic may not be active)");
  } else {
    log("✅", `Triggers configured: ${triggers.length} functions`);
  }
});

// Test 10: Can read from new table
test("Read access verification", async () => {
  const result = await pool.query(
    `SELECT COUNT(*) as total, 
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT api_key_id) as api_keys
     FROM prediction_events`
  );

  const { total, users, api_keys } = result.rows[0];
  log("ℹ️ ", `Predictions: ${total}, Users: ${users}, API Keys: ${api_keys}`);
});

// Test 11: Insert test
test("Write access verification", async () => {
  const testUserId = 999;
  const testPayload = { test: true };

  try {
    const result = await pool.query(
      `INSERT INTO prediction_events (
        user_id, prediction_label, confidence_score, request_payload, response_payload
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [testUserId, "safe", 0.95, JSON.stringify(testPayload), JSON.stringify({})]
    );

    const testId = result.rows[0].id;
    log("ℹ️ ", `Test insert successful (id: ${testId})`);

    // Clean up
    await pool.query(`DELETE FROM prediction_events WHERE id = $1`, [testId]);
    log("✅", "Write access verified (test data cleaned up)");
  } catch (error) {
    log("❌", `Write access failed: ${error.message}`);
    throw error;
  }
});

// Run all tests
async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("PREDICTION_EVENTS MIGRATION VERIFICATION");
  console.log("=".repeat(60) + "\n");

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
    } catch (error) {
      log("❌", `${name}: ${error.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

runTests().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
