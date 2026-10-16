import express from "express";
import {
  getResumes,
  createResume,
  getResumeById,
  updateResume,
  deleteResume,
  duplicateResume,
} from "../controllers/resumeController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Every resume route requires a logged-in user
router.use(protect);

router.route("/").get(getResumes).post(createResume);
router.route("/:id").get(getResumeById).put(updateResume).delete(deleteResume);
router.post("/:id/duplicate", duplicateResume);

export default router;
