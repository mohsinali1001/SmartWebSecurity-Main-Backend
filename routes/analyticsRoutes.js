/**
 * UNIFIED ANALYTICS ROUTES
 * 
 * All endpoints query prediction_events (single source of truth)
 * All endpoints enforce user scoping via JWT authentication
 */

import express from "express";
import {
  getOverview,
  getLogs,
  getMonitoring,
  getChartData,
  getPredictions,
} from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 All analytics routes require JWT authentication
router.use(verifyToken);

/**
 * GET /api/analytics/overview
 * Dashboard overview: total predictions, attacks, latest prediction, recent predictions
 * Returns: { total_predictions, total_attacks, avg_confidence, latest_prediction, recent_predictions }
 */
router.get("/overview", getOverview);

/**
 * GET /api/analytics/logs
 * Paginated logs of all predictions
 * Query params: limit (default 50), offset (default 0), since (ISO timestamp)
 * Returns: { logs[], total, limit, offset }
 */
router.get("/logs", getLogs);

/**
 * GET /api/analytics/monitoring
 * Monitoring metrics and status
 * Returns: { status, metrics: { attacks_24h, safe_24h, attack_rate, avg_confidence }, hourly_distribution }
 */
router.get("/monitoring", getMonitoring);

/**
 * GET /api/analytics/chart-data
 * Time-series data for dashboard charts
 * Query params: range (1d, 7d, 30d, default 7d)
 * Returns: { attacks_over_time[], safe_over_time[] }
 */
router.get("/chart-data", getChartData);

/**
 * GET /api/analytics/predictions
 * Get predictions with pagination
 * Query params: limit (default 50), page (default 1)
 * Returns: { predictions[], pagination: { total, page, limit, pages } }
 */
router.get("/predictions", getPredictions);

export default router;
