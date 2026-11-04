import express from "express";
import { analyzeJobDescription, confirmSkill, declineSkill, getJob, listJobs, tailorToJob } from "../controllers/jobController.js";
import { protect } from "../middleware/auth.js";
import { jobAnalyzeLimiter, tailorLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Logged-in users only (JSON bodies)
router.post("/analyze", protect, jobAnalyzeLimiter, analyzeJobDescription); // Read a job description
router.post("/tailor", protect, tailorLimiter, tailorToJob); // A new resume tailored to the job
router.post("/confirm-skill", protect, confirmSkill); // Add a missing skill the user says they have
router.get("/", protect, listJobs); // Past tailored jobs
router.get("/:id", protect, getJob); // One job with its match report
router.post("/:id/decline-skill", protect, declineSkill); // "I don't have this"

export default router;
