import express from "express";
import { verifyApiKey } from "../middleware/apiKeyMiddleware.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { predict, getOverview, getPredictions, getEvents, getStats } from "../controllers/predictController.js";

const router = express.Router();

// Public prediction endpoint (requires API key)
router.post("/predict", verifyApiKey, predict);

// Dashboard endpoints (require JWT)
router.get("/dashboard/overview", verifyToken, getOverview);
router.get("/dashboard/predictions", verifyToken, getPredictions);
router.get("/dashboard/events", verifyToken, getEvents);
router.get("/dashboard/stats", verifyToken, getStats);

export default router;

