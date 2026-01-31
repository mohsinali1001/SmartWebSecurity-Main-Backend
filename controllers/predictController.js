import pool from "../config/db.js";
import { runModel } from "../model/runModelProxy.js";
import { getIO } from "../socket.js";

// POST /api/predict - Public endpoint (requires API key)
export const predict = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payload = req.body;
    const userId = req.apiUserId;
    const apiKey = req.apiKey;
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = req.originalUrl;

    // Step 1: Create event record
    const eventResult = await client.query(
      `INSERT INTO events (user_id, api_key, payload, ip, endpoint, event_timestamp)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id, event_timestamp`,
      [userId, apiKey, JSON.stringify(payload), ip, endpoint]
    );

    const eventId = eventResult.rows[0].id;
    const eventTimestamp = eventResult.rows[0].event_timestamp;

    // Step 2: Call model service
    const modelResult = await runModel(payload);

    // Extract attack detection info from model result
    const attackDetected = 
      modelResult.prediction === "1" || 
      modelResult.prediction === 1 || 
      modelResult.attack_detected === true ||
      modelResult.attack_detected === "true";

    const riskScore = 
      modelResult.risk_score !== undefined ? modelResult.risk_score :
      modelResult.score !== undefined ? modelResult.score :
      (attackDetected ? 0.8 : 0.2);

    // Step 3: Save prediction linked to event
    const predictionResult = await client.query(
      `INSERT INTO predictions (user_id, event_id, payload, prediction, risk_score, attack_detected, ip, endpoint, prediction_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       RETURNING id, prediction_timestamp, prediction`,
      [
        userId,
        eventId,
        JSON.stringify(payload),
        JSON.stringify(modelResult),
        riskScore,
        attackDetected,
        ip,
        endpoint,
      ]
    );

    await client.query("COMMIT");

    const savedPrediction = predictionResult.rows[0];

    console.log(`✅ Event ${eventId} and Prediction ${savedPrediction.id} saved for user ${userId}`);

    // Emit socket event to user's room
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit("prediction", {
        id: savedPrediction.id,
        event_id: eventId,
        prediction_timestamp: savedPrediction.prediction_timestamp,
        prediction: savedPrediction.prediction,
        attack_detected: attackDetected,
        risk_score: riskScore,
      });
    }

    res.json({
      success: true,
      event_id: eventId,
      prediction_id: savedPrediction.id,
      prediction: modelResult,
      attack_detected: attackDetected,
      risk_score: riskScore,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Prediction error:", error);
    res.status(500).json({ error: error.message || "Prediction failed" });
  } finally {
    client.release();
  }
};

// GET /api/dashboard/overview - Dashboard overview stats
export const getOverview = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log(`📊 getOverview called for user:`, userId);

    if (!userId) {
      console.warn("⚠️  No userId found in req.user");
      return res.status(401).json({ 
        error: "User not authenticated",
        total_predictions: 0,
        total_attacks: 0,
        latest_prediction: null,
        recent_predictions: []
      });
    }

    // Get total predictions
    console.log(`🔍 Fetching total predictions for user ${userId}`);
    const totalResult = await pool.query(
      "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
      [userId]
    );
    const totalPredictions = parseInt(totalResult.rows[0]?.count || 0);
    console.log(`✓ Total predictions: ${totalPredictions}`);

    // Get total attacks (where attack_detected = true)
    console.log(`🔍 Fetching total attacks for user ${userId}`);
    const attacksResult = await pool.query(
      `SELECT COUNT(*) as count FROM predictions 
       WHERE user_id = $1 
       AND attack_detected = true`,
      [userId]
    );
    const totalAttacks = parseInt(attacksResult.rows[0]?.count || 0);
    console.log(`✓ Total attacks: ${totalAttacks}`);

    // Get latest prediction with event details
    console.log(`🔍 Fetching latest prediction for user ${userId}`);
    const latestResult = await pool.query(
      `SELECT p.id, p.event_id, p.prediction_timestamp, p.prediction, p.attack_detected, p.risk_score,
              e.payload as event_payload
       FROM predictions p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.user_id = $1 
       ORDER BY p.prediction_timestamp DESC 
       LIMIT 1`,
      [userId]
    );
    const latestPrediction = latestResult.rows[0] || null;
    console.log(`✓ Latest prediction:`, latestPrediction ? "Found" : "None");

    // Get recent predictions with event details (last 10)
    console.log(`🔍 Fetching recent predictions for user ${userId}`);
    const recentResult = await pool.query(
      `SELECT p.id, p.event_id, p.prediction_timestamp, p.prediction, p.attack_detected, p.risk_score,
              e.payload as event_payload
       FROM predictions p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.user_id = $1 
       ORDER BY p.prediction_timestamp DESC 
       LIMIT 10`,
      [userId]
    );
    console.log(`✓ Recent predictions: ${recentResult.rows.length} records`);

    console.log(`✅ Overview loaded for user ${userId}: ${totalPredictions} predictions, ${totalAttacks} attacks`);

    res.json({
      total_predictions: totalPredictions,
      total_attacks: totalAttacks,
      latest_prediction: latestPrediction,
      recent_predictions: recentResult.rows,
    });
  } catch (error) {
    console.error("❌ Overview error:", {
      message: error.message,
      code: error.code,
      query: error.query,
      params: error.params,
      stack: error.stack
    });
    res.status(500).json({ 
      error: error.message || "Failed to load overview data",
      code: error.code,
      total_predictions: 0,
      total_attacks: 0,
      latest_prediction: null,
      recent_predictions: []
    });
  }
};

