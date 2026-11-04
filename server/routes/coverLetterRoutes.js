import express from "express";
import {
  createCoverLetter,
  deleteCoverLetter,
  generateCoverLetter,
  getCoverLetter,
  listCoverLetters,
  regenerateCoverLetter,
  updateCoverLetter,
} from "../controllers/coverLetterController.js";
import { protect } from "../middleware/auth.js";
import { coverLetterLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Logged-in users only; every letter, resume and job must be the user's own
router.use(protect);

router.post("/generate", coverLetterLimiter, generateCoverLetter); // Write one for a job
router.post("/:id/regenerate", coverLetterLimiter, regenerateCoverLetter); // Rewrite its body
router.route("/").get(listCoverLetters).post(createCoverLetter);
router.route("/:id").get(getCoverLetter).put(updateCoverLetter).delete(deleteCoverLetter);

export default router;
