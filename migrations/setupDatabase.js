// Database setup script
import pool from "../config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    const sql = readFileSync(join(__dirname, "create_users_table.sql"), "utf8");

    await pool.query(sql);
    console.log("✅ Database table 'users' created/updated successfully!");

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Users table structure:");
    result.rows.forEach((row) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    process.exit(1);
  }
}

setupDatabase();
