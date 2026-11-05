import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import CoverLetter from "../models/CoverLetter.js";
import analyzeJob from "../services/jobs/analyzeJob.js";
import tailorResume, { LANGUAGES, MAX_FEATURED_SKILLS, STRENGTHS, tailoringOptions } from "../services/jobs/tailorResume.js";
import { baseResumeOf, defaultTitle, deleteApplications, versionsFor } from "../services/jobs/applications.js";
import matchReport from "../services/jobs/matchReport.js";
import { isAIEnabled } from "../services/ats/aiReview.js";
import { applyOp } from "../services/ats/optimizationOps.js";
import { checkRewrite } from "../services/ats/rewriteBullets.js";
import resumeToText from "../services/ats/resumeToText.js";
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
const MAX_BULLET_CHARACTERS = 300;
const MAX_BULLETS_LIMIT = 20; // The highest "max bullets per job" accepted

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
    return skill ? containsAnyTerm(description, skill.jobTerms, skill.caseSensitive) : description.toLowerCase().includes(term.toLowerCase());
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
  res.json({ analysis: await analyzeJob(description), aiEnabled: isAIEnabled() });
};

// The tailoring options from a request body (anything invalid falls back to its default)
function readTailorOptions(body = {}) {
  const strings = (value, max) => (Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim().slice(0, 200)).slice(0, max) : null);
  const maxBullets = Number(body.maxBulletsPerJob);
  return {
    strength: STRENGTHS.includes(body.strength) ? body.strength : "balanced",
    featuredSkills: strings(body.featuredSkills, MAX_FEATURED_SKILLS),
    excludedProjects: strings(body.excludedProjects, 100) ?? [],
    maxBulletsPerJob: Number.isInteger(maxBullets) && maxBullets >= 1 && maxBullets <= MAX_BULLETS_LIMIT ? maxBullets : null,
    template: typeof body.template === "string" && /^[a-z0-9-]{1,60}$/.test(body.template) ? body.template : null,
    language: LANGUAGES.includes(body.language) ? body.language : "en",
    fitOnePage: body.fitOnePage !== false,
  };
}

// The job and its analysis from a request ({ job: { description, analysis } }); the analysis is
// worked out from the description when it's missing
async function readJob(req, res) {
  const job = req.body?.job ?? {};
  const description = readDescription(req, res, job.description);
  const analysis = readAnalysis(job.analysis, description) ?? (await analyzeJob(description));
  if (!analysis.mustHave.length && !analysis.niceToHave.length) {
    res.status(422);
    throw new Error("We couldn't find any skills in this job description to tailor to. Please paste the full description, including its requirements.");
  }
  return { description, analysis };
}

// POST /api/jobs/options (logged-in users; JSON: resumeId, job: { description, analysis })
// What the options panel offers before tailoring (see tailoringOptions in tailorResume.js), plus
//   suggestedTitle   - "<Role> – <Company>" (the copy's default title)
//   tailoredFrom     - set when the chosen resume is itself a tailored copy: its base resume
//                      { resumeId, title } (resumeId null if that was deleted)
//   existingVersions - earlier tailored versions of this resume for this job (to replace one)
export const tailorOptions = async (req, res) => {
  const source = await findUsersResume(req, res, req.body?.resumeId);
  const { description, analysis } = await readJob(req, res);
  res.json({
    ...tailoringOptions(source.toObject(), analysis),
    maxFeatured: MAX_FEATURED_SKILLS,
    suggestedTitle: defaultTitle(analysis, source),
    tailoredFrom: await baseResumeOf(req.user._id, source),
    existingVersions: await versionsFor(req.user._id, source._id, description),
    aiEnabled: isAIEnabled(),
  });
};

