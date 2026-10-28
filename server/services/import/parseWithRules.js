// A simple, free resume parser used when the AI isn't available.
// It splits the text into sections by common headings ("Experience", "Skills"...),
// then reads each section with a few patterns. It won't be perfect, but it gives
// the user a solid starting point to fix up in the editor.

// ---------- Patterns ----------

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /\+?\(?\d[\d\s().-]{7,}\d/g;
const LINKEDIN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+\/?/i;
const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+(?:\/[\w.-]+)?/i;
const ANY_URL = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|dev|app|org|net|me|co|in|ai)(?:\/[\w./%-]*)?/i;

// Bullet characters at the start of a line: • ● ▪ ◦ ■ - * – · >
const BULLET = /^[•●▪◦■*·>–-]\s*/;

// Date ranges like "Jan 2023 – Present", "06/2021 - 08/2022", "2019 to 2023"
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s*\\d{4}|\\d{1,2}\\/\\d{4}|(?:19|20)\\d{2})`;
const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|present|current|now|today)`, "i");
const YEAR_OR_RANGE = new RegExp(`${DATE_RANGE.source}|(?:19|20)\\d{2}`, "i");

const DEGREE = /\b(bachelor|master|b\.?\s?s\.?c?|b\.?\s?tech|b\.?\s?e|m\.?\s?s\.?c?|m\.?\s?tech|mba|ph\.?\s?d|diploma|associate|degree|b\.?a|m\.?a|hsc|ssc|high school certificate)\b/i;
const SCHOOL = /\b(university|college|institute|school|academy|polytechnic|iit|nit)\b/i;

// Separators used inside one line, e.g. "Role | Company", "Role at Company", "Role – Company"
const SEPARATORS = /\s+(?:at|@)\s+|\s*[|•·]\s*|\s+[–—-]\s+|,\s+/i;

// ---------- Section headings ----------

const HEADINGS = {
  summary: ["summary", "professional summary", "profile", "professional profile", "about", "about me", "objective", "career objective"],
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "internships", "internship", "experience and internships"],
  education: ["education", "academic background", "academics", "education and training", "qualifications", "academic qualifications"],
  skills: ["skills", "technical skills", "key skills", "core skills", "skills and tools", "technologies", "tech stack", "core competencies", "tools and technologies"],
  projects: ["projects", "personal projects", "academic projects", "key projects", "selected projects", "side projects"],
  // Kept as "additional" sections under their own heading
  other: [
    "certifications", "certificates", "licenses and certifications", "certifications and licenses",
    "awards", "honors", "honors and awards", "awards and honors", "achievements", "awards and achievements",
    "languages", "interests", "hobbies", "hobbies and interests", "references",
    "volunteering", "volunteer", "volunteer work", "volunteer experience", "leadership", "leadership experience",
    "publications", "patents", "conferences", "memberships", "professional memberships", "affiliations",
    "activities", "extracurricular activities", "courses", "relevant coursework", "training",
    "professional development", "additional information", "personal details", "strengths",
  ],
};

// "WORK EXPERIENCE:" -> "experience"; returns null if the line isn't a heading
// Also used by the ATS checker to find which standard sections a resume has
export function headingOf(line) {
  if (line.length > 40) return null;
  const normalized = line
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const [section, names] of Object.entries(HEADINGS)) {
    if (names.includes(normalized)) return section;
  }
  return null;
}

// ---------- Helpers ----------

const stripBullet = (line) => line.replace(BULLET, "").trim();
const trimSeparators = (text) => text.replace(/^[\s|,•·()–—-]+|[\s|,•·()–—-]+$/g, "").trim();
const splitParts = (text) => text.split(SEPARATORS).map(trimSeparators).filter(Boolean);

// Real phone numbers have 9-15 digits (this skips things like "2019-2023")
function findPhone(text) {
  for (const match of text.match(PHONE) ?? []) {
    const digits = match.replace(/\D/g, "").length;
    if (digits >= 9 && digits <= 15) return match.trim();
  }
  return "";
}

const findLink = (text) => (text.match(GITHUB) ?? text.match(ANY_URL) ?? [""])[0];

// Email, phone, LinkedIn and GitHub found in a piece of text ("" when missing).
// Also used by the ATS optimizer to recover contact details from a page header.
export const findContactDetails = (text) => ({
  email: (text.match(EMAIL) ?? [""])[0],
  phone: findPhone(text),
  linkedin: (text.match(LINKEDIN) ?? [""])[0],
  github: (text.match(GITHUB) ?? [""])[0],
});

