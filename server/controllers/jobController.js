import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import analyzeJob from "../services/jobs/analyzeJob.js";
import tailorResume from "../services/jobs/tailorResume.js";
import matchReport, { skillMatcher } from "../services/jobs/matchReport.js";
import { isAIEnabled } from "../services/ats/aiReview.js";
import { applyOp } from "../services/ats/optimizationOps.js";
import scoreContent from "../services/ats/scoreContent.js";
import { containsAnyTerm } from "../services/ats/keywords.js";
import SKILLS from "../services/ats/skills.js";

// Job-based tailoring: analyze a job description, tailor a copy of a resume to it, and add
// missing skills only when the user confirms them. Reuses the ATS keyword matching, scoring,
// change format and safety checks (see services/jobs/).

const MIN_JOB_WORDS = 30;
const MAX_JOB_CHARACTERS = 20000;
const MAX_LIST = 20;
const MIN_NOTE_WORDS = 3;
const MAX_NOTE_CHARACTERS = 300;

function readDescription(req, res, value) {
  const description = String(value ?? "").trim();
  if (description.split(/\s+/).length < MIN_JOB_WORDS) {
    res.status(400);
    throw new Error("Please paste the full job description (at least a few sentences).");
  }
  if (description.length > MAX_JOB_CHARACTERS) {
    res.status(400);
    throw new Error("This job description is very long. Please paste just the role's description and requirements.");
  }
  return description;
}

// An analysis sent back by the client, checked: plain strings only, and every skill or keyword
// must really appear in the description (so a request can't slip in a skill the job never named)
function readAnalysis(raw, description) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const inDescription = (term) => {
    const skill = SKILLS.find((s) => s.name.toLowerCase() === term.toLowerCase());
    return skill ? containsAnyTerm(description, skill.terms, skill.caseSensitive) : description.toLowerCase().includes(term.toLowerCase());
  };
  const list = (value, max = MAX_LIST, check = inDescription) =>
    (Array.isArray(value) ? value : []).map((item) => text(item, 200)).filter((item) => item && check(item)).slice(0, max);
  return {
    title: text(raw.title, 120) || null,
    company: text(raw.company, 120) || null,
    seniority: text(raw.seniority, 20) || null,
    mustHave: list(raw.mustHave),
    niceToHave: list(raw.niceToHave),
    responsibilities: list(raw.responsibilities, 8, () => true),
    keywords: list(raw.keywords, 12),
    analyzedWith: text(raw.analyzedWith, 20) || "rules",
  };
}

async function findUsersResume(req, res, resumeId) {
  const resume = mongoose.isObjectIdOrHexString(resumeId) ? await Resume.findOne({ _id: resumeId, userId: req.user._id }) : null;
  if (!resume) {
    res.status(404);
    throw new Error("Resume not found");
  }
  return resume;
}

// POST /api/jobs/analyze (logged-in users; JSON: jobDescription)
// Returns { analysis }: title, company, seniority, must-have and nice-to-have skills, key
// responsibilities and keywords (AI when available, rules otherwise)
export const analyzeJobDescription = async (req, res) => {
  const description = readDescription(req, res, req.body?.jobDescription);
  res.json({ analysis: await analyzeJob(description) });
};

// POST /api/jobs/tailor (logged-in users; JSON: resumeId, job: { description, analysis })
// Creates a NEW resume tailored to the job (the original is never changed) titled
// "<Role> – <Company>", stores the job, and returns every change and the honest match report.
// The analysis is optional (it's worked out from the description if it's missing).
export const tailorToJob = async (req, res) => {
  const { resumeId, job = {} } = req.body ?? {};
  const description = readDescription(req, res, job.description);
  const source = await findUsersResume(req, res, resumeId);
  const analysis = readAnalysis(job.analysis, description) ?? (await analyzeJob(description));
  if (!analysis.mustHave.length && !analysis.niceToHave.length) {
    res.status(422);
    throw new Error("We couldn't find any skills in this job description to tailor to. Please paste the full description, including its requirements.");
  }

  const original = source.toObject();
  const result = await tailorResume(original, analysis, { jobDescription: description, useAI: isAIEnabled() });
  // The match is measured on the original resume: tailoring rewords and reorders, it never adds
  // a skill the resume didn't already show, so it can't change the honest match
  const report = matchReport(analysis, result.original);

  const role = analysis.title || "Tailored resume";
  const title = (analysis.company ? `${role} – ${analysis.company}` : role).slice(0, 100);
  const { template, design } = result.resume;
  const after = scoreContent(result.resume, { template, design }, { jobDescription: description, jobTitle: analysis.title ?? "" });
  const before = scoreContent(result.original, { template: result.original.template, design: result.original.design }, { jobDescription: description, jobTitle: analysis.title ?? "" });
  const changes = result.changes.map((change) => ({ ...change, status: "pending" }));

  const created = await Resume.create({
    ...result.resume,
    title,
    userId: req.user._id,
    atsScore: { score: after.score, grade: after.grade, checkedAt: new Date(), jobDescription: description },
    // The review screen's state, so every change can be reviewed, accepted or rejected there.
    // Missing skills aren't offered as ticks: they're added only through /jobs/confirm-skill.
    atsOptimization: {
      source: { type: "job", resumeId: source._id, title: source.title },
      original: result.original,
      changes,
      skillsToConsider: [],
      selectedSkills: [],
      scores: { before: before.score, after: after.score, improvement: after.score - before.score, beforeFrom: "saved-resume" },
      currentScore: { score: after.score, grade: after.grade, checkedAt: new Date() },
      jobDescription: description,
      jobTitle: analysis.title ?? "",
      optimizedWith: result.tailoredWith,
      lockedAt: null,
    },
  });
  const saved = await Job.create({
    userId: req.user._id,
    sourceResumeId: source._id,
    tailoredResumeId: created._id,
    description,
    analysis,
    matchReport: report,
  });

  res.status(201).json({
    resume: { _id: created._id, title: created.title, template: created.template },
    jobId: saved._id,
    analysis,
    matchReport: report,
    changes,
    tailoredWith: result.tailoredWith,
    rewritesRejected: result.rejectedRewrites.length, // Generated lines dropped by the safety check
  });
};

