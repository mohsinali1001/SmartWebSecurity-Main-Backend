import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Optional: log successful connection once
pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

// Optional: log errors
pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
  process.exit(1);
});

export default pool;
