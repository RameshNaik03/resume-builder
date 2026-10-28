// Finds the job title in a job description and checks whether the resume uses it.

// Words that make something a job title ("Engineer", "Manager"...).
// Also used by the import parser to tell job lines from project lines.
export const ROLE_NOUNS =
  /\b(engineer|developer|programmer|architect|manager|director|designer|analyst|scientist|specialist|consultant|administrator|coordinator|lead|head|officer|associate|representative|executive|assistant|intern|accountant|nurse|teacher|recruiter|technician|strategist|writer|editor|marketer|planner|researcher|product owner|scrum master|advisor|agent|clerk|supervisor)s?\b/i;

// Same meaning, different spelling: compared after these replacements
const SYNONYMS = [
  [/\bsr\.?(?=\s)/g, "senior"],
  [/\bjr\.?(?=\s)/g, "junior"],
  [/\bengr?\.?(?=\s|$)/g, "engineer"],
  [/\bdev\b/g, "developer"],
  [/\bswe\b/g, "software engineer"],
  [/\bsde\b/g, "software engineer"],
  [/\bmgr\b/g, "manager"],
  [/\bpm\b/g, "product manager"],
  [/\bfront[\s-]end\b/g, "frontend"],
  [/\bback[\s-]end\b/g, "backend"],
  [/\bfull[\s-]stack\b/g, "fullstack"],
  [/\bui\/ux\b|\bux\/ui\b/g, "ux"],
  [/\bjs\b/g, "javascript"],
];
// Seniority words: ignored when comparing roles (a "Senior Frontend Engineer" job and a
// "Frontend Engineer" resume are the same role)
const SENIORITY = new Set([
  "senior", "junior", "lead", "principal", "staff", "chief", "head", "associate", "intern", "internship",
  "trainee", "graduate", "entry", "mid", "i", "ii", "iii", "iv",
]);
// Role words that mean the same job
const ROLE_FAMILIES = [["developer", "engineer", "programmer"]];
// Specialties close enough to count as a related role (e.g. Full Stack vs Frontend)
const RELATED_SPECIALTIES = [
  ["frontend", "backend", "fullstack", "web", "software", "application", "ui", "mobile", "javascript"],
  ["data", "analytics", "bi", "reporting"],
  ["devops", "cloud", "platform", "infrastructure", "sre", "site", "reliability"],
];
const FILLER = new Set(["and", "of", "the", "for", "a", "an", "to", "in", "with"]);

