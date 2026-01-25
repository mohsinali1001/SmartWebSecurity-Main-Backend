// Database setup script for full schema
import pool from "../config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupFullSchema() {
  try {
    const sql = readFileSync(join(__dirname, "create_full_schema.sql"), "utf8");
    
    await pool.query(sql);
    console.log("✅ Database schema created/updated successfully!");
    
    // Verify the tables
    const tables = ['users', 'api_keys', 'predictions'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      console.log(`\n📋 ${table} table structure:`);
      result.rows.forEach((row) => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupFullSchema();

