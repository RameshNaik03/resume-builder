import mongoose from "mongoose";
import CoverLetter, { LANGUAGES, LENGTHS, TONES } from "../models/CoverLetter.js";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import generateLetter, { letterFacts } from "../services/coverLetters/generateLetter.js";
import { isAIEnabled } from "../services/ats/aiReview.js";

// Cover letters: CRUD for the logged-in user's own letters, and generating one for a tailored
// resume and its job (see services/coverLetters/generateLetter.js). A letter's resume and job
// must belong to the same user; other users' letters, resumes and jobs are 404s.

const FIELDS = ["title", "recipientName", "companyName", "body", "tone", "length", "language"];
const MAX_WHY_CHARACTERS = 600;

// One of the user's own documents, or a 404 (also for other users' documents)
async function findOwned(Model, req, res, id, label) {
  const doc = mongoose.isObjectIdOrHexString(id) ? await Model.findOne({ _id: id, userId: req.user._id }) : null;
  if (!doc) {
    res.status(404);
    throw new Error(`${label} not found`);
  }
  return doc;
}

// The editable fields from a request body, with the option values checked
function readFields(req, res) {
  const data = {};
  for (const field of FIELDS) if (req.body?.[field] !== undefined) data[field] = req.body[field];
  for (const [field, allowed] of [["tone", TONES], ["length", LENGTHS], ["language", LANGUAGES]]) {
    if (data[field] !== undefined && !allowed.includes(data[field])) {
      res.status(400);
      throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
    }
  }
  for (const field of ["title", "recipientName", "companyName", "body"]) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      res.status(400);
      throw new Error(`${field} must be text`);
    }
  }
  return data;
}

// GET /api/cover-letters: the user's letters, newest first (without their bodies)
export const listCoverLetters = async (req, res) => {
  const letters = await CoverLetter.find({ userId: req.user._id }, { body: 0 }).sort({ updatedAt: -1 }).lean();
  res.json(letters);
};

// GET /api/cover-letters/:id
export const getCoverLetter = async (req, res) => {
  res.json(await findOwned(CoverLetter, req, res, req.params.id, "Cover letter"));
};

// POST /api/cover-letters (JSON: resumeId, jobId?, title, recipientName, companyName, body,
// tone, length, language): a letter written by hand
export const createCoverLetter = async (req, res) => {
  const resume = await findOwned(Resume, req, res, req.body?.resumeId, "Resume");
  const job = req.body?.jobId ? await findOwned(Job, req, res, req.body.jobId, "Job") : null;
  const letter = await CoverLetter.create({ ...readFields(req, res), userId: req.user._id, resumeId: resume._id, jobId: job?._id ?? null });
  res.status(201).json(letter);
};

// PUT /api/cover-letters/:id (the same fields; resumeId / jobId must be the user's own)
export const updateCoverLetter = async (req, res) => {
  const letter = await findOwned(CoverLetter, req, res, req.params.id, "Cover letter");
  const data = readFields(req, res);
  if (req.body?.resumeId !== undefined) data.resumeId = (await findOwned(Resume, req, res, req.body.resumeId, "Resume"))._id;
  if (req.body?.jobId !== undefined) data.jobId = req.body.jobId ? (await findOwned(Job, req, res, req.body.jobId, "Job"))._id : null;
  letter.set(data);
  await letter.save();
  res.json(letter);
};

// DELETE /api/cover-letters/:id
export const deleteCoverLetter = async (req, res) => {
  const letter = await findOwned(CoverLetter, req, res, req.params.id, "Cover letter");
  await letter.deleteOne();
  res.json({ message: "Cover letter deleted" });
};

// POST /api/cover-letters/generate (JSON: jobId, resumeId? (the job's tailored resume by default),
// tone, length, language, recipientName?, whyCompany?)
// Writes a letter from the resume and the job (its analysis and the skills the user confirmed,
// with their notes) and saves it. Unknown facts become [placeholders]; a missing "Why this
// company?" answer is a placeholder too, never an invented reason.
// Returns { coverLetter, placeholders, words, generatedWith, aiRejected }.
export const generateCoverLetter = async (req, res) => {
  const job = await findOwned(Job, req, res, req.body?.jobId, "Job");
  const resume = await findOwned(Resume, req, res, req.body?.resumeId ?? job.tailoredResumeId, "Resume");
  const { tone = "professional", length = "standard", language = "en" } = readFields(req, res);
  const recipientName = typeof req.body?.recipientName === "string" ? req.body.recipientName.trim().slice(0, 120) : "";
  const whyCompany = typeof req.body?.whyCompany === "string" ? req.body.whyCompany.trim() : "";
  if (whyCompany.length > MAX_WHY_CHARACTERS) {
    res.status(400);
    throw new Error(`Please keep "Why this company?" under ${MAX_WHY_CHARACTERS} characters.`);
  }

  const facts = letterFacts({ resume: resume.toObject(), job: job.toObject(), recipientName, whyCompany });
  const result = await generateLetter(facts, { tone, length, language, useAI: isAIEnabled() });

  const role = job.analysis?.title;
  const company = job.analysis?.company;
  const coverLetter = await CoverLetter.create({
    userId: req.user._id,
    resumeId: resume._id,
    jobId: job._id,
    title: ["Cover letter", role, company].filter(Boolean).join(" – ").slice(0, 150),
    recipientName,
    companyName: company ?? "",
    body: result.body,
    tone,
    length,
    language,
  });
  res.status(201).json({
    coverLetter,
    placeholders: result.placeholders, // e.g. ["[Hiring Manager]", "[Why this company? ...]"]
    words: result.words,
    generatedWith: result.generatedWith,
    aiRejected: result.aiRejected, // Why an AI letter was dropped for the template, if it was
  });
};
