import pool from "../config/db.js";

/**
 * UNIFIED ANALYTICS CONTROLLER
 * 
 * ALL queries use prediction_events as single source of truth
 * Ensures data consistency across overview, logs, monitoring, and charts
 * All endpoints enforce user_id scoping via JWT or API key
 */

// GET /api/dashboard/overview - Dashboard overview stats
export const getOverview = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.warn("⚠️  No userId found in request");
      return res.status(401).json({
        error: "User not authenticated",
        total_predictions: 0,
        total_attacks: 0,
        latest_prediction: null,
        recent_predictions: [],
      });
    }

    console.log(`📊 getOverview for user ${userId}`);

    // Get total predictions and attacks (single query, single source)
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_predictions,
        SUM(CASE WHEN prediction_label = 'attack' THEN 1 ELSE 0 END) as total_attacks,
        AVG(confidence_score) as avg_confidence
       FROM prediction_events
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const totalPredictions = parseInt(stats.total_predictions || 0);
    const totalAttacks = parseInt(stats.total_attacks || 0);
    const avgConfidence = parseFloat(stats.avg_confidence || 0);

    console.log(`✓ Total: ${totalPredictions}, Attacks: ${totalAttacks}`);

    // Get latest prediction with full details
    const latestResult = await pool.query(
      `SELECT 
        pe.id,
        pe.prediction_label,
        pe.confidence_score,
        pe.risk_score,
        pe.response_payload,
        pe.created_at,
        ak.label as api_key_label,
        ce.payload as client_event_payload
       FROM prediction_events pe
       LEFT JOIN api_keys ak ON pe.api_key_id = ak.id
       LEFT JOIN client_events ce ON pe.client_event_id = ce.id
       WHERE pe.user_id = $1
       ORDER BY pe.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const latestPrediction = latestResult.rows[0] || null;
    console.log(`✓ Latest prediction: ${latestPrediction ? latestPrediction.id : "None"}`);

    // Get recent predictions (last 10)
    const recentResult = await pool.query(
      `SELECT 
        pe.id,
        pe.prediction_label,
        pe.confidence_score,
        pe.risk_score,
        pe.response_payload,
        pe.created_at,
        ak.label as api_key_label
       FROM prediction_events pe
       LEFT JOIN api_keys ak ON pe.api_key_id = ak.id
       WHERE pe.user_id = $1
       ORDER BY pe.created_at DESC
       LIMIT 10`,
      [userId]
    );

    console.log(`✓ Recent predictions: ${recentResult.rows.length} records`);
    console.log(`✅ Overview loaded successfully`);

    res.json({
      total_predictions: totalPredictions,
      total_attacks: totalAttacks,
      avg_confidence: avgConfidence,
      latest_prediction: latestPrediction,
      recent_predictions: recentResult.rows,
    });
  } catch (error) {
    console.error("❌ Overview error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    res.status(500).json({
      error: error.message || "Failed to load overview data",
      total_predictions: 0,
      total_attacks: 0,
      latest_prediction: null,
      recent_predictions: [],
    });
  }
};

// GET /api/dashboard/logs - Get all predictions/logs
export const getLogs = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
        logs: [],
      });
    }

    console.log(`📋 getLogs for user ${userId}`);

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const since = req.query.since; // ISO timestamp

    // Build query
    let query = `SELECT 
      pe.id,
      pe.prediction_label as status,
      pe.confidence_score as probability,
      pe.risk_score,
      pe.response_payload as prediction,
      pe.created_at as timestamp,
      ak.label as api_key,
      w.domain as website
     FROM prediction_events pe
     LEFT JOIN api_keys ak ON pe.api_key_id = ak.id
     LEFT JOIN websites w ON pe.website_id = w.id
     WHERE pe.user_id = $1`;

    const params = [userId];

    if (since) {
      query += ` AND pe.created_at >= $${params.length + 1}`;
      params.push(since);
    }

    query += ` ORDER BY pe.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    console.log(`✓ Fetched ${result.rows.length} log entries`);

    res.json({
      logs: result.rows,
      total: result.rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("❌ Logs error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to load logs",
      logs: [],
    });
  }
};

