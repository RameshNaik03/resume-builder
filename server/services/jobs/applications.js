import mongoose from "mongoose";
import Resume from "../../models/Resume.js";
import Job from "../../models/Job.js";
import CoverLetter from "../../models/CoverLetter.js";
import { deletePhotosOrQueue } from "../photoStorage.js";
import { deleteOriginals } from "../import/originalFiles.js";

// Applications: a tailored resume + its job + its cover letters. Finding a tailored resume's
// base resume and earlier versions for the same job, and deleting without leaving orphans
// (a cover letter whose resume is gone, or a job whose resume and letters are gone).

const MAX_CHAIN = 10;
const validIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((id) => mongoose.isObjectIdOrHexString(id)))];
const sameDescription = (a, b) => a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

// For a tailored resume: the base resume it was (ultimately) made from, following tailored
// copies of tailored copies: { resumeId, title } (resumeId null if the base was deleted), or
// null when the resume isn't a tailored copy
export async function baseResumeOf(userId, resume) {
  let current = resume;
  let source = null;
  for (let step = 0; step < MAX_CHAIN && current?.atsOptimization?.source?.type === "job"; step++) {
    source = current.atsOptimization.source;
    current = source.resumeId ? await Resume.findOne({ _id: source.resumeId, userId }, { title: 1, atsOptimization: 1 }).lean() : null;
  }
  if (!source) return null;
  return current ? { resumeId: current._id, title: current.title } : { resumeId: null, title: source.title ?? "" };
}

// Earlier tailored versions of the same base resume for the same job description (whose
// tailored resume still exists), newest first: [{ jobId, resumeId, title, createdAt }]
export async function versionsFor(userId, sourceResumeId, description) {
  const jobs = (await Job.find({ userId, sourceResumeId }, { description: 1, tailoredResumeId: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean()).filter((job) =>
    sameDescription(job.description, description)
  );
  const resumes = await Resume.find({ userId, _id: { $in: jobs.map((job) => job.tailoredResumeId) } }, { title: 1 }).lean();
  return jobs.flatMap((job) => {
    const resume = resumes.find((entry) => String(entry._id) === String(job.tailoredResumeId));
    return resume ? [{ jobId: job._id, resumeId: resume._id, title: resume.title, createdAt: job.createdAt }] : [];
  });
}

// A tailored copy's default title: "<Role> – <Company>", else the person's headline (or the
// base resume's title) with the company, or with the month when the company isn't known
export function defaultTitle(analysis, source, now = new Date()) {
  const role = analysis.title || source.personalInfo?.headline || source.title || "Tailored resume";
  const second = analysis.company || (analysis.title ? null : `tailored ${now.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`);
  return (second ? `${role} – ${second}` : role).slice(0, 100);
}

// Deletes the user's resumes (ids that aren't theirs are ignored). Their cover letters move to
// another resume of the same job (its tailored copy, else its base resume); a letter with no
// resume left is deleted too, and so are their uploaded originals. Returns { resumes, lettersMoved, lettersDeleted }.
export async function deleteResumes(userId, resumeIds) {
  const resumes = await Resume.find({ _id: { $in: validIds(resumeIds) }, userId }, { photoPublicId: 1 }).lean();
  const gone = new Set(resumes.map((resume) => String(resume._id)));
  const letters = await CoverLetter.find({ userId, resumeId: { $in: [...gone] } }, { resumeId: 1, jobId: 1 }).lean();
  const jobs = await Job.find({ userId, _id: { $in: letters.map((letter) => letter.jobId).filter(Boolean) } }, { tailoredResumeId: 1, sourceResumeId: 1 }).lean();
  const candidates = jobs.flatMap((job) => [job.tailoredResumeId, job.sourceResumeId]).filter((id) => id && !gone.has(String(id)));
  const remaining = new Set((await Resume.find({ userId, _id: { $in: candidates } }, { _id: 1 }).lean()).map((resume) => String(resume._id)));

  let lettersMoved = 0;
  const orphans = [];
  for (const letter of letters) {
    const job = jobs.find((entry) => String(entry._id) === String(letter.jobId));
    const next = [job?.tailoredResumeId, job?.sourceResumeId].find((id) => id && remaining.has(String(id)));
    if (next) {
      await CoverLetter.updateOne({ _id: letter._id }, { resumeId: next });
      lettersMoved++;
    } else orphans.push(letter._id);
  }
  if (orphans.length) await CoverLetter.deleteMany({ _id: { $in: orphans } });
  await Resume.deleteMany({ _id: { $in: [...gone] } });
  await deleteOriginals(userId, [...gone]); // The files they were imported from

  // Their photos too, in the background (any that fail are queued and retried later)
  deletePhotosOrQueue(resumes.map((resume) => resume.photoPublicId)).catch((error) => console.error("Deleting photos failed:", error.message));
  return { resumes: gone.size, lettersMoved, lettersDeleted: orphans.length };
}

// Deletes whole applications: each job, its tailored resume and its cover letters (ids that
// aren't the user's are ignored). Returns { jobs, resumes, lettersDeleted }.
export async function deleteApplications(userId, jobIds) {
  const jobs = await Job.find({ _id: { $in: validIds(jobIds) }, userId }, { tailoredResumeId: 1 }).lean();
  const ids = jobs.map((job) => job._id);
  const { deletedCount } = await CoverLetter.deleteMany({ userId, jobId: { $in: ids } });
  const removed = await deleteResumes(
    userId,
    jobs.map((job) => job.tailoredResumeId)
  );
  await Job.deleteMany({ _id: { $in: ids }, userId });
  return { jobs: ids.length, resumes: removed.resumes, lettersDeleted: deletedCount + removed.lettersDeleted };
}
