import mongoose from "mongoose";
import { findContactDetails, headingOf } from "../import/parseWithRules.js";
import parseWithRules from "../import/parseWithRules.js";
import sanitizeResume from "../import/sanitizeResume.js";
import { htmlToText } from "../../utils/richText.js";
import SKILLS from "./skills.js";
import analyzeKeywords, { containsAnyTerm } from "./keywords.js";
import { applyOp } from "./optimizationOps.js";
import resumeToText from "./resumeToText.js";
import rewriteBullets from "./rewriteBullets.js";
import { dateRanges, dateStyles, dateValue, findCliches, findPronouns, hasNumber, isJobSubtitle, startsWithActionVerb } from "./textRules.js";

// Builds an ATS-friendly version of a resume and lists every change it made.
//   1. Structure (rules, always): contact details in the main body, standard section
//      headings, project lines as job subtitles, one date format, newest job first
//   2. Bullets: AI rewrites when available (checked so nothing is invented), otherwise
//      only safe rule fixes ("I led..." -> "Led...")
//   3. Keywords: a job skill is added to Skills only if the resume already mentions it;
//      the rest are returned as "skills to consider adding if you have them"
// Every change: { id, section, before, after, reason, op, marks, revertible }
//   op         - the operation that makes it (see optimizationOps.js), so it can be rejected
//   marks      - text to highlight in the previews: { original: [...], optimized: [...] }
//   revertible - false when rejecting is impossible (an uploaded file's own layout)

export const OPTIMIZED_TEMPLATE = "classic-navy"; // Basic tier: one column, standard system fonts
const STANDARD_HEADINGS = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "03/2017", "March 2017", "2017-03" -> "Mar 2017"; "2017" stays; "current" -> "Present".
// Anything else is kept exactly as written.
function formatDate(text) {
  const value = text.trim();
  if (/^(present|current|now|today)$/i.test(value)) return "Present";
  let match = value.match(/^([A-Za-z]{3,9})\.?,?\s+((?:19|20)\d{2})$/);
  if (match) {
    const month = MONTHS.findIndex((m) => match[1].toLowerCase().startsWith(m.toLowerCase()));
    return month >= 0 ? `${MONTHS[month]} ${match[2]}` : value;
  }
  const fromNumbers = (month, year) => (Number(month) >= 1 && Number(month) <= 12 ? `${MONTHS[Number(month) - 1]} ${year}` : value);
  match = value.match(/^(\d{1,2})[/.-]((?:19|20)\d{2})$/); // 03/2017
  if (match) return fromNumbers(match[1], match[2]);
  match = value.match(/^((?:19|20)\d{2})[/.-](\d{1,2})$/); // 2017-03
  if (match) return fromNumbers(match[2], match[1]);
  return value;
}
// A range in one field, e.g. education "2015-2019" -> "2015 – 2019"
const formatRange = (text) => {
  const parts = text.split(/\s+[-–—]\s+|\s*[–—]\s*|\s+to\s+|(?<=\d{4})-(?=\d{4})/i);
  return parts.length === 2 ? parts.map(formatDate).join(" – ") : formatDate(text);
};

const prettyTemplate = (id = "") => id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const jobLabel = (job) => [job.role, job.company].filter(Boolean).join(" at ") || "Untitled job";
const datesOf = (job) => [job.startDate, job.endDate].filter(Boolean).join(" – ");
const newId = () => new mongoose.Types.ObjectId().toString();

