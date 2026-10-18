import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import extractText from "../services/import/extractText.js";
import analyzeKeywords from "../services/ats/keywords.js";
import ruleSuggestions from "../services/ats/ruleSuggestions.js";
import resumeToText from "../services/ats/resumeToText.js";
import analyzeWithAI, { isAIEnabled } from "../services/ats/analyzeWithAI.js";

const MIN_JOB_WORDS = 30;
const MAX_JOB_CHARACTERS = 20000;

// POST /api/ats/check (public; multipart/form-data)
// Fields: jobDescription (text), and either file (PDF/DOCX) or resumeId (logged-in users only).
// Nothing is saved: the file is read from memory and thrown away.
export const checkResume = async (req, res) => {
  const jobDescription = String(req.body?.jobDescription ?? "").trim();
  const { resumeId } = req.body ?? {};

  if (jobDescription.split(/\s+/).filter(Boolean).length < MIN_JOB_WORDS) {
    res.status(400);
    throw new Error("Please paste the full job description (at least a few sentences).");
  }
  if (jobDescription.length > MAX_JOB_CHARACTERS) {
    res.status(400);
    throw new Error("This job description is very long. Please paste just the role's description and requirements.");
  }

  // 1. Get the resume text, from the uploaded file or a saved resume
  let resumeText;
  let source;
  if (req.file) {
    resumeText = await extractText(req.file); // Throws 415/422 with a clear message if it can't
    source = { type: "file", fileName: req.file.originalname };
  } else if (resumeId) {
    if (!req.user) {
      res.status(401);
      throw new Error("Please log in to check a saved resume.");
    }
    const resume = mongoose.isObjectIdOrHexString(resumeId)
      ? await Resume.findOne({ _id: resumeId, userId: req.user._id })
      : null;
    if (!resume) {
      res.status(404);
      throw new Error("Resume not found");
    }
    resumeText = resumeToText(resume);
    source = { type: "saved", resumeId: resume._id, title: resume.title };
  } else {
    res.status(400);
    throw new Error("Please upload a resume (PDF or DOCX) or choose one of your saved resumes.");
  }

  // 2. Rule-based keyword match (always runs)
  const keywords = analyzeKeywords(jobDescription, resumeText);
  if (keywords.totalKeywords < 3) {
    res.status(422);
    throw new Error(
      "We couldn't find enough skills or keywords in this job description. Please paste the full posting, including the requirements."
    );
  }

  // 3. AI feedback if configured. If it fails, the rule-based results are still returned.
  const ai = isAIEnabled() ? await analyzeWithAI(resumeText, jobDescription, keywords) : null;

  res.json({
    score: keywords.score,
    matchedKeywords: keywords.matched,
    missingKeywords: keywords.missing,
    suggestions: ruleSuggestions(resumeText, keywords),
    ai,
    analyzedWith: ai ? "ai" : "rules",
    source,
  });
};