const normalize = (text) => {
  let t = ` ${text.toLowerCase()} `;
  for (const [pattern, replacement] of SYNONYMS) t = t.replace(pattern, replacement);
  return t.replace(/[^a-z0-9+#\s]/g, " ").replace(/\s+/g, " ").trim();
};
const singular = (word) => (/[^s]s$/.test(word) ? word.slice(0, -1) : word);
const familyOf = (role) => ROLE_FAMILIES.findIndex((family) => family.includes(role));
const sameRoleFamily = (a, b) => a === b || (familyOf(a) >= 0 && familyOf(a) === familyOf(b));
const sameSet = (a, b) => a.length === b.length && a.every((word) => b.includes(word));
const relatedSpecialty = (a, b) =>
  a.length === 0 || b.length === 0 || RELATED_SPECIALTIES.some((group) => a.some((w) => group.includes(w)) && b.some((w) => group.includes(w)));

// "Sr. Front-End Engineer" -> { seniority: ["senior"], role: "engineer", specialty: ["frontend"] }
function describe(title) {
  const words = normalize(title).split(" ").filter((word) => word && !FILLER.has(word));
  const seniority = words.filter((word) => SENIORITY.has(word));
  const rest = words.filter((word) => !SENIORITY.has(word));
  const roleWord = [...rest].reverse().find((word) => ROLE_NOUNS.test(word)) ?? null; // The last one: "Data Engineer" -> engineer
  return { seniority, role: roleWord && singular(roleWord), specialty: rest.filter((word) => word !== roleWord) };
}

// How a resume title compares with the job's: "exact" | "close" | "related" | null, and why
function compareTitles(job, candidate) {
  if (!job.role || !candidate.role || !sameRoleFamily(job.role, candidate.role)) return { level: null };
  const reasons = [];
  if (job.role !== candidate.role) reasons.push(`${capitalize(candidate.role)} and ${capitalize(job.role)} count as the same role`);
  if (!sameSet(job.seniority, candidate.seniority)) reasons.push("different seniority");
  if (sameSet(job.specialty, candidate.specialty) || (job.specialty.length && job.specialty.every((w) => candidate.specialty.includes(w)))) {
    return { level: reasons.length ? "close" : "exact", reasons };
  }
  if (relatedSpecialty(job.specialty, candidate.specialty)) {
    return { level: "related", reasons: [`${candidate.specialty.join(" ") || "general"} vs ${job.specialty.join(" ") || "general"}`, ...reasons] };
  }
  return { level: null };
}
const capitalize = (word) => word[0].toUpperCase() + word.slice(1);

// Best guess at the title: an explicit "Job title:" line, the first short line that
// names a role, or "looking for a <title>" in the text
export function extractJobTitle(jobDescription) {
  const labelled = jobDescription.match(/^\s*(?:job\s*title|position|role|title)\s*[:\-–]\s*(.{3,80})$/im);
  if (labelled) return labelled[1].trim();

  for (const line of jobDescription.split("\n").slice(0, 5)) {
    const words = line.trim().split(/\s+/);
    if (words.length >= 1 && words.length <= 8 && ROLE_NOUNS.test(line) && !/[.!?]$/.test(line.trim())) {
      // "Front-End Engineer - Remote" -> "Front-End Engineer" (a hyphen inside a word stays)
      return line.trim().replace(/\s+[-–—|]\s+.*$|\s*[(|].*$/, "").trim();
    }
  }

  const sentence = jobDescription.match(/(?:looking for|hiring|seeking|join us as)\s+(?:an?\s+)?((?:[A-Za-z+#/.-]+\s){0,4}?[A-Za-z]*(?:engineer|developer|manager|designer|analyst|scientist|specialist|consultant|architect|administrator|coordinator|lead|intern)s?)\b/i);
  return sentence ? sentence[1].trim() : null;
}

const LEVEL_ORDER = ["exact", "close", "related"];

// Compares the job's title with the titles in the resume (headline, job roles) and the text.
// Spellings are normalised (Sr./Senior, Front-End/Frontend, Full-Stack/Fullstack...).
// Returns { level, matched, reasons }:
//   exact   - the same title ("Sr. Front-End Engineer" = "Senior Frontend Engineer")
//   close   - the same role with a different seniority, or Developer/Engineer/Programmer swapped
//   related - the same kind of role in a related specialty (Full Stack vs Front-End)
//   none    - no similar title
//   matched - the resume title it matched; reasons - how it differs
export function matchJobTitle(title, resumeText, resumeTitles = []) {
  const job = describe(title);
  const text = ` ${normalize(resumeText)} `;
  const phrase = (words) => words.length > 0 && text.includes(` ${words.join(" ")} `);
  let best = { level: "none", matched: null, reasons: [] };
  const consider = (level, matched, reasons) => {
    if (LEVEL_ORDER.indexOf(level) >= 0 && (best.level === "none" || LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(best.level))) {
      best = { level, matched, reasons };
    }
  };

  // The resume's own titles first, so the message shows them as written
  for (const candidate of resumeTitles.filter(Boolean)) {
    const { level, reasons } = compareTitles(job, describe(candidate));
    if (level) consider(level, candidate, reasons);
  }
  // Then the title (or the same role with another seniority or role word) anywhere in the text
  if (phrase(normalize(title).split(" "))) consider("exact", title, []);
  if (job.role) {
    for (const role of ROLE_FAMILIES.find((family) => family.includes(job.role)) ?? [job.role]) {
      const roleReasons = role === job.role ? [] : [`${capitalize(role)} and ${capitalize(job.role)} count as the same role`];
      const withSeniority = [...job.seniority, ...job.specialty, role];
      const withoutSeniority = [...job.specialty, role];
      if (phrase(withSeniority)) consider(roleReasons.length ? "close" : "exact", withSeniority.join(" "), roleReasons);
      else if (phrase(withoutSeniority)) consider("close", withoutSeniority.join(" "), [...roleReasons, ...(job.seniority.length ? ["different seniority"] : [])]);
    }
  }
  return best;
}