// POST /api/jobs/confirm-skill (logged-in users; JSON: jobId, skill, note)
// The user confirms they have a skill the job asks for that their resume doesn't show, and says
// where they used it. The skill is added to the tailored resume's Skills. The note becomes a
// bullet only when it supports one: it names one of the resume's jobs (role or employer) and
// mentions the skill, so the bullet is the user's own words about real work. The match report is
// updated (the skill now counts, with the note as its evidence).
export const confirmSkill = async (req, res) => {
  const { jobId, skill: rawSkill, note: rawNote } = req.body ?? {};
  const job = mongoose.isObjectIdOrHexString(jobId) ? await Job.findOne({ _id: jobId, userId: req.user._id }) : null;
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  const skill = [...job.matchReport.missingMustHave, ...job.matchReport.missingNiceToHave].find(
    (missing) => missing.toLowerCase() === String(rawSkill ?? "").trim().toLowerCase()
  );
  if (!skill) {
    res.status(400);
    throw new Error("Only a skill this job asks for, and your resume doesn't show yet, can be confirmed here.");
  }
  const note = String(rawNote ?? "").trim();
  if (note.split(/\s+/).filter(Boolean).length < MIN_NOTE_WORDS || note.length > MAX_NOTE_CHARACTERS) {
    res.status(400);
    throw new Error(`Please say briefly where you used ${skill} (a few words, up to ${MAX_NOTE_CHARACTERS} characters).`);
  }

  const resume = await Resume.findOne({ _id: job.tailoredResumeId, userId: req.user._id });
  if (!resume) {
    res.status(404);
    throw new Error("The tailored resume was deleted.");
  }

  // Changes are applied to the resume and recorded (accepted) in its review, so a later
  // rebuild from the review keeps them
  const content = resume.toObject();
  const review = content.atsOptimization;
  const added = [];
  const record = (section, before, after, reason, op) => {
    applyOp(content, op);
    if (review) review.changes.push({ id: `change-${review.changes.length + 1}`, section, before, after, reason, op, marks: { original: [], optimized: [after] }, revertible: true, status: "accepted" });
    added.push({ section, after });
  };

  record("skills", "(not in your Skills list)", skill, `You confirmed you have ${skill}: "${note}".`, { kind: "addSkill", value: skill });

  const mentionsSkill = skillMatcher(skill)(note);
  const named = (text) => text && new RegExp(`(?<![\\p{L}])${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(note);
  const targetJob = mentionsSkill ? content.experience.find((entry) => named(entry.company) || named(entry.role)) : null;
  let bullet = null;
  if (targetJob) {
    bullet = `${note[0].toUpperCase()}${note.slice(1)}`.replace(/[.\s]+$/, "");
    record(
      "experience",
      `${[targetJob.role, targetJob.company].filter(Boolean).join(" at ")}: (no bullet about ${skill})`,
      bullet,
      `Your note says where you used ${skill}, so it's now a bullet under that job, in your own words.`,
      { kind: "addBullet", jobId: String(targetJob._id), value: bullet }
    );
  }

  resume.skills = content.skills;
  resume.experience = content.experience;
  if (review) {
    resume.atsOptimization = review;
    resume.markModified("atsOptimization");
  }
  await resume.save();

  job.confirmedSkills.push({ skill, note, addedToJob: targetJob ? [targetJob.role, targetJob.company].filter(Boolean).join(" at ") : "" });
  // Still measured on the original resume, plus the confirmed skills
  const original = review?.original ?? content;
  job.matchReport = matchReport(job.analysis, original, job.confirmedSkills);
  job.markModified("matchReport");
  await job.save();

  res.json({
    skill,
    addedTo: added.map((entry) => entry.section),
    bullet,
    matchReport: job.matchReport,
  });
};
