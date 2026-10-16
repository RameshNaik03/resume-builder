import mongoose from "mongoose";
import Resume from "../models/Resume.js";

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
];

// Copies only the editable fields out of the request body
const pickEditableFields = (body = {}) => {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
};

// Finds a resume by id that belongs to the logged-in user, or throws a 404.
// We use 404 (not 403) for other users' resumes so we don't reveal that they exist.
const findOwnedResume = async (req, res) => {
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
    .select("title updatedAt")
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

  resume.set(pickEditableFields(req.body));
  const updatedResume = await resume.save(); // save() runs schema validation

  res.json(updatedResume);
};

// DELETE /api/resumes/:id
export const deleteResume = async (req, res) => {
  const resume = await findOwnedResume(req, res);
  await resume.deleteOne();

  res.json({ message: "Resume deleted", id: resume._id });
};

// POST /api/resumes/:id/duplicate
export const duplicateResume = async (req, res) => {
  const original = await findOwnedResume(req, res);

  // Turn the document into a plain object and drop the fields MongoDB should regenerate
  const { _id, createdAt, updatedAt, ...data } = original.toObject();

  const copy = await Resume.create({
    ...data,
    title: `${original.title} (Copy)`,
  });

  res.status(201).json(copy);
};
