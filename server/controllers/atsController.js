import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import extractText from "../services/import/extractText.js";
import resumeToText from "../services/ats/resumeToText.js";
import inspectFile from "../services/ats/inspectFile.js";
import savedResumeLayout from "../services/ats/savedResumeLayout.js";
import scoreResume, { totals } from "../services/ats/scoreResume.js";
import aiReview, { isAIEnabled } from "../services/ats/aiReview.js";
import buildOptimizedResume from "../services/ats/optimizeResume.js";
import { buildContent } from "../services/ats/optimizationOps.js";
import parseWithRules from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";

const MIN_JOB_WORDS = 30;
const MAX_JOB_CHARACTERS = 20000;
const MAX_JOB_TITLE_CHARACTERS = 120;

// The optional job description and job title from the request, checked (shared by both endpoints)
function readJobFields(req, res) {
  const jobDescription = String(req.body?.jobDescription ?? "").trim();
  const jobTitle = String(req.body?.jobTitle ?? "").trim();
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
  return { jobDescription, jobTitle };
}

// One of the logged-in user's resumes, or a 404 (also for other users' resumes)
async function findUsersResume(req, res, resumeId) {
  const resume = mongoose.isObjectIdOrHexString(resumeId) ? await Resume.findOne({ _id: resumeId, userId: req.user._id }) : null;
  if (!resume) {
    res.status(404);
    throw new Error("Resume not found");
  }
  return resume;
}

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
  const { resumeId } = req.body ?? {};
  if (!req.file && !resumeId) {
    res.status(400);
    throw new Error("Please upload your resume as a PDF or DOCX file.");
  }
  const { jobDescription, jobTitle } = readJobFields(req, res);

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
    const resume = await findUsersResume(req, res, resumeId);
    atsView = resumeToText(resume);
    inspection = savedResumeLayout(resume, atsView);
    source = { type: "saved", resumeId: resume._id, title: resume.title, template: resume.template };
  }
  // The ATS view keeps the PDF's own text order (what an ATS reads, scrambled or not); the
  // resume data is read in page order so the optimizer gets each title with its own bullets
  const readingOrderText = req.file ? await extractText(req.file, { allowNoText: true, readingOrder: true }) : atsView;
  const parsedResume = sanitizeResume(parseWithRules(readingOrderText));

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
  // A saved resume's score also becomes its ATS badge on the dashboard
  if (source.type === "saved") await saveAtsScore(source.resumeId, { score, grade }, jobDescription);

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
    headerFooterText: inspection.headerFooter.texts, // Lets the optimizer move contact details into the body
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

// Rule-based { score, grade } of resume content as it would look in a template (the same
// way saved resumes are scored by /analyze)
function scoreContent(content, { template, design }, { jobDescription, jobTitle }) {
  const text = resumeToText(content);
  const inspection = savedResumeLayout({ template, design }, text);
  const { score, grade } = scoreResume({ text, inspection, parsed: sanitizeResume(parseWithRules(text)), jobDescription, jobTitle });
  return { score, grade };
}

// Saves the dashboard's ATS badge without counting as an edit (updatedAt stays the same)
const saveAtsScore = (resumeId, { score, grade }, jobDescription = "", extra = {}) =>
  Resume.updateOne(
    { _id: resumeId },
    { $set: { atsScore: { score, grade, checkedAt: new Date(), jobDescription }, ...extra } },
    { timestamps: false }
  );

