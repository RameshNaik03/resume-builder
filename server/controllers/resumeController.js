import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import { copyPhoto, isPhotoStorageConfigured } from "../services/photoStorage.js";
import { deleteApplications, deleteResumes } from "../services/jobs/applications.js";

const MAX_BULK_DELETE = 100;

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
  "skillLevels",
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
    // The ATS badge (without the job description), and what a tailored copy was made from
    .select("title updatedAt atsScore.score atsScore.grade atsScore.checkedAt atsOptimization.source")
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

// The parts of a resume the ATS optimizer's review covers (not the title or the photo)
const REVIEWED_FIELDS = EDITABLE_FIELDS.filter((field) => field !== "title");
const reviewedContent = (resume) => {
  const plain = resume.toObject();
  delete plain.personalInfo?.photoUrl;
  return JSON.stringify(REVIEWED_FIELDS.map((field) => plain[field]));
};

// PUT /api/resumes/:id
export const updateResume = async (req, res) => {
  const resume = await findOwnedResume(req, res);
  // An optimized resume's review is locked once its content is edited here (see the ATS review)
  const contentBefore = resume.atsOptimization && !resume.atsOptimization.lockedAt ? reviewedContent(resume) : null;

  const { personalInfo, ...changes } = pickEditableFields(req.body);
  resume.set(changes);
  // Personal info is set field by field, so the save only writes those fields and never
  // touches photoUrl (a photo uploaded while this request was running stays in place)
  for (const [field, value] of Object.entries(personalInfo ?? {})) {
    resume.set(`personalInfo.${field}`, value);
  }
  if (contentBefore !== null && reviewedContent(resume) !== contentBefore) {
    resume.atsOptimization.lockedAt = new Date();
    resume.markModified("atsOptimization");
  }
  const updatedResume = await resume.save(); // save() runs schema validation

  res.json(updatedResume);
};

// DELETE /api/resumes/:id
// Its cover letters move to another resume of their job, or are deleted when none is left (see
// services/jobs/applications.js); a tailored resume's job stays (delete the whole application
// with DELETE /api/jobs/:id)
export const deleteResume = async (req, res) => {
  const resume = await findOwnedResume(req, res);
  const result = await deleteResumes(req.user._id, [resume._id]);
  res.json({ message: "Resume deleted", id: resume._id, ...result });
};

// POST /api/resumes/delete-many (JSON: resumeIds - resumes to delete on their own, jobIds -
// whole applications to delete: job, tailored resume and cover letters)
// Ids that aren't the user's are ignored. Returns how many of each were deleted.
export const deleteManyResumes = async (req, res) => {
  const { resumeIds = [], jobIds = [] } = req.body ?? {};
  if (!Array.isArray(resumeIds) || !Array.isArray(jobIds) || resumeIds.length + jobIds.length === 0 || resumeIds.length + jobIds.length > MAX_BULK_DELETE) {
    res.status(400);
    throw new Error(`Choose between 1 and ${MAX_BULK_DELETE} resumes or applications to delete.`);
  }
  const applications = await deleteApplications(req.user._id, jobIds);
  const resumes = await deleteResumes(req.user._id, resumeIds);
  res.json({
    applications: applications.jobs,
    resumes: applications.resumes + resumes.resumes,
    lettersDeleted: applications.lettersDeleted + resumes.lettersDeleted,
    lettersMoved: resumes.lettersMoved,
  });
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
