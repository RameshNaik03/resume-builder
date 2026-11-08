import express from "express";
import {
  getResumes,
  createResume,
  getResumeById,
  updateResume,
  deleteResume,
  deleteManyResumes,
  duplicateResume,
  getOriginal,
  getOriginalPreview,
} from "../controllers/resumeController.js";
import { importResume } from "../controllers/importController.js";
import { removePhoto, uploadPhoto } from "../controllers/photoController.js";
import { protect } from "../middleware/auth.js";
import { importLimiter, photoLimiter } from "../middleware/rateLimiter.js";
import { uploadPhotoFile, uploadResumeFile } from "../middleware/upload.js";

const router = express.Router();

// Every resume route requires a logged-in user
router.use(protect);

router.route("/").get(getResumes).post(createResume);
// Rate limit first, so rejected requests don't even upload the file
router.post("/import", importLimiter, uploadResumeFile, importResume);
router.post("/delete-many", deleteManyResumes); // Bulk delete (dashboard): resumes and whole applications
router.route("/:id").get(getResumeById).put(updateResume).delete(deleteResume);
router.post("/:id/duplicate", duplicateResume);
router.get("/:id/original", getOriginal); // The uploaded file, unchanged (owner only)
router.get("/:id/original/preview", getOriginalPreview); // A DOCX original as HTML
router.route("/:id/photo").post(photoLimiter, uploadPhotoFile, uploadPhoto).delete(removePhoto);

export default router;