// original: resume content (a saved resume or parsed file data)
// options:  { jobDescription, failedChecks, headerFooterText, template, design, fileName, useAI }
// Returns { original, resume, changes, skillsToConsider, optimizedWith, rejectedRewrites }:
//   original - the starting point the changes apply to (content + template + design, with job ids)
//   resume   - the result (original + every change)
export default async function optimizeResume(original, options = {}) {
  const { jobDescription = "", failedChecks = [], headerFooterText = [], template = null, design = {}, fileName, useAI } = options;

  // A clean copy (no photo or unknown fields); every job gets the id it will be saved with
  const start = { ...sanitizeResume(original), template, design: structuredClone(design ?? {}) };
  for (const job of start.experience) job._id = newId();
  const resume = structuredClone(start);
  const originalText = resumeToText(start);

  const changes = [];
  // Applies the operation to the result and records it as a reviewable change
  const change = (section, before, after, reason, op, marks = {}, revertible = true) => {
    applyOp(resume, op);
    changes.push({
      id: `change-${changes.length + 1}`,
      section,
      before,
      after,
      reason,
      op,
      marks: { original: (marks.original ?? []).filter(Boolean), optimized: (marks.optimized ?? []).filter(Boolean) },
      revertible,
    });
  };

  // ---------- 1. Contact details that were only in the page header/footer ----------
  const headerText = headerFooterText.join("\n");
  if (headerText) {
    const found = findContactDetails(headerText);
    for (const [field, value] of Object.entries(found)) {
      if (value && !resume.personalInfo[field]) {
        change("personalInfo", `${field} only in the page header/footer`, value, "Many ATS skip headers and footers, so this is now in the main body at the top.", { kind: "personalInfo", field, value }, { optimized: [value] });
      }
    }
  }

  // ---------- 2. Standard section headings ----------
  // Unknown sections that list jobs with dates ("My Journey") become Experience entries
  for (const section of [...resume.additional]) {
    if (headingOf(section.heading) || !section.items.some((item) => dateRanges(item).length)) continue;
    const jobs = sanitizeResume(parseWithRules(`EXPERIENCE\n${section.items.join("\n")}`)).experience;
    if (!jobs.length) continue;
    for (const job of jobs) job._id = newId();
    change(
      "experience",
      `Section "${section.heading}"`,
      `Experience (${jobs.length} job${jobs.length > 1 ? "s" : ""})`,
      `ATS look for standard headings like "Experience"; "${section.heading}" may not be recognised.`,
      { kind: "convertSection", heading: section.heading, jobs },
      { original: [section.heading], optimized: jobs.map((job) => job.role) }
    );
  }
  // Renamed headings in the saved design go back to the standard names
  for (const [id, heading] of Object.entries(resume.design.sectionHeadings ?? {})) {
    if (heading && STANDARD_HEADINGS[id] && heading.trim().toLowerCase() !== STANDARD_HEADINGS[id].toLowerCase()) {
      change(id, `Heading "${heading}"`, `Heading "${STANDARD_HEADINGS[id]}"`, "ATS look for standard section headings.", { kind: "heading", section: id }, { original: [heading], optimized: [STANDARD_HEADINGS[id]] });
    }
  }

  // ---------- 3. Project lines under a job become its subtitle ----------
  // e.g. a first bullet "Acme Pay, a payments app (React, Node.js)" (resumes from before subtitles existed)
  for (const job of resume.experience) {
    const first = job.bullets[0];
    if (job.subtitle || !first || !isJobSubtitle(htmlToText(first))) continue;
    const text = htmlToText(first).trim();
    change(
      "experience",
      `${jobLabel(job)}: bullet "${text}"`,
      `${jobLabel(job)}: subtitle "${text}"`,
      "It names a project rather than an achievement, so it's now the job's subtitle and doesn't count as a weak bullet.",
      { kind: "subtitle", jobId: job._id, bullet: first, value: text },
      { original: [text], optimized: [text] }
    );
  }

  // ---------- 4. One date format ----------
  const allDates = [...resume.experience.flatMap((job) => [job.startDate, job.endDate]), ...resume.education.map((e) => e.year)].join("\n");
  if (dateStyles(allDates).length > 1) {
    for (const job of resume.experience) {
      const before = datesOf(job);
      const startDate = formatDate(job.startDate);
      const endDate = formatDate(job.endDate);
      const after = [startDate, endDate].filter(Boolean).join(" – ");
      if (after === before) continue;
      const label = jobLabel(job);
      if (startDate !== job.startDate) {
        change("experience", `${label}: ${job.startDate}`, `${label}: ${startDate}`, 'Dates now use one format ("Jan 2024") everywhere.', { kind: "jobField", jobId: job._id, field: "startDate", value: startDate }, { original: [job.startDate], optimized: [startDate] });
      }
      if (endDate !== job.endDate) {
        change("experience", `${label}: ${job.endDate}`, `${label}: ${endDate}`, 'Dates now use one format ("Jan 2024") everywhere.', { kind: "jobField", jobId: job._id, field: "endDate", value: endDate }, { original: [job.endDate], optimized: [endDate] });
      }
    }
    resume.education.forEach((entry, index) => {
      const year = formatRange(entry.year);
      if (year === entry.year) return;
      const label = entry.degree || entry.school;
      change("education", `${label}: ${entry.year}`, `${label}: ${year}`, 'Dates now use one format ("Jan 2024") everywhere.', { kind: "educationField", index, field: "year", value: year }, { original: [entry.year], optimized: [year] });
    });
  }

  // ---------- 5. Newest job first ----------
  // Only when every job has a date we can read, so nothing is moved on a guess
  const sortKey = (job) => [dateValue(job.endDate || job.startDate || ""), dateValue(job.startDate || job.endDate || "")];
  if (resume.experience.length > 1 && resume.experience.every((job) => sortKey(job).every((v) => v !== null))) {
    const sorted = [...resume.experience].sort((a, b) => sortKey(b)[0] - sortKey(a)[0] || sortKey(b)[1] - sortKey(a)[1]);
    if (sorted.some((job, i) => job !== resume.experience[i])) {
      const describe = (jobs) => jobs.map((job) => `${jobLabel(job)} (${datesOf(job)})`).join("; ");
      change("experience", describe(resume.experience), describe(sorted), "Jobs are now newest first (reverse-chronological), the order ATS and recruiters expect.", { kind: "order", jobIds: sorted.map((job) => job._id) });
    }
  }

  // ---------- 6. Weak bullet points ----------
  const weakBullets = [];
  resume.experience.forEach((job) => {
    job.bullets.forEach((bullet, bulletIndex) => {
      const text = htmlToText(bullet);
      const words = text.split(/\s+/).filter(Boolean).length;
      const issues = [
        !startsWithActionVerb(text) && "doesn't start with an action verb",
        !hasNumber(text) && "no measurable result",
        words < 6 && "too short",
        words > 30 && "too long",
        findPronouns(text).length && "uses first-person pronouns",
        findCliches(text).length && "uses a cliché",
      ].filter(Boolean);
      if (issues.length) weakBullets.push({ id: `${job._id}-b${bulletIndex}`, jobId: job._id, bullet, text, issues });
    });
  });
  const bulletChange = (weak, after, reason) =>
    change("experience", weak.text, after, reason, { kind: "bullet", jobId: weak.jobId, from: weak.bullet, value: after }, { original: [weak.text], optimized: [after] });

  let aiUsed = false;
  const rejected = [];
  const rewritten = new Set();
  if (useAI && weakBullets.length) {
    const rewrites = await rewriteBullets({
      bullets: weakBullets.map(({ id, text, issues }) => ({ id, text, issues })),
      resumeText: originalText,
      jobDescription,
      failedChecks,
      onRejected: (rejection) => rejected.push(rejection),
    });
    if (rewrites) {
      aiUsed = true;
      for (const rewrite of rewrites) {
        const weak = weakBullets.find((b) => b.id === rewrite.id);
        rewritten.add(weak.id);
        bulletChange(weak, rewrite.after.trim(), rewrite.reason);
      }
    }
  }
  // Safe rule fix for the rest: "I led a team" -> "Led a team"
  for (const weak of weakBullets) {
    if (rewritten.has(weak.id)) continue;
    const match = weak.text.match(/^I\s+([\p{L}-]+)(.*)$/su);
    if (match && startsWithActionVerb(match[1])) {
      bulletChange(weak, `${match[1][0].toUpperCase()}${match[1].slice(1)}${match[2]}`, 'Resumes leave out "I": start with the action verb.');
    }
  }

  // ---------- 7. Keywords from the job ----------
  const skillsToConsider = [];
  if (jobDescription) {
    const keywords = analyzeKeywords(jobDescription, originalText);
    for (const keyword of keywords.matched) {
      if (keyword.type !== "skill") continue;
      const skill = SKILLS.find((s) => s.name === keyword.term);
      if (!skill || containsAnyTerm(resume.skills.join(", "), skill.terms, skill.caseSensitive)) continue;
      // Mentioned in the resume, but not in the Skills list: show where, then add it
      const evidence = originalText.split("\n").find((line) => containsAnyTerm(line, skill.terms, skill.caseSensitive)) ?? "";
      change(
        "skills",
        "(not in your Skills list)",
        skill.name,
        `The job asks for ${skill.name} and your resume already shows it ("${evidence.replace(/^[•\s]+/, "").slice(0, 80)}"), so it's now in Skills too.`,
        { kind: "addSkill", value: skill.name },
        { optimized: [skill.name] }
      );
    }
    // Not in the resume at all: never added, only suggested
    for (const keyword of keywords.missing) skillsToConsider.push({ term: keyword.term, type: keyword.type, required: keyword.required });
  }

  // ---------- 8. Layout ----------
  const wasBasicSingleColumn = template === OPTIMIZED_TEMPLATE && !design.columns && !design.fontFamily && !design.headingFontFamily;
  if (!wasBasicSingleColumn) {
    change(
      "layout",
      fileName ? `Original file (${fileName})` : `${prettyTemplate(template)} template${design.columns === 2 ? ", two columns" : ""}`,
      "Classic Navy template: one column, standard fonts",
      "A simple single-column layout with standard fonts and headings is the easiest for an ATS to read.",
      { kind: "layout", template: OPTIMIZED_TEMPLATE },
      {},
      !fileName // An uploaded file's own layout can't be recreated, so this one can't be rejected
    );
  }

  return { original: start, resume, changes, skillsToConsider, optimizedWith: aiUsed ? "rules+ai" : "rules", rejectedRewrites: rejected };
}
