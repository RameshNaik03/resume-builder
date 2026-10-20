import express from "express";
import { checkResume } from "../controllers/atsController.js";
import { optionalAuth } from "../middleware/auth.js";
import { atsLimiter } from "../middleware/rateLimiter.js";
import { uploadResumeFile } from "../middleware/upload.js";

const router = express.Router();

// Open to everyone. optionalAuth first so the limiter can count logged-in users per account,
// and the limiter before the upload so rejected requests don't even upload the file.
router.post("/check", optionalAuth, atsLimiter, uploadResumeFile, checkResume);

export default router;
