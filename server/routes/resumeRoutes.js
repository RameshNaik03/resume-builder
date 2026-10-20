import express from "express";
import {
  getResumes,
  createResume,
  getResumeById,
  updateResume,
  deleteResume,
  duplicateResume,
} from "../controllers/resumeController.js";
import { importResume } from "../controllers/importController.js";
import { protect } from "../middleware/auth.js";
import { importLimiter } from "../middleware/rateLimiter.js";
import { uploadResumeFile } from "../middleware/upload.js";

const router = express.Router();

// Every resume route requires a logged-in user
router.use(protect);

router.route("/").get(getResumes).post(createResume);
// Rate limit first, so rejected requests don't even upload the file
router.post("/import", importLimiter, uploadResumeFile, importResume);
router.route("/:id").get(getResumeById).put(updateResume).delete(deleteResume);
router.post("/:id/duplicate", duplicateResume);

export default router;
