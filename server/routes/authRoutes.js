import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Rate limited: these are the routes attackers would hammer
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Not rate limited: the app calls this on every page load
router.get("/me", protect, getMe);

export default router;
