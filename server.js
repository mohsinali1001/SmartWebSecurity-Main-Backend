// server.js
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import { initSocket } from "./socket.js";
import { ensureSchema } from "./migrations/ensure_schema.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"]; // Default fallback for development

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📨 ${timestamp} ${req.method} ${req.path}`);
  console.log(`   IP: ${req.ip}`);
  console.log(`   Headers:`, {
    authorization: req.headers.authorization ? "Present" : "Missing",
    contentType: req.headers["content-type"],
    origin: req.headers.origin,
  });
  next();
});

// Test database connection
console.log("🔍 Testing database connection...");
try {
  await pool.query("SELECT 1");
  console.log("✅ Database connected successfully");
} catch (error) {
  console.error("❌ Database connection failed:", error.message);
}

// Ensure database schema is up-to-date
try {
  await ensureSchema();
} catch (error) {
  console.error("❌ Schema setup error:", error.message);
  console.error("   Server may have issues with database operations");
}

// API Routes (MUST come before static file serving)
app.use("/api/auth", authRoutes);
app.use("/api/apikeys", apiKeyRoutes);
app.use("/api", predictRoutes);

// Serve static files from React build folder
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

// SPA Fallback: All non-API routes return index.html for React Router
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  const indexPath = path.join(buildPath, "index.html");
  try {
    res.sendFile(indexPath);
  } catch (error) {
    console.error(`Error serving index.html from ${indexPath}:`, error.message);
    res.status(404).json({ error: "Frontend not found" });
  }
});

// Create HTTP server manually for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server with error handling
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`   Try: http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("❌ Server error:", error.message);
  if (error.code === "EADDRINUSE") {
    console.error(`   Port ${PORT} is already in use!`);
  }
  process.exit(1);
});

