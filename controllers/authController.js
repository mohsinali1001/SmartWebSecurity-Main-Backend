import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Signup
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );

    res.json({ message: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userResult.rows.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = userResult.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({
      message: "Login success",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
