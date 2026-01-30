import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

// Create a test token for user ID 1
const testToken = jwt.sign(
  { id: 1, email: "245197@aack.au.edu.pk" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

console.log("📋 Testing /api/dashboard/overview endpoint");
console.log(`🔑 Token: ${testToken}\n`);

const options = {
  hostname: "127.0.0.1",
  port: PORT,
  path: "/api/dashboard/overview",
  method: "GET",
  headers: {
    "Authorization": `Bearer ${testToken}`,
    "Content-Type": "application/json"
  }
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    console.log("Response:");
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch {
      console.log(data);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Request error:", error.message);
});

req.end();
