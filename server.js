// server.js
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import { initSocket } from "./socket.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173"]; // Default fallback for development

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/apikeys", apiKeyRoutes);
app.use("/api", predictRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running!");
});

// Create HTTP server manually for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