// GET /api/dashboard/monitoring - Monitoring/analytics view
export const getMonitoring = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
        status: "unknown",
        metrics: {},
      });
    }

    console.log(`📈 getMonitoring for user ${userId}`);

    // Get current status (latest 24 hours)
    const statusResult = await pool.query(
      `SELECT 
        prediction_label,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
       FROM prediction_events
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY prediction_label`,
      [userId]
    );

    let attackCount = 0;
    let safeCount = 0;
    let avgConfidence = 0;

    statusResult.rows.forEach((row) => {
      avgConfidence = parseFloat(row.avg_confidence) || 0;
      if (row.prediction_label === "attack") {
        attackCount = parseInt(row.count);
      } else if (row.prediction_label === "safe") {
        safeCount = parseInt(row.count);
      }
    });

    const totalLast24h = attackCount + safeCount;
    const attackRate = totalLast24h > 0 ? (attackCount / totalLast24h) * 100 : 0;

    console.log(`✓ Last 24h: ${attackCount} attacks, ${safeCount} safe`);

    // Get hourly distribution
    const hourlyResult = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        prediction_label,
        COUNT(*) as count
       FROM prediction_events
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('hour', created_at), prediction_label
       ORDER BY hour DESC
       LIMIT 168`,  // 7 days of hourly data
      [userId]
    );

    console.log(`✓ Hourly data: ${hourlyResult.rows.length} entries`);

    res.json({
      status: attackRate > 50 ? "warning" : "healthy",
      metrics: {
        attacks_24h: attackCount,
        safe_24h: safeCount,
        attack_rate: attackRate.toFixed(2),
        avg_confidence: avgConfidence.toFixed(2),
      },
      hourly_distribution: hourlyResult.rows,
    });
  } catch (error) {
    console.error("❌ Monitoring error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to load monitoring data",
      status: "error",
      metrics: {},
    });
  }
};

// GET /api/dashboard/chart-data - Chart data endpoint
export const getChartData = async (req, res) => {
  try {
    const userId = req.user?.id;
    const timeRange = req.query.range || "7d"; // 7d, 30d, 90d

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
        chart_data: {},
      });
    }

    console.log(`📊 getChartData for user ${userId}, range: ${timeRange}`);

    // Determine time range
    const intervalMap = {
      "1d": "1 day",
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
    };
    const interval = intervalMap[timeRange] || "7 days";

    // Get data grouped by hour (for 1d) or day (for longer ranges)
    const isShortRange = timeRange === "1d";
    const groupBy = isShortRange ? "hour" : "day";

    const query = `
      SELECT 
        DATE_TRUNC('${groupBy}', created_at) as time_bucket,
        prediction_label,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
      FROM prediction_events
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('${groupBy}', created_at), prediction_label
      ORDER BY time_bucket ASC
    `;

    const result = await pool.query(query, [userId]);
    console.log(`✓ Chart data: ${result.rows.length} entries`);

    // Transform data for frontend
    const chartData = {
      attacks_over_time: [],
      safe_over_time: [],
    };

    result.rows.forEach((row) => {
      const point = {
        time: row.time_bucket,
        count: parseInt(row.count),
        confidence: parseFloat(row.avg_confidence).toFixed(2),
      };

      if (row.prediction_label === "attack") {
        chartData.attacks_over_time.push(point);
      } else {
        chartData.safe_over_time.push(point);
      }
    });

    res.json(chartData);
  } catch (error) {
    console.error("❌ Chart data error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to load chart data",
      chart_data: {},
    });
  }
};

// GET /api/dashboard/predictions - Get predictions with pagination
export const getPredictions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
        predictions: [],
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    console.log(`📋 getPredictions for user ${userId}, page ${page}`);

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM prediction_events WHERE user_id = $1",
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated predictions
    const result = await pool.query(
      `SELECT 
        pe.id,
        pe.prediction_label,
        pe.confidence_score,
        pe.risk_score,
        pe.response_payload,
        pe.created_at,
        ak.label as api_key_label,
        w.domain as website
       FROM prediction_events pe
       LEFT JOIN api_keys ak ON pe.api_key_id = ak.id
       LEFT JOIN websites w ON pe.website_id = w.id
       WHERE pe.user_id = $1
       ORDER BY pe.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    console.log(`✓ Fetched ${result.rows.length} predictions`);

    res.json({
      predictions: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Predictions error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to load predictions",
      predictions: [],
    });
  }
};
