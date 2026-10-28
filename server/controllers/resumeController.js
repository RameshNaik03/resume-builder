import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import { copyPhoto, deletePhoto, isPhotoStorageConfigured } from "../services/photoStorage.js";

// Personal info fields the client may change. The photo URL isn't one of them:
// it's only set by the photo routes (see photoController.js).
const PERSONAL_INFO_FIELDS = ["fullName", "headline", "email", "phone", "location", "linkedin", "github"];

// Only these fields can be set from the request body.
// userId, _id and timestamps are never taken from the client.
const EDITABLE_FIELDS = [
  "title",
  "template",
  "personalInfo",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "additional",
  "design",
];

// Copies only the editable fields out of the request body
// (and only the editable personal info fields, so photoUrl can't be set from here)
const pickEditableFields = (body = {}) => {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.personalInfo && typeof data.personalInfo === "object") {
    const info = {};
    for (const field of PERSONAL_INFO_FIELDS) {
      if (data.personalInfo[field] !== undefined) info[field] = data.personalInfo[field];
    }
    data.personalInfo = info;
  }
  return data;
};

// Finds a resume by id that belongs to the logged-in user, or throws a 404.
// We use 404 (not 403) for other users' resumes so we don't reveal that they exist.
// Also used by the photo routes.
export const findOwnedResume = async (req, res) => {
  const { id } = req.params;

  // A malformed id can't match any resume, so treat it as "not found"
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(404);
    throw new Error("Resume not found");
  }

  const resume = await Resume.findOne({ _id: id, userId: req.user._id });
  if (!resume) {
    res.status(404);
    throw new Error("Resume not found");
  }

  return resume;
};

// GET /api/resumes
export const getResumes = async (req, res) => {
  const resumes = await Resume.find({ userId: req.user._id })
    .select("title updatedAt atsScore.score atsScore.grade atsScore.checkedAt") // The ATS badge, without the job description
    .sort({ updatedAt: -1 }); // Most recently edited first

  res.json(resumes);
};

// POST /api/resumes
export const createResume = async (req, res) => {
  const resume = await Resume.create({
    ...pickEditableFields(req.body),
    userId: req.user._id,
  });

  res.status(201).json(resume);
};

// GET /api/resumes/:id
export const getResumeById = async (req, res) => {
  const resume = await findOwnedResume(req, res);
  res.json(resume);
};

// PUT /api/resumes/:id
export const updateResume = async (req, res) => {
  const resume = await findOwnedResume(req, res);

  const { personalInfo, ...changes } = pickEditableFields(req.body);
  resume.set(changes);
  // Personal info is set field by field, so the save only writes those fields and never
  // touches photoUrl (a photo uploaded while this request was running stays in place)
  for (const [field, value] of Object.entries(personalInfo ?? {})) {
    resume.set(`personalInfo.${field}`, value);
  }
  const updatedResume = await resume.save(); // save() runs schema validation

  res.json(updatedResume);
};

// DELETE /api/resumes/:id
export const deleteResume = async (req, res) => {
  const resume = await findOwnedResume(req, res);
  await resume.deleteOne();

  // Remove its photo from Cloudinary too (if that fails, the resume is still deleted)
  if (resume.photoPublicId && isPhotoStorageConfigured()) {
    deletePhoto(resume.photoPublicId).catch((error) => console.error("Deleting photo failed:", error.message));
  }

  res.json({ message: "Resume deleted", id: resume._id });
};

// POST /api/resumes/:id/duplicate
export const duplicateResume = async (req, res) => {
  const original = await findOwnedResume(req, res);

  // Turn the document into a plain object and drop the fields MongoDB should regenerate
  // The copy is a new resume: no ATS score or optimizer review of its own yet
  const { _id, createdAt, updatedAt, photoPublicId, atsScore, atsOptimization, ...data } = original.toObject();

  // The copy starts without a photo; it gets its own copy of the photo below
  const copy = await Resume.create({
    ...data,
    personalInfo: { ...data.personalInfo, photoUrl: "" },
    title: `${original.title} (Copy)`,
  });

  // Each resume needs its own stored photo, so removing one copy's photo can't break the other
  if (original.personalInfo.photoUrl && isPhotoStorageConfigured()) {
    try {
      const photo = await copyPhoto(original.personalInfo.photoUrl, copy._id);
      copy.personalInfo.photoUrl = photo.url;
      copy.photoPublicId = photo.publicId;
      await copy.save();
    } catch (error) {
      console.error("Copying photo failed (the copy has no photo):", error.message);
    }
  }

  res.status(201).json(copy);
};
