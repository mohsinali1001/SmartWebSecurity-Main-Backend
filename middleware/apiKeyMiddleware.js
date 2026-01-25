import pool from "../config/db.js";

export const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    // Check if key exists and is valid
    const result = await pool.query(
      "SELECT user_id, key, expires_at FROM api_keys WHERE key = $1",
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const keyData = result.rows[0];

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({ error: "API key has expired" });
    }

    req.apiUserId = keyData.user_id;
    req.apiKey = keyData.key;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Error validating API key" });
  }
};

