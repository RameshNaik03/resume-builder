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
// Seniority words: nice to match, but not required
const LEVELS = new Set(["senior", "junior", "lead", "principal", "staff", "chief", "head", "associate", "intern", "trainee", "i", "ii", "iii"]);

const normalize = (text) => {
  let t = ` ${text.toLowerCase()} `;
  for (const [pattern, replacement] of SYNONYMS) t = t.replace(pattern, replacement);
  return t.replace(/[^a-z0-9+#\s]/g, " ").replace(/\s+/g, " ").trim();
};

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

// Compares the title with the resume.
// Returns { level: "full" | "partial" | "none", coreWords, missingWords }
//   full    - every important word of the title appears in the resume (e.g. "frontend" and "engineer")
//   partial - the main role word appears ("engineer"), but not its specialisation
export function matchJobTitle(title, resumeText) {
  const resume = ` ${normalize(resumeText)} `;
  const words = normalize(title).split(" ").filter((w) => w && !LEVELS.has(w) && !["and", "of", "the", "for", "a", "an", "to", "in", "with"].includes(w));
  if (words.length === 0) return { level: "full", coreWords: [], missingWords: [] };

  const missingWords = words.filter((word) => !resume.includes(` ${word} `) && !resume.includes(` ${word}s `));
  if (missingWords.length === 0) return { level: "full", coreWords: words, missingWords };

  const roleWord = words.find((word) => ROLE_NOUNS.test(word));
  const level = roleWord && !missingWords.includes(roleWord) ? "partial" : "none";
  return { level, coreWords: words, missingWords };
}
