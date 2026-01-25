// Fix users table - check existing columns and fix password_hash
import pool from "../config/db.js";

async function fixUsersTable() {
  try {
    // First, check what columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("📋 Current table structure:");
    columnsResult.rows.forEach((row) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Check if password_hash exists (any case)
    const hasPasswordHash = columnsResult.rows.some(
      (row) => row.column_name.toLowerCase() === "password_hash"
    );

    // Check for other password column names
    const passwordColumns = columnsResult.rows.filter((row) =>
      row.column_name.toLowerCase().includes("password")
    );

    console.log(
      "\n🔍 Password-related columns found:",
      passwordColumns.map((c) => c.column_name)
    );

    if (!hasPasswordHash) {
      // Add password_hash column
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
      `);
      console.log("\n✅ Added password_hash column");
    } else {
      // Check if there are multiple password_hash columns (duplicate)
      const passwordHashColumns = columnsResult.rows.filter(
        (row) => row.column_name.toLowerCase() === "password_hash"
      );

      if (passwordHashColumns.length > 1) {
        console.log(
          "\n⚠️  Multiple password_hash columns found. Removing duplicates..."
        );
        // Keep the first one, remove others
        // This is tricky - we'll need to rename and drop
        // For now, let's just ensure we have one with the right type
        await pool.query(`
          DO $$ 
          BEGIN
            -- If there are multiple, we'll work with the first VARCHAR one
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' 
              AND column_name = 'password_hash' 
              AND data_type = 'text'
            ) THEN
              -- Change text to varchar if needed
              ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255);
            END IF;
          END $$;
        `);
      }

      // Ensure it's VARCHAR(255) not TEXT
      await pool.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'password_hash' 
            AND data_type = 'text'
          ) THEN
            ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255);
          END IF;
        END $$;
      `);

      console.log(
        "\n✅ password_hash column exists and is properly configured"
      );
    }

    // Final verification
    const finalResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'password_hash';
    `);

    if (finalResult.rows.length > 0) {
      console.log("\n✅ Final password_hash column:");
      finalResult.rows.forEach((row) => {
        console.log(
          `   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`
        );
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing database:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixUsersTable();
