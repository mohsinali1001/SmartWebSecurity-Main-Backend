import dotenv from "dotenv";

dotenv.config();

console.log("🔍 DATABASE CONNECTION TEST");
console.log("=" .repeat(50));

console.log("\n📋 Environment Check:");
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "NOT SET"}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`);
console.log(`PORT: ${process.env.PORT || 5000}`);

if (!process.env.DATABASE_URL) {
  console.error("\n❌ DATABASE_URL is not set in .env");
  console.error("Set it like: DATABASE_URL=postgresql://user:pass@host:port/database");
  process.exit(1);
}

console.log("\n🔗 Attempting to parse DATABASE_URL...");
try {
  const url = new URL(process.env.DATABASE_URL);
  console.log(`   Protocol: ${url.protocol}`);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port}`);
  console.log(`   Database: ${url.pathname?.substring(1)}`);
  console.log(`   User: ${url.username || "default"}`);
} catch (error) {
  console.error(`   ❌ Invalid DATABASE_URL format: ${error.message}`);
  process.exit(1);
}

console.log("\n⏳ Attempting to connect to database...");
console.log("   (This may take up to 10 seconds)...\n");

import("pg").then(async ({ Pool }) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  const timeout = setTimeout(() => {
    console.error("❌ Connection timeout after 10 seconds");
    console.error("   The database host may be unreachable or the credentials are wrong");
    process.exit(1);
  }, 10000);

  try {
    const client = await pool.connect();
    clearTimeout(timeout);
    
    console.log("✅ Connected to PostgreSQL!");
    
    const result = await client.query("SELECT NOW() as time, version()");
    console.log(`   ⏰ Server time: ${result.rows[0].time}`);
    console.log(`   📦 PostgreSQL version: ${result.rows[0].version.split(",")[0]}`);
    
    client.release();
    
    // Check tables
    console.log("\n🔍 Checking tables...");
    const tableResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`   Found ${tableResult.rows.length} tables:`);
    tableResult.rows.forEach(t => {
      console.log(`      - ${t.table_name}`);
    });
    
    // Check predictions table
    console.log("\n🔍 Checking predictions table...");
    const predResult = await pool.query(`
      SELECT COUNT(*) as count FROM predictions
    `);
    console.log(`   Total records: ${predResult.rows[0].count}`);
    
    console.log("\n✅ Database is working correctly!");
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error(`❌ Database Error:`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
      console.error("\n   Issue: Cannot resolve database host");
      console.error("   Check: Is the host name correct in DATABASE_URL?");
    } else if (error.message.includes("password")) {
      console.error("\n   Issue: Database authentication failed");
      console.error("   Check: Are the username/password correct?");
    } else if (error.message.includes("does not exist")) {
      console.error("\n   Issue: Database or user does not exist");
      console.error("   Check: Does the database exist?");
    }
    
    process.exit(1);
  }
}).catch(error => {
  console.error(`❌ Module import error: ${error.message}`);
  process.exit(1);
});
