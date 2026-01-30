import pool from "./config/db.js";

async function fixDatabase() {
  try {
    console.log("Adding missing columns to predictions table...\n");
    
    await pool.query(`
      ALTER TABLE predictions 
      ADD COLUMN IF NOT EXISTS attack_detected BOOLEAN DEFAULT false
    `);
    console.log("✅ Added attack_detected column");
    
    await pool.query(`
      ALTER TABLE predictions 
      ADD COLUMN IF NOT EXISTS prediction JSONB
    `);
    console.log("✅ Added prediction column");
    
    // Verify columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'predictions' 
      ORDER BY ordinal_position
    `);
    
    console.log("\n✅ Predictions table columns:");
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixDatabase();