const isContactPart = (part) =>
  EMAIL.test(part) || LINKEDIN.test(part) || GITHUB.test(part) || findPhone(part) !== "" || /https?:\/\//i.test(part);

// ---------- Section parsers ----------

// Name, title and location from the lines above the first heading
function parseHeader(lines) {
  const parts = lines.flatMap((line) => line.split(/\s*[|•·]\s*/)).map((part) => part.trim()).filter(Boolean);
  const info = { fullName: "", headline: "", location: "" };

  for (const part of parts) {
    if (isContactPart(part)) continue;
    const words = part.split(/\s+/).length;

    if (!info.fullName && /^[\p{L}][\p{L} .'-]+$/u.test(part) && words >= 2 && words <= 5) {
      info.fullName = part;
    } else if (!info.location && /^[\p{L} .'-]+,\s*[\p{L} .'-]+$/u.test(part) && words <= 5) {
      info.location = part; // e.g. "Bengaluru, India"
    } else if (info.fullName && !info.headline && words <= 8 && part.length <= 60) {
      info.headline = part; // e.g. "Full Stack Developer"
    }
  }
  return info;
}

function parseSkills(lines) {
  return lines.flatMap((rawLine) => {
    let line = stripBullet(rawLine);
    // Drop a label like "Languages:" at the start of the line
    const colon = line.indexOf(":");
    if (colon > 0 && colon < 30) line = line.slice(colon + 1);
    return line
      .split(/[,|•·;]|\s{2,}/)
      .map((skill) => trimSeparators(skill))
      .filter((skill) => skill.length > 0 && skill.length <= 40);
  });
}

function parseExperience(lines) {
  const jobs = [];
  let job = null;

  const setDates = (target, match) => {
    target.startDate = match[1];
    target.endDate = /^(present|current|now|today)$/i.test(match[2]) ? "Present" : match[2];
  };

  // True if one of the next two lines is a short "dates" line (e.g. "Initech | 2023 – Present"),
  // which means the current line is probably a job title on its own line
  const datesLineFollows = (index) =>
    lines.slice(index + 1, index + 3).some((next) => {
      const match = !BULLET.test(next) && next.match(DATE_RANGE);
      return match && splitParts(trimSeparators(next.replace(match[0], " "))).length <= 1;
    });

  for (const [index, rawLine] of lines.entries()) {
    const isBullet = BULLET.test(rawLine);
    const line = stripBullet(rawLine);
    if (!line) continue;

    // Bullet points (and long sentences) describe the current job
    if (isBullet || (job && line.length > 90)) {
      if (!job) jobs.push((job = { role: "", company: "", startDate: "", endDate: "", bullets: [] }));
      job.bullets.push(line);
      continue;
    }

    const dateMatch = line.match(DATE_RANGE);
    const rest = trimSeparators(dateMatch ? line.replace(dateMatch[0], " ") : line);
    const restParts = splitParts(rest);
    const wordCount = rest.split(/\s+/).filter(Boolean).length;

    // A line right under a job title often holds the company and/or dates:
    //   "Software Engineer"            <- job title
    //   "Acme Corp | Jan 2023 – Now"   <- company + dates for the same job
    const canAddToJob = job && job.bullets.length === 0;
    if (canAddToJob && !job.company && restParts.length === 1 && wordCount <= 6) {
      job.company = restParts[0];
      if (dateMatch && !job.startDate) setDates(job, dateMatch);
      continue;
    }
    if (canAddToJob && !rest && dateMatch && !job.startDate) {
      setDates(job, dateMatch);
      continue;
    }

    // Many PDFs draw bullet points as shapes, so the "•" is lost. Once a job has its
    // title line, a line without its own dates is treated as one of its bullet points.
    const jobHasHeader = job && job.role && (job.company || job.startDate);
    const isNewJobTitle = wordCount <= 6 && datesLineFollows(index);
    if (jobHasHeader && !dateMatch && !isNewJobTitle) {
      job.bullets.push(line);
      continue;
    }

    // Otherwise this line starts a new job: "Role | Company | Dates"
    job = { role: restParts[0] ?? "", company: restParts[1] ?? "", startDate: "", endDate: "", bullets: [] };
    if (dateMatch) setDates(job, dateMatch);
    jobs.push(job);
  }

  return jobs;
}

function parseEducation(lines) {
  const entries = [];
  let entry = null;

  for (const rawLine of lines) {
    const line = stripBullet(rawLine);
    if (!line || /\b(gpa|cgpa|grade|percentage|marks)\b/i.test(line)) continue;

    const yearMatch = line.match(YEAR_OR_RANGE);
    const parts = splitParts(yearMatch ? line.replace(yearMatch[0], " ") : line);

    let school = "";
    let degree = "";
    for (const part of parts) {
      if (!school && SCHOOL.test(part)) school = part;
      else if (!degree && DEGREE.test(part)) degree = part;
      else if (!degree) degree = part;
      else if (!school) school = part;
    }

    // Start a new entry unless this line fills in what the current one is missing
    const fillsCurrent = entry && (!school || !entry.school) && (!degree || !entry.degree) && (!yearMatch || !entry.year);
    if (!fillsCurrent) entries.push((entry = { school: "", degree: "", year: "" }));

    entry.school ||= school;
    entry.degree ||= degree;
    if (yearMatch && !entry.year) entry.year = yearMatch[0].replace(/\s*(?:-|—|to)\s*/i, " – ");
  }

  return entries;
}

function parseProjects(lines) {
  const projects = [];
  let project = null;

  for (const rawLine of lines) {
    const isBullet = BULLET.test(rawLine);
    const line = stripBullet(rawLine);
    if (!line) continue;
    const link = findLink(line);

    // A short, non-bullet line starts a new project (its name), unless the
    // current project has no description yet (then it's the first description line)
    const startsProject = !isBullet && line.length <= 80 && (!project || project.description);
    if (startsProject) {
      const name = trimSeparators(link ? line.replace(link, " ") : line);
      projects.push((project = { name, description: "", link }));
      continue;
    }

    if (!project) projects.push((project = { name: "", description: "", link: "" }));
    if (link && !project.link) project.link = link;
    project.description = `${project.description} ${line}`.trim();
  }

  return projects;
}

// ---------- Main ----------

// "CERTIFICATIONS:" -> "Certifications" (keeps the resume's own wording for the heading)
const toHeading = (line) => {
  const text = line.replace(/[:\s]+$/, "").trim();
  return text === text.toUpperCase() ? text.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : text;
};

// An all-caps line of 1-4 words that isn't a known heading, e.g. "MY JOURNEY"
const looksLikeHeading = (line) =>
  line === line.toUpperCase() && /^[A-Z][A-Z &/-]{2,30}$/.test(line) && line.split(" ").length <= 4;

export default function parseWithRules(text) {
  const sections = { header: [], summary: [], experience: [], education: [], skills: [], projects: [] };
  const additional = []; // Sections like Certifications or Languages: [{ heading, items }]
  let currentLines = sections.header; // Where the next line goes
  let pastContactDetails = false; // An all-caps name at the very top isn't a heading

  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const heading = headingOf(line);
    // An unknown heading below the contact details starts its own section (kept under its
    // own name) instead of its content being lost in the header. Only before the first known
    // heading: inside a section, all-caps lines are usually content (e.g. "ACME CORP").
    const unknownHeading = !heading && currentLines === sections.header && pastContactDetails && looksLikeHeading(line);
    if (heading === "other" || unknownHeading) {
      const section = { heading: toHeading(line), items: [] };
      additional.push(section);
      currentLines = section.items;
    } else if (heading) {
      currentLines = sections[heading];
    } else {
      currentLines.push(line);
    }
    pastContactDetails ||= Boolean(heading) || EMAIL.test(line) || findPhone(line) !== "";
  }

  // Contact details can be anywhere, but the top of the resume is checked first
  const headerText = sections.header.join("\n");
  const firstMatch = (pattern) => (headerText.match(pattern) ?? text.match(pattern) ?? [""])[0];

  return {
    personalInfo: {
      ...parseHeader(sections.header.slice(0, 8)),
      email: firstMatch(EMAIL),
      phone: findPhone(headerText) || findPhone(text),
      linkedin: firstMatch(LINKEDIN),
      github: firstMatch(GITHUB),
    },
    summary: sections.summary.map(stripBullet).join(" "),
    experience: parseExperience(sections.experience),
    education: parseEducation(sections.education),
    skills: parseSkills(sections.skills),
    projects: parseProjects(sections.projects),
    additional: additional.map((section) => ({
      heading: section.heading,
      items: section.items.map(stripBullet).filter(Boolean),
    })),
  };
}