// "priya_sharma-resume.pdf" -> "priya sharma resume"
const titleFromFileName = (name) =>
  String(name ?? "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "My resume";

const MAX_HEADER_LINES = 10;
const MAX_FAILED_CHECKS = 40;

// POST /api/ats/optimize (logged-in users; JSON)
// Fields: resumeId, or parsedResume (from /analyze) with fileName, headerFooterText and
// originalScore; plus optional failedChecks (check ids), jobDescription and jobTitle.
// Creates a NEW resume in an ATS-friendly Basic template (the original is never changed)
// and returns every change, skills to consider adding, and the score before and after.
export const optimizeResume = async (req, res) => {
  const { resumeId, parsedResume, fileName, originalScore } = req.body ?? {};
  const { jobDescription, jobTitle } = readJobFields(req, res);
  const failedChecks = (Array.isArray(req.body?.failedChecks) ? req.body.failedChecks : [])
    .filter((id) => typeof id === "string" && /^[a-z-]{1,40}$/.test(id))
    .slice(0, MAX_FAILED_CHECKS);
  const headerFooterText = (Array.isArray(req.body?.headerFooterText) ? req.body.headerFooterText : [])
    .filter((line) => typeof line === "string")
    .slice(0, MAX_HEADER_LINES)
    .map((line) => line.slice(0, 500));

  // The resume to improve: a saved one, or the data /analyze read from a file
  let original;
  let layout;
  let baseTitle;
  let before;
  let beforeFrom;
  if (resumeId) {
    const saved = await findUsersResume(req, res, resumeId);
    original = saved.toObject();
    layout = { template: saved.template, design: original.design ?? {} };
    baseTitle = saved.title;
    before = scoreContent(original, layout, { jobDescription, jobTitle }).score;
    beforeFrom = "saved-resume";
  } else if (parsedResume && typeof parsedResume === "object" && !Array.isArray(parsedResume)) {
    original = sanitizeResume(parsedResume);
    layout = { template: null, design: {} };
    baseTitle = titleFromFileName(fileName);
    // The file's own score (from /analyze) includes its layout problems, which the content
    // alone can't show; without it, the content is scored as a single-column resume
    const fileScore = Number(originalScore);
    const hasFileScore = originalScore !== undefined && Number.isFinite(fileScore) && fileScore >= 0 && fileScore <= 100;
    before = hasFileScore ? Math.round(fileScore) : scoreContent(original, layout, { jobDescription, jobTitle }).score;
    beforeFrom = hasFileScore ? "file-analysis" : "content";
  } else {
    res.status(400);
    throw new Error("Please choose a saved resume or check a file first.");
  }

  const content = sanitizeResume(original);
  if (!content.personalInfo.fullName && !content.experience.length && !content.education.length && !content.skills.length) {
    res.status(422);
    throw new Error("We couldn't find enough content in this resume to improve. Try importing it into the editor instead.");
  }

  const result = await buildOptimizedResume(original, {
    jobDescription,
    failedChecks,
    headerFooterText,
    template: layout.template,
    design: layout.design,
    fileName: resumeId ? null : String(fileName ?? "your file").slice(0, 120),
    useAI: isAIEnabled(),
  });

  // Saved as a new resume (the template and design come from the layout change: the Basic
  // template, keeping only page size, hidden sections and accent color). The review state is
  // saved with it, so the review screen works after a refresh.
  const { template, design } = result.resume;
  const after = scoreContent(result.resume, { template, design }, { jobDescription, jobTitle });
  const scores = { before, after: after.score, improvement: after.score - before, beforeFrom };
  const changes = result.changes.map((change) => ({ ...change, status: "pending" }));
  const created = await Resume.create({
    ...result.resume,
    title: `${baseTitle} (ATS-optimized)`.slice(0, 100),
    userId: req.user._id,
    atsScore: { score: after.score, grade: after.grade, checkedAt: new Date(), jobDescription },
    atsOptimization: {
      source: resumeId ? { type: "saved", resumeId: original._id, title: baseTitle } : { type: "file", fileName: String(fileName ?? "").slice(0, 120) },
      original: result.original,
      changes,
      skillsToConsider: result.skillsToConsider,
      selectedSkills: [],
      scores,
      currentScore: { score: after.score, grade: after.grade, checkedAt: new Date() },
      jobDescription,
      jobTitle,
      optimizedWith: result.optimizedWith,
      lockedAt: null, // Set once the resume is edited in the editor (see reviewOptimization)
    },
  });

  res.status(201).json({
    resume: { _id: created._id, title: created.title, template: created.template },
    changes,
    skillsToConsider: result.skillsToConsider,
    scores,
    optimizedWith: result.optimizedWith,
    rewritesRejected: result.rejectedRewrites.length, // AI rewrites dropped by the safety checks
  });
};

// The resume fields the review rebuilds (the photo and title stay as they are)
const CONTENT_FIELDS = ["summary", "experience", "education", "skills", "projects", "additional", "template", "design"];
const PERSONAL_FIELDS = ["fullName", "headline", "email", "phone", "location", "linkedin", "github"];
const STATUSES = ["pending", "accepted", "rejected"];
const sameSkill = (a, b) => a.toLowerCase() === b.toLowerCase();

// PATCH /api/ats/review/:resumeId (logged-in users; JSON)
// Fields: decisions [{ id, status: "accepted" | "rejected" | "pending" }] and/or selectedSkills
// (ticked "skills to consider").
// Decisions rebuild the optimized resume from the original + every change that isn't rejected,
// so they're locked (409) once the resume has been edited in the editor (lockedAt, set by
// updateResume): a rebuild would wipe those edits. Ticked skills are added to / removed from
// the resume as it is now, so they keep working after an edit.
export const reviewOptimization = async (req, res) => {
  const resume = await findUsersResume(req, res, req.params.resumeId);
  const review = resume.atsOptimization;
  if (!review) {
    res.status(404);
    throw new Error("This resume wasn't created by the ATS optimizer, so there's nothing to review.");
  }

  const decisions = Array.isArray(req.body?.decisions) ? req.body.decisions : [];
  for (const { id, status } of decisions) {
    const change = review.changes.find((c) => c.id === id);
    if (!change || !STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`Unknown change or status: ${id} ${status}`);
    }
    if (status === "rejected" && change.revertible === false) {
      res.status(400);
      throw new Error("This change can't be undone: your original file's layout can't be recreated.");
    }
  }
  if (req.body?.selectedSkills !== undefined && !Array.isArray(req.body.selectedSkills)) {
    res.status(400);
    throw new Error("selectedSkills must be a list.");
  }

  if (review.lockedAt && decisions.length) {
    res.status(409);
    throw new Error("You've edited this resume since the review, so changes can no longer be accepted or rejected here. Run the ATS check again to get a fresh review.");
  }

  if (req.body?.selectedSkills) {
    // Only skills from the suggestions (never free text)
    const allowed = new Map(review.skillsToConsider.filter((s) => s.type === "skill").map((s) => [s.term.toLowerCase(), s.term]));
    const selected = [...new Set(req.body.selectedSkills.map((s) => allowed.get(String(s).toLowerCase())).filter(Boolean))];
    const unticked = review.selectedSkills.filter((skill) => !selected.includes(skill));
    const skills = resume.skills.filter((skill) => !unticked.some((u) => sameSkill(u, skill)));
    for (const skill of selected) if (!skills.some((s) => sameSkill(s, skill))) skills.push(skill);
    resume.skills = skills;
    review.selectedSkills = selected;
  }

  if (decisions.length) {
    for (const { id, status } of decisions) review.changes.find((c) => c.id === id).status = status;
    const content = buildContent(review.original, review.changes, review.selectedSkills);
    for (const field of CONTENT_FIELDS) resume.set(field, content[field]);
    for (const field of PERSONAL_FIELDS) resume.set(`personalInfo.${field}`, content.personalInfo[field] ?? "");
  }
  resume.markModified("atsOptimization");
  await resume.save();
  res.json(resume);
};

// POST /api/ats/rescore/:resumeId (logged-in users)
// Scores the resume as it is now (rules only), against the job description it was last
// scored or optimized for, and saves it as its ATS badge. Used by the review screen and the
// dashboard's "Re-check".
export const rescoreResume = async (req, res) => {
  const resume = await findUsersResume(req, res, req.params.resumeId);
  const review = resume.atsOptimization;
  const jobDescription = review?.jobDescription || resume.atsScore?.jobDescription || "";
  const content = resume.toObject();
  const { score, grade } = scoreContent(content, content, { jobDescription, jobTitle: review?.jobTitle ?? "" });
  const checkedAt = new Date();
  await saveAtsScore(resume._id, { score, grade }, jobDescription, review ? { "atsOptimization.currentScore": { score, grade, checkedAt } } : {});
  res.json({ score, grade, checkedAt, withJobDescription: Boolean(jobDescription), before: review?.scores?.before ?? null });
};