// POST /api/jobs/tailor (logged-in users; JSON: resumeId, job: { description, analysis },
// options (see readTailorOptions), title, replaceJobId)
// Creates a NEW resume tailored to the job (the original is never changed) titled
// "<Role> – <Company>" (or the title given), stores the job, and returns every change, the
// honest match report and how this version differs from the original. The analysis is
// optional (it's worked out from the description if it's missing).
// replaceJobId: an earlier version of the same resume for the same job to replace instead: its
// resume and job are updated in place (same ids, so its cover letters stay linked) and the
// skills the user confirmed there are added again.
export const tailorToJob = async (req, res) => {
  const source = await findUsersResume(req, res, req.body?.resumeId);
  const { description, analysis } = await readJob(req, res);
  const options = readTailorOptions(req.body?.options ?? req.body);
  const replacing = req.body?.replaceJobId ? await findUsersJob(req, res, req.body.replaceJobId) : null;
  if (replacing && String(replacing.sourceResumeId) !== String(source._id)) {
    res.status(400);
    throw new Error("Only a version tailored from the same resume can be replaced.");
  }

  const original = source.toObject();
  const result = await tailorResume(original, analysis, { jobDescription: description, useAI: isAIEnabled(), ...options });
  // How it was tailored, for the page: AI or rules only, what the safety check dropped, and how
  // this version differs from the original
  const tailoring = {
    tailoredWith: result.tailoredWith,
    strength: result.strength,
    language: result.language,
    rejectedRewrites: result.rejectedRewrites.map(({ section, problem }) => ({ section, problem })),
    differences: result.differences,
  };
  // The match is measured on the original resume: tailoring rewords and reorders, it never adds
  // a skill the resume didn't already show, so it can't change the honest match
  const confirmed = replacing?.confirmedSkills.map((entry) => entry.toObject()) ?? [];
  const report = matchReport(analysis, result.original, confirmed);

  const title = (typeof req.body?.title === "string" && req.body.title.trim().slice(0, 100)) || defaultTitle(analysis, source);
  const { template, design } = result.resume;
  const after = scoreContent(result.resume, { template, design }, { jobDescription: description, jobTitle: analysis.title ?? "" });
  const before = scoreContent(result.original, { template: result.original.template, design: result.original.design }, { jobDescription: description, jobTitle: analysis.title ?? "" });
  const changes = result.changes.map((change) => ({ ...change, status: "pending" }));
  const content = {
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
  };
  for (const entry of confirmed) applyConfirmed(content, entry); // A replaced version keeps them

  let created;
  let saved;
  if (replacing) {
    created = await Resume.findOne({ _id: replacing.tailoredResumeId, userId: req.user._id });
    if (created) {
      created.set(content);
      created.markModified("atsOptimization");
      await created.save();
    } else created = await Resume.create(content);
    replacing.set({ tailoredResumeId: created._id, description, analysis, matchReport: report, tailoring });
    saved = await replacing.save();
  } else {
    created = await Resume.create(content);
    saved = await Job.create({ userId: req.user._id, sourceResumeId: source._id, tailoredResumeId: created._id, description, analysis, matchReport: report, tailoring });
  }

  res.status(replacing ? 200 : 201).json({
    resume: { _id: created._id, title: created.title, template: created.template },
    jobId: saved._id,
    replaced: Boolean(replacing),
    analysis,
    matchReport: report,
    places: placesIn(created), // Where a confirmed skill's bullet can go
    changes,
    tailoredWith: result.tailoredWith,
    tailoring,
    aiEnabled: isAIEnabled(),
    rewritesRejected: result.rejectedRewrites.length, // Generated lines dropped by the safety check
  });
};

// DELETE /api/jobs/:id (logged-in users): the whole application: the job, its tailored resume
// and its cover letters (to delete only the resume, use DELETE /api/resumes/:id)
export const deleteJob = async (req, res) => {
  const job = await findUsersJob(req, res, req.params.id);
  res.json({ message: "Application deleted", ...(await deleteApplications(req.user._id, [job._id])) });
};

// The places a confirmed skill's bullet can go: the tailored resume's jobs and projects
const placesIn = (resume) => ({
  jobs: (resume.experience ?? []).map((job) => ({ id: String(job._id), label: [job.role, job.company].filter(Boolean).join(" at ") || "Untitled job" })),
  projects: (resume.projects ?? []).filter((project) => project.name).map((project) => ({ id: project.name, label: project.name })),
});