// GET /api/dashboard/predictions - Get predictions with filters
export const getPredictions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: "User not authenticated",
        predictions: []
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const since = req.query.since; // ISO timestamp

    let query = `SELECT p.id, p.event_id, p.prediction_timestamp, p.prediction, p.attack_detected, p.risk_score, p.ip, p.endpoint,
                        e.payload as event_payload
                 FROM predictions p
                 LEFT JOIN events e ON p.event_id = e.id
                 WHERE p.user_id = $1`;
    const params = [userId];

    if (since) {
      query += ` AND p.prediction_timestamp >= $2`;
      params.push(since);
      query += ` ORDER BY p.prediction_timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);
    } else {
      query += ` ORDER BY p.prediction_timestamp DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    res.json({ predictions: result.rows });
  } catch (error) {
    console.error("❌ Predictions error:", error.message);
    res.status(500).json({ 
      error: error.message || "Failed to load predictions",
      predictions: []
    });
  }
};

// GET /api/dashboard/events - Get all events for a user
export const getEvents = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: "User not authenticated",
        events: []
      });
    }

    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT e.id, e.user_id, e.api_key, e.event_timestamp, e.payload, e.ip, e.endpoint,
              COUNT(p.id) as prediction_count,
              SUM(CASE WHEN p.attack_detected = true THEN 1 ELSE 0 END) as attacks_detected
       FROM events e
       LEFT JOIN predictions p ON e.id = p.event_id
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.event_timestamp DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error("❌ Events error:", error.message);
    res.status(500).json({ 
      error: error.message || "Failed to load events",
      events: []
    });
  }
};

// GET /api/dashboard/stats - Get user statistics
export const getStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: "User not authenticated",
        total_events: 0,
        total_predictions: 0,
        total_attacks: 0,
        avg_risk_score: 0,
        max_risk_score: 0,
        min_risk_score: 0
      });
    }

    // Get comprehensive statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT p.id) as total_predictions,
        SUM(CASE WHEN p.attack_detected = true THEN 1 ELSE 0 END) as total_attacks,
        AVG(p.risk_score) as avg_risk_score,
        MAX(p.risk_score) as max_risk_score,
        MIN(p.risk_score) as min_risk_score
       FROM events e
       LEFT JOIN predictions p ON e.id = p.event_id
       WHERE e.user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0] || {};

    res.json({
      total_events: parseInt(stats.total_events || 0),
      total_predictions: parseInt(stats.total_predictions || 0),
      total_attacks: parseInt(stats.total_attacks || 0),
      avg_risk_score: parseFloat(stats.avg_risk_score || 0),
      max_risk_score: parseFloat(stats.max_risk_score || 0),
      min_risk_score: parseFloat(stats.min_risk_score || 0),
    });
  } catch (error) {
    console.error("❌ Stats error:", error.message);
    res.status(500).json({ 
      error: error.message || "Failed to load statistics",
      total_events: 0,
      total_predictions: 0,
      total_attacks: 0,
      avg_risk_score: 0,
      max_risk_score: 0,
      min_risk_score: 0
    });
  }
};

