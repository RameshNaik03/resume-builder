import SKILLS from "../ats/skills.js";
import { containsAnyTerm } from "../ats/keywords.js";
import { htmlToText } from "../../utils/richText.js";

// An honest match between a job (its analysis) and a resume.
//   score            - 0-100: must-have skills weigh MUST_WEIGHT, nice-to-haves NICE_WEIGHT
//   matched          - [{ skill, required, evidence: { section, text } }] (where the resume shows it)
//   missingMustHave / missingNiceToHave - skill names the resume doesn't show
//   keywords         - { matched, missing } (the job's other keywords; not part of the score)
// Evidence only ever comes from the resume's own text, or from a skill the user confirmed
// (confirmedSkills: [{ skill, note }]); nothing else counts, so tailoring can't raise the score
// by itself and a missing skill only counts once the user says they have it.

const MUST_WEIGHT = 3;
const NICE_WEIGHT = 1;
const MAX_EVIDENCE = 140;

// The resume as labelled lines: [{ section, text }] (sections as the review screen names them)
export function resumeLines(resume) {
  const strip = (html) => htmlToText(String(html ?? "")).replace(/\s+/g, " ").trim();
  const lines = [];
  const add = (section, text) => text && lines.push({ section, text: strip(text) });
  add("headline", resume.personalInfo?.headline);
  add("summary", resume.summary);
  for (const job of resume.experience ?? []) {
    const label = [job.role, job.company].filter(Boolean).join(" at ");
    add(`experience: ${label}`, job.role);
    add(`experience: ${label}`, job.subtitle);
    for (const bullet of job.bullets ?? []) add(`experience: ${label}`, bullet);
  }
  for (const project of resume.projects ?? []) {
    add(`projects: ${project.name}`, project.name);
    add(`projects: ${project.name}`, project.description);
  }
  if ((resume.skills ?? []).length) add("skills", resume.skills.join(", "));
  for (const entry of resume.education ?? []) add("education", [entry.degree, entry.school].filter(Boolean).join(", "));
  for (const section of resume.additional ?? []) for (const item of section.items ?? []) add(section.heading || "additional", item);
  return lines;
}

// How to find a skill in text: a dictionary skill by any of its spellings, else the phrase itself
export function skillMatcher(name) {
  const skill = SKILLS.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (skill) return (text) => containsAnyTerm(text, skill.terms, skill.caseSensitive);
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
  return (text) => pattern.test(text);
}

// The first resume line showing the skill (work first: experience and projects, then the rest)
//   max - longest quote in characters (longer lines are cut with "…"); Infinity for the whole line
export function findEvidence(lines, name, { max = MAX_EVIDENCE } = {}) {
  const matches = skillMatcher(name);
  const rank = (line) => (line.section.startsWith("experience") ? 0 : line.section.startsWith("projects") ? 1 : 2);
  const found = lines.filter((line) => matches(line.text)).sort((a, b) => rank(a) - rank(b))[0];
  return found ? { section: found.section, text: found.text.length > max ? `${found.text.slice(0, max - 1)}…` : found.text } : null;
}

export default function matchReport(analysis, resume, confirmedSkills = []) {
  const lines = resumeLines(resume);
  const confirmed = new Map(confirmedSkills.map((entry) => [entry.skill.toLowerCase(), entry]));

  const check = (skill, required) => {
    const evidence = findEvidence(lines, skill);
    if (evidence) return { skill, required, evidence };
    const confirmation = confirmed.get(skill.toLowerCase());
    if (confirmation) return { skill, required, evidence: { section: "confirmed by you", text: confirmation.note } };
    return { skill, required, evidence: null };
  };
  const results = [...analysis.mustHave.map((skill) => check(skill, true)), ...analysis.niceToHave.map((skill) => check(skill, false))];

  const weightOf = (result) => (result.required ? MUST_WEIGHT : NICE_WEIGHT);
  const total = results.reduce((sum, result) => sum + weightOf(result), 0);
  const matchedWeight = results.filter((result) => result.evidence).reduce((sum, result) => sum + weightOf(result), 0);

  const text = lines.map((line) => line.text).join("\n");
  const keywords = analysis.keywords ?? [];
  return {
    score: total ? Math.round((matchedWeight / total) * 100) : 0,
    matched: results.filter((result) => result.evidence),
    missingMustHave: results.filter((result) => !result.evidence && result.required).map((result) => result.skill),
    missingNiceToHave: results.filter((result) => !result.evidence && !result.required).map((result) => result.skill),
    keywords: {
      matched: keywords.filter((keyword) => skillMatcher(keyword)(text)),
      missing: keywords.filter((keyword) => !skillMatcher(keyword)(text)),
    },
  };
}