// A saved job for the client: the job, its tailored resume's title and where bullets can go
const jobView = (job, resume) => ({
  _id: job._id,
  description: job.description,
  analysis: job.analysis,
  matchReport: job.matchReport,
  tailoring: job.tailoring ?? null, // null for jobs tailored before this was saved
  aiEnabled: isAIEnabled(),
  confirmedSkills: job.confirmedSkills,
  declinedSkills: job.declinedSkills,
  sourceResumeId: job.sourceResumeId,
  tailoredResumeId: job.tailoredResumeId,
  tailoredResume: resume ? { _id: resume._id, title: resume.title } : null,
  places: resume ? placesIn(resume) : { jobs: [], projects: [] },
  createdAt: job.createdAt,
});

async function findUsersJob(req, res, jobId) {
  const job = mongoose.isObjectIdOrHexString(jobId) ? await Job.findOne({ _id: jobId, userId: req.user._id }) : null;
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  return job;
}

// GET /api/jobs (logged-in users): past tailored jobs, newest first
export const listJobs = async (req, res) => {
  const jobs = await Job.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  // Each job's most recent cover letter (an application = tailored resume + job + letter)
  const letters = await CoverLetter.find({ userId: req.user._id, jobId: { $in: jobs.map((job) => job._id) } }, { jobId: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .lean();
  const letterFor = (job) => letters.find((letter) => String(letter.jobId) === String(job._id))?._id ?? null;
  res.json(
    jobs.map((job) => ({
      _id: job._id,
      title: job.analysis?.title ?? null,
      company: job.analysis?.company ?? null,
      score: job.matchReport?.score ?? 0,
      tailoredResumeId: job.tailoredResumeId,
      coverLetterId: letterFor(job),
      createdAt: job.createdAt,
    }))
  );
};

// GET /api/jobs/:id (logged-in users): one saved job, its match report and tailored resume
export const getJob = async (req, res) => {
  const job = await findUsersJob(req, res, req.params.id);
  const resume = await Resume.findOne({ _id: job.tailoredResumeId, userId: req.user._id }, { title: 1, experience: 1, projects: 1 }).lean();
  const letter = await CoverLetter.findOne({ userId: req.user._id, jobId: job._id }, { _id: 1 }).sort({ updatedAt: -1 }).lean();
  res.json({ ...jobView(job, resume), coverLetterId: letter?._id ?? null });
};

// POST /api/jobs/:id/decline-skill (logged-in users; JSON: skill)
// The user says they don't have a missing skill. Nothing is added; it's only remembered so
// the list shows it as decided. It still counts as missing in the match report.
export const declineSkill = async (req, res) => {
  const job = await findUsersJob(req, res, req.params.id);
  const skill = [...job.matchReport.missingMustHave, ...job.matchReport.missingNiceToHave].find(
    (missing) => missing.toLowerCase() === String(req.body?.skill ?? "").trim().toLowerCase()
  );
  if (!skill) {
    res.status(400);
    throw new Error("Only a skill this job asks for, and your resume doesn't show, can be marked.");
  }
  if (!job.declinedSkills.includes(skill)) job.declinedSkills.push(skill);
  await job.save();
  res.json({ declinedSkills: job.declinedSkills });
};

// A confirmed skill ({ skill, note, bullet, targetType, addedToJob }) applied to a tailored
// resume's content and recorded (accepted) in its review, so a rebuild from the review keeps it.
// The bullet goes under the job or project named addedToJob, if the resume still has it.
// Returns the review (or undefined if the content has none).
function applyConfirmed(content, { skill, note, bullet, targetType, addedToJob }) {
  const review = content.atsOptimization;
  const record = (section, before, after, reason, op) => {
    applyOp(content, op);
    if (review) review.changes.push({ id: `change-${review.changes.length + 1}`, section, before, after, reason, op, marks: { original: [], optimized: [after] }, revertible: true, status: "accepted" });
  };
  record("skills", "(not in your Skills list)", skill, `You confirmed you have ${skill}: "${note}".`, { kind: "addSkill", value: skill });
  const places = placesIn(content);
  const place = bullet && (targetType === "job" ? places.jobs : targetType === "project" ? places.projects : []).find((entry) => entry.label === addedToJob);
  if (place) {
    const op = targetType === "job" ? { kind: "addBullet", jobId: place.id, value: bullet } : { kind: "addProjectText", name: place.id, value: bullet };
    record(targetType === "job" ? "experience" : "projects", `${place.label}: (nothing about ${skill})`, bullet, `You confirmed ${skill} and wrote this for ${place.label}.`, op);
  }
  return review;
}

// POST /api/jobs/confirm-skill (logged-in users; JSON: jobId, skill, note, placement, target, bullet)
// The user confirms they have a skill the job asks for that their resume doesn't show, and says
// where they used it (note). They also choose where it goes:
//   placement "skills" - Skills only
//   placement "bullet" - Skills, plus their own bullet text (bullet) under one of the tailored
//                        resume's jobs or projects: target { type: "job" | "project", id }
//                        (a job's id, or a project's name)
// The bullet must pass the optimizer's safety check against the user's own text: any number,
// skill or name in it must come from the note, the skill or the resume. Nothing is guessed from
// the note. The match report then counts the skill, with the note as its evidence.
export const confirmSkill = async (req, res) => {
  const { jobId, skill: rawSkill, note: rawNote, placement, target, bullet: rawBullet } = req.body ?? {};
  const job = await findUsersJob(req, res, jobId);
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
  if (!["skills", "bullet"].includes(placement)) {
    res.status(400);
    throw new Error('Please choose where it goes: "skills" or "bullet".');
  }

  const resume = await Resume.findOne({ _id: job.tailoredResumeId, userId: req.user._id });
  if (!resume) {
    res.status(404);
    throw new Error("The tailored resume was deleted.");
  }
  const content = resume.toObject();

  // The bullet: the user's own text, at a job or project they chose
  let bullet = null;
  let place = null;
  if (placement === "bullet") {
    bullet = String(rawBullet ?? "").trim().replace(/\s+/g, " ");
    if (bullet.split(/\s+/).filter(Boolean).length < MIN_NOTE_WORDS || bullet.length > MAX_BULLET_CHARACTERS) {
      res.status(400);
      throw new Error(`Please write the bullet (a few words, up to ${MAX_BULLET_CHARACTERS} characters).`);
    }
    const places = placesIn(content);
    const list = target?.type === "job" ? places.jobs : target?.type === "project" ? places.projects : [];
    place = list.find((entry) => entry.id === String(target?.id ?? ""));
    if (!place) {
      res.status(400);
      throw new Error("Please choose one of your jobs or projects for the bullet.");
    }
    const ownText = `${note}\n${skill}\n${resumeToText(content)}`;
    const problem = checkRewrite(ownText, bullet, ownText);
    if (problem) {
      res.status(400);
      throw new Error(`The bullet adds something that isn't in your note or resume (${problem}). Please keep to what you wrote.`);
    }
  }

  const entry = { skill, note, addedToJob: bullet ? place.label : "", bullet: bullet ?? "", targetType: bullet ? target.type : "" };
  const review = applyConfirmed(content, entry);

  resume.skills = content.skills;
  resume.experience = content.experience;
  resume.projects = content.projects;
  if (review) {
    resume.atsOptimization = review;
    resume.markModified("atsOptimization");
  }
  await resume.save();

  job.confirmedSkills.push(entry);
  job.declinedSkills = job.declinedSkills.filter((declined) => declined !== skill);
  // Still measured on the original resume, plus the confirmed skills
  job.matchReport = matchReport(job.analysis, review?.original ?? content, job.confirmedSkills);
  job.markModified("matchReport");
  await job.save();

  res.json({ skill, placement, target: bullet ? { type: target.type, id: place.id, label: place.label } : null, bullet, matchReport: job.matchReport });
};
