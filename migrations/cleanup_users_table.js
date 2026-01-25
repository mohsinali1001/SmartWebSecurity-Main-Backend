// Clean up users table - remove duplicate password_hash columns
import pool from "../config/db.js";

async function cleanupUsersTable() {
  try {
    // Get all columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("📋 Current table structure:");
    columnsResult.rows.forEach((row) => {
      console.log(
        `   - "${row.column_name}" (${row.data_type}, nullable: ${row.is_nullable})`
      );
    });

    // Find password_hash columns (including ones with spaces)
    const passwordHashColumns = columnsResult.rows.filter(
      (row) => row.column_name.toLowerCase().trim() === "password_hash"
    );

    console.log(
      `\n🔍 Found ${passwordHashColumns.length} password_hash column(s)`
    );

    if (passwordHashColumns.length > 1) {
      console.log(
        "\n⚠️  Multiple password_hash columns detected. Cleaning up..."
      );

      // Drop the one with spaces (keep the clean one)
      for (const col of passwordHashColumns) {
        if (col.column_name !== "password_hash") {
          // This one has spaces or different casing
          const quotedName = `"${col.column_name}"`;
          console.log(`   Dropping duplicate column: ${quotedName}`);
          await pool.query(`ALTER TABLE users DROP COLUMN ${quotedName};`);
        }
      }
    }

    // Ensure password_hash exists and is correct type
    const finalCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'password_hash';
    `);

    if (finalCheck.rows.length === 0) {
      console.log("\n   Adding password_hash column...");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
      `);
    } else {
      // Make sure it's VARCHAR and can be nullable for now (we'll update existing rows)
      const col = finalCheck.rows[0];
      if (col.data_type !== "character varying") {
        console.log("\n   Converting password_hash to VARCHAR(255)...");
        await pool.query(`
          ALTER TABLE users 
          ALTER COLUMN password_hash TYPE VARCHAR(255);
        `);
      }

      // Remove NOT NULL constraint temporarily if it exists, then add it back
      if (col.is_nullable === "NO") {
        console.log("\n   password_hash is already NOT NULL");
      } else {
        console.log("\n   Setting password_hash to NOT NULL...");
        // First set default for any NULL values
        await pool.query(`
          UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
        `);
        await pool.query(`
          ALTER TABLE users 
          ALTER COLUMN password_hash SET NOT NULL;
        `);
      }
    }

    // Final verification
    const finalResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("\n✅ Final table structure:");
    finalResult.rows.forEach((row) => {
      console.log(
        `   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`
      );
    });

    console.log("\n✅ Database cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning up database:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanupUsersTable();
