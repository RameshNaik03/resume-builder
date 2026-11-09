import { findOwnedResume } from "./resumeController.js";
import { deletePhotosOrQueue, isPhotoStorageConfigured, looksLikeImage, savePhoto } from "../services/photoStorage.js";

const requireStorage = (res) => {
  if (!isPhotoStorageConfigured()) {
    res.status(503);
    throw new Error("Photo uploads aren't set up on this server yet (the Cloudinary keys are missing).");
  }
};

// POST /api/resumes/:id/photo (multipart/form-data with a "photo" field)
export const uploadPhoto = async (req, res) => {
  requireStorage(res);
  const resume = await findOwnedResume(req, res);

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a JPG, PNG or WebP image in a form field named "photo"');
  }
  if (!looksLikeImage(req.file.buffer, req.file.mimetype)) {
    res.status(415);
    throw new Error("This file isn't a valid JPG, PNG or WebP image.");
  }

  let photo;
  try {
    photo = await savePhoto(resume._id, req.file.buffer, req.file.mimetype);
  } catch (error) {
    console.error("Photo upload to Cloudinary failed:", error.message);
    res.status(502);
    throw new Error("We couldn't upload your photo right now. Please try again.");
  }

  // Only the photo fields are changed, so an autosave running at the same time can't undo this
  resume.personalInfo.photoUrl = photo.url;
  resume.photoPublicId = photo.publicId;
  await resume.save();

  res.json({ photoUrl: photo.url });
};

// DELETE /api/resumes/:id/photo
export const removePhoto = async (req, res) => {
  const resume = await findOwnedResume(req, res);

  // Still removed from the resume if Cloudinary fails (the deletion is then retried later)
  if (resume.photoPublicId) await deletePhotosOrQueue([resume.photoPublicId]);

  resume.personalInfo.photoUrl = "";
  resume.photoPublicId = "";
  await resume.save();

  res.json({ photoUrl: "" });
};
