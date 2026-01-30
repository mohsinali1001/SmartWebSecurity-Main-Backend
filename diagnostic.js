#!/usr/bin/env node

/**
 * Diagnostic script to check database and API status
 */

import pool from "./config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function runDiagnostics() {
  console.log("🔍 Running Diagnostics...\n");
  
  try {
    // 1. Test Database Connection
    console.log("1️⃣  Testing Database Connection...");
    const connTest = await pool.query("SELECT NOW()");
    console.log("   ✅ Database connected successfully");
    console.log(`   Time: ${connTest.rows[0].now}\n`);

    // 2. Check Tables Exist
    console.log("2️⃣  Checking Database Tables...");
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log("   ❌ NO TABLES FOUND! Database is empty.\n");
    } else {
      console.log(`   ✅ Found ${tables.rows.length} tables:`);
      tables.rows.forEach(t => console.log(`      - ${t.table_name}`));
      console.log();
    }

    // 3. Check predictions table structure
    console.log("3️⃣  Checking predictions table structure...");
    try {
      const predictSchema = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'predictions' 
        ORDER BY ordinal_position
      `);
      
      if (predictSchema.rows.length === 0) {
        console.log("   ❌ predictions table doesn't exist!\n");
      } else {
        console.log("   ✅ predictions table columns:");
        predictSchema.rows.forEach(col => {
          console.log(`      - ${col.column_name} (${col.data_type})`);
        });
        console.log();
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }

    // 4. Check events table structure
    console.log("4️⃣  Checking events table structure...");
    try {
      const eventSchema = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        ORDER BY ordinal_position
      `);
      
      if (eventSchema.rows.length === 0) {
        console.log("   ❌ events table doesn't exist!\n");
      } else {
        console.log("   ✅ events table columns:");
        eventSchema.rows.forEach(col => {
          console.log(`      - ${col.column_name} (${col.data_type})`);
        });
        console.log();
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }

    // 5. Check users exist
    console.log("5️⃣  Checking users...");
    try {
      const users = await pool.query("SELECT id, email FROM users LIMIT 5");
      console.log(`   ✅ Found ${users.rows.length} user(s):`);
      users.rows.forEach(u => console.log(`      - ID: ${u.id}, Email: ${u.email}`));
      console.log();
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }

    // 6. Check predictions exist
    console.log("6️⃣  Checking predictions...");
    try {
      const preds = await pool.query("SELECT COUNT(*) as count FROM predictions");
      const count = preds.rows[0].count;
      console.log(`   ✅ Total predictions: ${count}\n`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }

    // 7. Test getOverview logic
    console.log("7️⃣  Testing getOverview query logic...");
    try {
      // Try querying for user 1
      const userId = 1;
      
      const totalResult = await pool.query(
        "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
        [userId]
      );
      const totalPredictions = parseInt(totalResult.rows[0]?.count || 0);
      
      const attacksResult = await pool.query(
        `SELECT COUNT(*) as count FROM predictions 
         WHERE user_id = $1 
         AND attack_detected = true`,
        [userId]
      );
      const totalAttacks = parseInt(attacksResult.rows[0]?.count || 0);
      
      console.log(`   ✅ Query works fine for user ${userId}`);
      console.log(`      - Total predictions: ${totalPredictions}`);
      console.log(`      - Total attacks: ${totalAttacks}\n`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }

    // 8. Check environment variables
    console.log("8️⃣  Checking environment variables...");
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   PORT: ${process.env.PORT || '5000'}`);
    console.log(`   MODEL_SERVICE_URL: ${process.env.MODEL_SERVICE_URL ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   CORS_ORIGINS: ${process.env.CORS_ORIGINS || 'Using defaults'}\n`);

    console.log("✅ Diagnostics complete!\n");
    
  } catch (error) {
    console.error("❌ Critical Error:", error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runDiagnostics();
