import { findOwnedResume } from "./resumeController.js";
import { deletePhoto, isPhotoStorageConfigured, savePhoto } from "../services/photoStorage.js";

// Real JPG, PNG and WebP files start with these bytes. Checking them catches files
// that were only renamed (e.g. a PDF saved as photo.jpg).
const looksLikeImage = (buffer, mimetype) => {
  if (mimetype === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
};

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

  if (resume.photoPublicId && isPhotoStorageConfigured()) {
    try {
      await deletePhoto(resume.photoPublicId);
    } catch (error) {
      // Still remove it from the resume; the stored file is harmless and can be cleaned up later
      console.error("Deleting photo from Cloudinary failed:", error.message);
    }
  }

  resume.personalInfo.photoUrl = "";
  resume.photoPublicId = "";
  await resume.save();

  res.json({ photoUrl: "" });
};
