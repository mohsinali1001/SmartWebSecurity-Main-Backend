import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`🔐 Auth check for ${req.method} ${req.path}`);
    console.log(`   Authorization header:`, authHeader ? "Present" : "Missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`⚠️  Invalid auth header format`);
      return res.status(401).json({ error: "No token provided" });
    }

    if (!process.env.JWT_SECRET) {
      console.error(`❌ JWT_SECRET not configured`);
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }

    const token = authHeader.split(" ")[1];
    console.log(`   Token:`, token ? `${token.substring(0, 20)}...` : "Missing");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ Token verified for user:`, decoded.id);
    
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    console.error(`❌ Token verification failed:`, error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

