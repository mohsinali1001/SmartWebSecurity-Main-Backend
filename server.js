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

// Test database connection
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
})();

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
  res.sendFile(path.join(buildPath, "index.html"));
});

// Create HTTP server manually for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

