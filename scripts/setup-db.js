import dotenv from "dotenv";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

// Parse DATABASE_URL if provided
let dbConfig = {};
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1), // Remove leading '/'
  };
}

const DB_NAME = process.env.MAIN_DB_NAME || process.env.PGDATABASE || dbConfig.database || "digitalaxis_db";
const ADMIN_DB = process.env.PGADMIN_DB || "postgres";
const PGUSER = process.env.PGUSER || process.env.DB_USER || dbConfig.user;
const PGPASSWORD = process.env.PGPASSWORD || process.env.DB_PASSWORD || dbConfig.password;
const PGHOST = process.env.PGHOST || process.env.DB_HOST || dbConfig.host;
const PGPORT = Number(process.env.PGPORT || process.env.DB_PORT || dbConfig.port || "5432");

// Validate required configuration
if (!PGUSER || !PGPASSWORD || !PGHOST) {
  console.error("❌ Missing required database configuration in .env file");
  console.error("   Please set DATABASE_URL or individual DB_* environment variables");
  process.exit(1);
}

async function ensureDatabase() {
  const adminPool = new Pool({
    user: PGUSER,
    host: PGHOST,
    database: ADMIN_DB,
    password: PGPASSWORD,
    port: PGPORT,
  });

  try {
    const exists = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
    if (exists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database '${DB_NAME}' created`);
    } else {
      console.log(`ℹ️ Database '${DB_NAME}' already exists`);
    }
  } finally {
    await adminPool.end();
  }
}

async function applySchema() {
  const appPool = new Pool({
    user: PGUSER,
    host: PGHOST,
    database: DB_NAME,
    password: PGPASSWORD,
    port: PGPORT,
  });

  try {
    const schemaSql = readFileSync(join(__dirname, "..", "migrations", "create_full_schema.sql"), "utf8");
    await appPool.query(schemaSql);
    console.log("✅ Schema applied to main database");
  } finally {
    await appPool.end();
  }
}

async function main() {
  try {
    await ensureDatabase();
    await applySchema();
    console.log("🎉 Main database ready");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to set up main database:", error);
    process.exit(1);
  }
}

main();
