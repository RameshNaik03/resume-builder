import express from "express";
import { analyzeResume, optimizeResume } from "../controllers/atsController.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { atsLimiter, optimizeLimiter } from "../middleware/rateLimiter.js";
import { uploadResumeFile } from "../middleware/upload.js";

const router = express.Router();

// Open to everyone. optionalAuth first so the limiter can count logged-in users per account,
// and the limiter before the upload so rejected requests don't even upload the file.
router.post("/analyze", optionalAuth, atsLimiter, uploadResumeFile, analyzeResume);

// Logged-in users only: it saves a new resume to their account (JSON body)
router.post("/optimize", protect, optimizeLimiter, optimizeResume);

export default router;
