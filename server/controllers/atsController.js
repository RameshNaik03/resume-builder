import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import extractText from "../services/import/extractText.js";
import resumeToText from "../services/ats/resumeToText.js";
import inspectFile from "../services/ats/inspectFile.js";
import savedResumeLayout from "../services/ats/savedResumeLayout.js";
import scoreResume, { totals } from "../services/ats/scoreResume.js";
import aiReview, { isAIEnabled } from "../services/ats/aiReview.js";
import parseWithRules from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";

const MIN_JOB_WORDS = 30;
const MAX_JOB_CHARACTERS = 20000;
const MAX_JOB_TITLE_CHARACTERS = 120;

// POST /api/ats/analyze (public; multipart/form-data)
// Fields: file (PDF/DOCX) or resumeId (logged-in users only), jobDescription (optional),
// jobTitle (optional, overrides the title found in the job description).
// The file is only read in memory and never saved.
//
// 1. Parse check: extract the text an ATS would see ("atsView") and inspect the original file
//    for layout risks (columns, tables, images, headers/footers, fonts).
// 2. Score out of 100 with rule-based checks in five categories.
// 3. If ANTHROPIC_API_KEY is set, the AI judges the content-quality checks and writes tailored
//    fixes. If it fails, the rule-based result is returned unchanged.
export const analyzeResume = async (req, res) => {
  const jobDescription = String(req.body?.jobDescription ?? "").trim();
  const jobTitle = String(req.body?.jobTitle ?? "").trim();
  const { resumeId } = req.body ?? {};

  if (!req.file && !resumeId) {
    res.status(400);
    throw new Error("Please upload your resume as a PDF or DOCX file.");
  }
  if (jobDescription) {
    if (jobDescription.split(/\s+/).length < MIN_JOB_WORDS) {
      res.status(400);
      throw new Error("Please paste the full job description (at least a few sentences), or leave it empty.");
    }
    if (jobDescription.length > MAX_JOB_CHARACTERS) {
      res.status(400);
      throw new Error("This job description is very long. Please paste just the role's description and requirements.");
    }
  }
  if (jobTitle.length > MAX_JOB_TITLE_CHARACTERS) {
    res.status(400);
    throw new Error("The job title is too long.");
  }

  // Step 1: parse check. extractText also rejects files that aren't really PDF/DOCX.
  // A saved resume has no file: its text is built from the data and its layout from the template.
  let atsView;
  let inspection;
  let source;
  if (req.file) {
    atsView = await extractText(req.file, { allowNoText: true });
    try {
      inspection = await inspectFile(req.file);
    } catch {
      res.status(422);
      throw new Error("We couldn't read this file's layout. It may be damaged. Try saving it again as a PDF or DOCX.");
    }
    source = { type: "file", fileName: req.file.originalname };
  } else {
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
    atsView = resumeToText(resume);
    inspection = savedResumeLayout(resume, atsView);
    source = { type: "saved", resumeId: resume._id, title: resume.title, template: resume.template };
  }
  const parsedResume = sanitizeResume(parseWithRules(atsView));

  // Step 2: rule-based score
  const result = scoreResume({ text: atsView, inspection, parsed: parsedResume, jobDescription, jobTitle });
  if (jobDescription && result.keywords.totalKeywords < 3) {
    res.status(422);
    throw new Error(
      "We couldn't find enough skills or keywords in this job description. Please paste the full posting, including the requirements."
    );
  }

  // Step 3: optional AI review. Its content judgments replace the rule points for those
  // checks only (each check keeps its rulePoints), and its fixes replace the generic ones.
  const ai = isAIEnabled() && atsView ? await aiReview({ text: atsView, jobDescription, checks: result.checks }) : null;
  let checks = result.checks.map((c) => ({ ...c, rulePoints: c.points, judgedBy: "rules" }));
  if (ai) {
    const judgments = new Map(ai.contentChecks.map((j) => [j.id, j]));
    const fixes = new Map(ai.fixes.map((f) => [f.checkId, f.fix]));
    checks = checks.map((c) => {
      const judgment = judgments.get(c.id);
      const updated = judgment
        ? { ...c, points: judgment.points, passed: judgment.points >= c.maxPoints, reason: judgment.reason, judgedBy: "ai" }
        : c;
      return { ...updated, fix: updated.passed ? null : (fixes.get(c.id) ?? c.fix) };
    });
  }
  const { score, grade, categories } = totals(checks);

  res.json({
    score,
    grade,
    ruleScore: result.score, // The rules-only score (always the same for the same file)
    categories: categories.map((category) => ({ ...category, checks: checks.filter((c) => c.category === category.id) })),
    checks,
    matchedKeywords: result.keywords?.matched ?? [],
    missingKeywords: result.keywords?.missing ?? [],
    keywords: {
      jobDescriptionProvided: Boolean(jobDescription),
      jobTitle: result.keywords?.jobTitle ?? null,
      keywordScore: result.keywords?.score ?? null,
      detectedSkills: result.detectedSkills,
    },
    atsView,
    parsedResume,
    source,
    file: {
      name: req.file ? req.file.originalname : source.title,
      type: req.file ? (req.file.mimetype === "application/pdf" ? "pdf" : "docx") : "saved",
      pages: inspection.pages,
      pagesEstimated: Boolean(inspection.pagesEstimated),
      words: atsView.split(/\s+/).filter(Boolean).length,
    },
    ai: ai && { summary: ai.summary, strengths: ai.strengths, weakBullets: ai.weakBullets },
    analyzedWith: ai ? "rules+ai" : "rules",
  });
};
