import pool from "../config/db.js";
import { runModel } from "../model/runModelProxy.js";
import { getIO } from "../socket.js";

// POST /api/predict - Public endpoint (requires API key)
export const predict = async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.apiUserId;
    const apiKey = req.apiKey;

    // Call model service
    const modelResult = await runModel(payload);

    // Save prediction to database
    const result = await pool.query(
      `INSERT INTO predictions (user_id, api_key, payload, prediction, ip, endpoint)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, timestamp, prediction`,
      [
        userId,
        apiKey,
        JSON.stringify(payload),
        JSON.stringify(modelResult),
        req.ip || req.connection.remoteAddress,
        req.originalUrl,
      ]
    );

    const savedPrediction = result.rows[0];

    // Emit socket event to user's room
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit("prediction", {
        id: savedPrediction.id,
        timestamp: savedPrediction.timestamp,
        prediction: savedPrediction.prediction,
      });
    }

    res.json({
      success: true,
      prediction: modelResult,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: error.message || "Prediction failed" });
  }
};

// GET /api/dashboard/overview - Dashboard overview stats
export const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total predictions
    const totalResult = await pool.query(
      "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
      [userId]
    );
    const totalPredictions = parseInt(totalResult.rows[0].count);

    // Get total attacks (where prediction->>'attack_detected' = 'true' or prediction->>'prediction' = '1')
    const attacksResult = await pool.query(
      `SELECT COUNT(*) as count FROM predictions 
       WHERE user_id = $1 
       AND (prediction->>'prediction' = '1' OR prediction->>'attack_detected' = 'true')`,
      [userId]
    );
    const totalAttacks = parseInt(attacksResult.rows[0].count);

    // Get latest prediction
    const latestResult = await pool.query(
      `SELECT id, timestamp, prediction, payload 
       FROM predictions 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [userId]
    );
    const latestPrediction = latestResult.rows[0] || null;

    // Get recent predictions (last 10)
    const recentResult = await pool.query(
      `SELECT id, timestamp, prediction, payload 
       FROM predictions 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 10`,
      [userId]
    );

    res.json({
      total_predictions: totalPredictions,
      total_attacks: totalAttacks,
      latest_prediction: latestPrediction,
      recent_predictions: recentResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/predictions - Get predictions with filters
export const getPredictions = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const since = req.query.since; // ISO timestamp

    let query = `SELECT id, timestamp, prediction, payload, ip, endpoint 
                 FROM predictions 
                 WHERE user_id = $1`;
    const params = [userId];

    if (since) {
      query += ` AND timestamp >= $2`;
      params.push(since);
      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);
    } else {
      query += ` ORDER BY timestamp DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    res.json({ predictions: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

