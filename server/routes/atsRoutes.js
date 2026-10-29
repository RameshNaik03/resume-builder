import express from "express";
import { analyzeResume, optimizeResume, rescoreResume, reviewOptimization } from "../controllers/atsController.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { atsLimiter, optimizeLimiter, rescoreLimiter } from "../middleware/rateLimiter.js";
import { uploadResumeFile } from "../middleware/upload.js";

const router = express.Router();

// Open to everyone. optionalAuth first so the limiter can count logged-in users per account,
// and the limiter before the upload so rejected requests don't even upload the file.
router.post("/analyze", optionalAuth, atsLimiter, uploadResumeFile, analyzeResume);

// Logged-in users only: these save to the user's own resumes (JSON body)
router.post("/optimize", protect, optimizeLimiter, optimizeResume);
router.patch("/review/:resumeId", protect, reviewOptimization); // Accept / reject changes, ticked skills
router.post("/rescore/:resumeId", protect, rescoreLimiter, rescoreResume); // Review "Re-score", dashboard "Re-check"

export default router;
