import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  listKeys,
  createKey,
  regenerateKey,
  deleteKey,
} from "../controllers/apiKeyController.js";

const router = express.Router();

// All routes require JWT authentication
router.use(verifyToken);

router.get("/", listKeys);
router.post("/", createKey);
router.put("/:keyId/regenerate", regenerateKey);
router.delete("/:keyId", deleteKey);

export default router;

