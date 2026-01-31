/**
 * PREDICTION EVENTS SERVICE
 * 
 * Core service for handling predictions using the unified prediction_events table
 * Ensures data ownership and real-time consistency
 * 
 * Usage:
 * - createPrediction(userId, apiKeyId, payload) → Returns prediction with id
 * - emits WebSocket event to user-specific namespace: `prediction:created`
 * - enforces user_id → api_key_id chain validation
 */

import pool from "../config/db.js";
import { runModel } from "../model/runModelProxy.js";

export const createPredictionEvent = async (
  userId,
  apiKeyId,
  clientEventId,
  websiteId,
  payload,
  io
) => {
  const client = await pool.connect();

  try {
    console.log(`🔮 Creating prediction for user_id=${userId}, api_key_id=${apiKeyId}`);

    // 1. RUN ML MODEL
    const modelResponse = await runModel(payload);
    const predictionLabel = modelResponse.prediction === 1 ? "attack" : "safe";
    const confidenceScore = modelResponse.confidence || 0.5;
    const riskScore = modelResponse.risk_score || null;

    console.log(`✓ Model output: ${predictionLabel} (confidence: ${confidenceScore})`);

    // 2. VALIDATE API KEY TO USER MAPPING
    const keyValidation = await client.query(
      `SELECT user_id FROM api_keys WHERE id = $1 AND user_id = $2`,
      [apiKeyId, userId]
    );

    if (keyValidation.rows.length === 0) {
      throw new Error(
        `❌ SECURITY: API key ${apiKeyId} does not belong to user ${userId}`
      );
    }

    console.log(`✓ API key validation passed`);

    // 3. INSERT INTO prediction_events
    const insertResult = await client.query(
      `INSERT INTO prediction_events (
        user_id,
        api_key_id,
        website_id,
        client_event_id,
        request_payload,
        prediction_label,
        confidence_score,
        risk_score,
        response_payload,
        model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at, prediction_label, confidence_score, risk_score, response_payload`,
      [
        userId,
        apiKeyId,
        websiteId || null,
        clientEventId || null,
        JSON.stringify(payload),
        predictionLabel,
        confidenceScore,
        riskScore,
        JSON.stringify(modelResponse),
        "1.0",
      ]
    );

    const prediction = insertResult.rows[0];
    console.log(`✅ Prediction created: id=${prediction.id}`);

    // 4. BROADCAST REAL-TIME UPDATE (to user-specific namespace only)
    if (io) {
      console.log(`📡 Broadcasting to user_${userId}`);
      io.to(`user_${userId}`).emit("prediction:created", {
        id: prediction.id,
        label: prediction.prediction_label,
        confidence: prediction.confidence_score,
        risk: prediction.risk_score,
        created_at: prediction.created_at,
      });
    }

    return prediction;
  } catch (error) {
    console.error("❌ Prediction creation error:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all predictions for a user (with optional filters)
 */
export const getUserPredictions = async (userId, filters = {}) => {
  try {
    const { limit = 50, offset = 0, since, until } = filters;

    let query = `
      SELECT 
        pe.id,
        pe.prediction_label,
        pe.confidence_score,
        pe.risk_score,
        pe.request_payload,
        pe.response_payload,
        pe.created_at,
        ak.label as api_key_label,
        w.domain as website
      FROM prediction_events pe
      LEFT JOIN api_keys ak ON pe.api_key_id = ak.id
      LEFT JOIN websites w ON pe.website_id = w.id
      WHERE pe.user_id = $1
    `;

    const params = [userId];

    if (since) {
      params.push(since);
      query += ` AND pe.created_at >= $${params.length}`;
    }

    if (until) {
      params.push(until);
      query += ` AND pe.created_at <= $${params.length}`;
    }

    query += ` ORDER BY pe.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("❌ Get predictions error:", error.message);
    throw error;
  }
};

/**
 * Get prediction statistics for a user
 */
export const getPredictionStats = async (userId, timeRange = "24h") => {
  try {
    const interval =
      timeRange === "24h"
        ? "1 day"
        : timeRange === "7d"
          ? "7 days"
          : "30 days";

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN prediction_label = 'attack' THEN 1 ELSE 0 END) as attacks,
        SUM(CASE WHEN prediction_label = 'safe' THEN 1 ELSE 0 END) as safe,
        AVG(confidence_score) as avg_confidence,
        MAX(confidence_score) as max_confidence,
        MIN(confidence_score) as min_confidence
       FROM prediction_events
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error("❌ Get stats error:", error.message);
    throw error;
  }
};

/**
 * Verify API key → User mapping (for security audits)
 */
export const verifyKeyOwnership = async (apiKeyId, userId) => {
  try {
    const result = await pool.query(
      `SELECT user_id FROM api_keys WHERE id = $1`,
      [apiKeyId]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: "Key not found" };
    }

    const keyUserId = result.rows[0].user_id;
    const valid = keyUserId === userId;

    return {
      valid,
      reason: valid ? "OK" : `Key belongs to user_id=${keyUserId}, not ${userId}`,
      keyUserId,
    };
  } catch (error) {
    console.error("❌ Verify ownership error:", error.message);
    throw error;
  }
};
