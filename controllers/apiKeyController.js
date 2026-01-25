import pool from "../config/db.js";
import crypto from "crypto";

// List all API keys for the authenticated user
export const listKeys = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, key, label, created_at, expires_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    // Mask keys (show first 6 chars + ****)
    const maskedKeys = result.rows.map((row) => ({
      ...row,
      key: row.key.substring(0, 6) + "****" + row.key.substring(row.key.length - 4),
      key_masked: true,
    }));

    res.json({ keys: maskedKeys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new API key
export const createKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { label } = req.body;

    // Generate secure random key
    const key = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      "INSERT INTO api_keys (user_id, key, label) VALUES ($1, $2, $3) RETURNING id, key, label, created_at",
      [userId, key, label || null]
    );

    res.status(201).json({
      message: "API key created successfully",
      key: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Regenerate/update API key
export const regenerateKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { keyId } = req.params;

    // Verify key belongs to user
    const existingKey = await pool.query(
      "SELECT id FROM api_keys WHERE id = $1 AND user_id = $2",
      [keyId, userId]
    );

    if (existingKey.rows.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Generate new key
    const newKey = crypto.randomBytes(32).toString("hex");

    // Update the key
    const result = await pool.query(
      "UPDATE api_keys SET key = $1 WHERE id = $2 AND user_id = $3 RETURNING id, key, label, created_at",
      [newKey, keyId, userId]
    );

    res.json({
      message: "API key regenerated successfully",
      key: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete API key
export const deleteKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { keyId } = req.params;

    const result = await pool.query(
      "DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id",
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

