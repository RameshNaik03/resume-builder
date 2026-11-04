import mongoose from "mongoose";
import CoverLetter, { LANGUAGES, LENGTHS, SALUTATIONS, TONES } from "../models/CoverLetter.js";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import generateLetter, { letterFacts, letterSubject } from "../services/coverLetters/generateLetter.js";
import { isAIEnabled } from "../services/ats/aiReview.js";

// Cover letters: CRUD for the logged-in user's own letters, and generating one for a tailored
// resume and its job (see services/coverLetters/generateLetter.js). A letter's resume and job
// must belong to the same user; other users' letters, resumes and jobs are 404s.

const FIELDS = ["title", "recipientName", "recipientSalutation", "companyName", "subject", "date", "whyCompany", "body", "tone", "length", "language"];
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
  for (const [field, allowed] of [["tone", TONES], ["length", LENGTHS], ["language", LANGUAGES], ["recipientSalutation", SALUTATIONS]]) {
    if (data[field] !== undefined && !allowed.includes(data[field])) {
      res.status(400);
      throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
    }
  }
  for (const field of ["title", "recipientName", "companyName", "subject", "whyCompany", "body"]) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      res.status(400);
      throw new Error(`${field} must be text`);
    }
  }
  if (data.date !== undefined && Number.isNaN(new Date(data.date).getTime())) {
    res.status(400);
    throw new Error("date must be a date");
  }
  if (data.whyCompany !== undefined && data.whyCompany.trim().length > MAX_WHY_CHARACTERS) {
    res.status(400);
    throw new Error(`Please keep "Why this company?" under ${MAX_WHY_CHARACTERS} characters.`);
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
  // A hand edit of the body: "Regenerate" warns before replacing it
  if (data.body !== undefined && data.body !== letter.body) data.bodyEdited = true;
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

// The generation options from a request body, checked
function readOptions(req, res) {
  const { tone = "professional", length = "standard", language = "en", recipientSalutation = "" } = readFields(req, res);
  const recipientName = typeof req.body?.recipientName === "string" ? req.body.recipientName.trim().slice(0, 120) : "";
  const whyCompany = typeof req.body?.whyCompany === "string" ? req.body.whyCompany.trim() : "";
  if (whyCompany.length > MAX_WHY_CHARACTERS) {
    res.status(400);
    throw new Error(`Please keep "Why this company?" under ${MAX_WHY_CHARACTERS} characters.`);
  }
  return { tone, length, language, recipientName, recipientSalutation: recipientName ? recipientSalutation : "", whyCompany };
}

// Writes a letter's body (and the fields that go with it) from the resume, job and options
async function writeLetter(resume, job, options) {
  const facts = letterFacts({ resume: resume.toObject(), job: job.toObject(), recipientName: options.recipientName, salutation: options.recipientSalutation, whyCompany: options.whyCompany });
  const result = await generateLetter(facts, { ...options, useAI: isAIEnabled() });
  return {
    fields: {
      body: result.body,
      bodyEdited: false,
      tone: options.tone,
      length: options.length,
      language: options.language,
      recipientName: options.recipientName,
      recipientSalutation: options.recipientSalutation,
      whyCompany: options.whyCompany,
      companyName: job.analysis?.company ?? "",
      subject: letterSubject(job.analysis?.title, options.language),
    },
    meta: { placeholders: result.placeholders, words: result.words, generatedWith: result.generatedWith, aiRejected: result.aiRejected },
  };
}

// POST /api/cover-letters/generate (JSON: jobId, resumeId? (the job's tailored resume by default),
// tone, length, language, recipientName?, recipientSalutation? ("Frau" / "Herr"), whyCompany?)
// Writes a letter from the resume and the job (its analysis and the skills the user confirmed,
// with their notes) and saves it. Unknown facts become [placeholders]; a missing "Why this
// company?" answer is a placeholder too, never an invented reason.
// Returns { coverLetter, placeholders, words, generatedWith, aiRejected }.
export const generateCoverLetter = async (req, res) => {
  const job = await findOwned(Job, req, res, req.body?.jobId, "Job");
  const resume = await findOwned(Resume, req, res, req.body?.resumeId ?? job.tailoredResumeId, "Resume");
  const { fields, meta } = await writeLetter(resume, job, readOptions(req, res));
  const coverLetter = await CoverLetter.create({
    ...fields,
    userId: req.user._id,
    resumeId: resume._id,
    jobId: job._id,
    title: ["Cover letter", job.analysis?.title, job.analysis?.company].filter(Boolean).join(" – ").slice(0, 150),
  });
  res.status(201).json({ coverLetter, ...meta });
};

// POST /api/cover-letters/:id/regenerate (the same options as /generate)
// Rewrites a letter's body for its job. The client warns first when bodyEdited is true.
export const regenerateCoverLetter = async (req, res) => {
  const letter = await findOwned(CoverLetter, req, res, req.params.id, "Cover letter");
  if (!letter.jobId) {
    res.status(400);
    throw new Error("This letter isn't linked to a job, so it can't be regenerated.");
  }
  const job = await findOwned(Job, req, res, letter.jobId, "Job");
  const resume = await findOwned(Resume, req, res, letter.resumeId, "Resume");
  const { fields, meta } = await writeLetter(resume, job, readOptions(req, res));
  letter.set(fields);
  await letter.save();
  res.json({ coverLetter: letter, ...meta });
};
