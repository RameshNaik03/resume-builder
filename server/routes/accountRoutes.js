import express from "express";
import {
  changePassword,
  confirmEmailChange,
  deleteAccount,
  exportData,
  logoutAll,
  requestEmailChange,
  updatePreferences,
  updateProfile,
} from "../controllers/accountController.js";
import { protect } from "../middleware/auth.js";
import { accountLimiter, exportLimiter, sensitiveLimiter } from "../middleware/rateLimiter.js";
import { uploadAvatarFile } from "../middleware/upload.js";

const router = express.Router();

// Every account route needs a login (and the limiters count per user, so protect comes first)
router.use(protect);

router.patch("/profile", accountLimiter, uploadAvatarFile, updateProfile);
router.patch("/preferences", accountLimiter, updatePreferences);

// Sensitive: these need the current password (or an emailed token) and are limited harder
router.post("/email", sensitiveLimiter, requestEmailChange);
router.post("/email/confirm", sensitiveLimiter, confirmEmailChange);
router.post("/password", sensitiveLimiter, changePassword);
router.post("/logout-all", sensitiveLimiter, logoutAll);
router.delete("/", sensitiveLimiter, deleteAccount);

router.get("/export", exportLimiter, exportData);

export default router;
