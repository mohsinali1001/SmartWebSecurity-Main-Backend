import pool from "../config/db.js";

export const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    // Check if key exists and is active
    const result = await pool.query(
      `SELECT id, user_id, key, expires_at, is_active 
       FROM api_keys 
       WHERE key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const keyData = result.rows[0];

    // Check if key is active
    if (!keyData.is_active) {
      return res.status(401).json({ error: "API key is deactivated" });
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({ error: "API key has expired" });
    }

    // 🔐 SECURITY: Extract user_id from api_keys table, never from request
    req.apiKeyId = keyData.id;
    req.apiUserId = keyData.user_id;
    req.apiKey = keyData.key;
    
    console.log(`✅ API key ${apiKey.substring(0, 8)}... validated for user_id=${keyData.user_id}`);
    next();
  } catch (error) {
    console.error("❌ API key validation error:", error.message);
    return res.status(500).json({ error: "Error validating API key" });
  }
};

