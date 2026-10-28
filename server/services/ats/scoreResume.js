import { headingOf } from "../import/parseWithRules.js";
import analyzeKeywords, { findKnownSkills } from "./keywords.js";
import { extractJobTitle, matchJobTitle } from "./jobTitle.js";
import SKILLS from "./skills.js";
import {
  dateRanges,
  dateStyles,
  findCliches,
  findPronouns,
  hasNumber,
  overusedWords,
  spellingIssues,
  startsWithActionVerb,
  synonymsFor,
} from "./textRules.js";

// Rule-based ATS score out of 100: five weighted categories, each made of checks.
// The same file always gets the same score (the AI never changes the numbers).
//
// Every check: { id, category, label, passed, points, maxPoints, reason, fix }
//   passed - true when it earned all its points
//   reason - one line explaining the result, with what was found
//   fix    - what to change (null when passed)

export const CATEGORIES = [
  { id: "parseability", label: "Parseability", maxScore: 25 },
  { id: "structure", label: "Structure", maxScore: 15 },
  { id: "content", label: "Content quality", maxScore: 25 },
  { id: "keywords", label: "Keywords", maxScore: 25 },
  { id: "polish", label: "Length and polish", maxScore: 10 },
];

export const gradeFor = (score) => (score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs work" : "Poor");

const MAX_UNREADABLE_WORDS = 10; // This few words (or every page without text): treated as unreadable

const roundHalf = (value) => Math.round(value * 2) / 2;
const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const list = (items, max = 4) => items.slice(0, max).join(", ") + (items.length > max ? ` and ${items.length - max} more` : "");

function check(category, id, label, maxPoints, earned, reason, fix) {
  const points = roundHalf(Math.max(0, Math.min(maxPoints, earned)));
  return { id, category, label, passed: points >= maxPoints, points, maxPoints, reason, fix: points >= maxPoints ? null : fix };
}

// ---------- What's in the resume ----------

function analyzeText(text, parsed) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  // Standard section headings, and lines that look like headings but aren't standard ones
  const sections = new Map(); // section id -> line index
  const unknownHeadings = [];
  const looksLikeHeading = (line) => line === line.toUpperCase() && /^[A-Z][A-Z &/-]{3,30}$/.test(line) && line.split(" ").length <= 4;
  lines.forEach((line, index) => {
    const section = headingOf(line);
    if (section && !sections.has(section)) sections.set(section, index);
    else if (!section && looksLikeHeading(line)) unknownHeadings.push(line);
  });

  // The Experience section's lines, split into blocks at sub-headings ("Earlier experience"),
  // so the date order is checked within each block
  const start = sections.get("experience");
  const nextStart = [...sections.values()].filter((index) => index > (start ?? Infinity)).sort((a, b) => a - b)[0];
  const experienceBlocks = [];
  if (start !== undefined) {
    let block = [];
    for (const line of lines.slice(start + 1, nextStart)) {
      if (looksLikeHeading(line)) {
        experienceBlocks.push(block.join("\n"));
        block = [];
      } else block.push(line);
    }
    experienceBlocks.push(block.join("\n"));
  }

  // Bullet points: from the parsed experience, else lines that start with a bullet symbol,
  // else the lines under each dated entry (wrapped lines joined back together)
  let bullets = (parsed.experience ?? []).flatMap((job) => job.bullets ?? []);
  if (bullets.length < 3) {
    const symbolBullets = lines.filter((line) => /^[•●▪◦■*–-]\s*\S/.test(line)).map((line) => line.replace(/^[•●▪◦■*–-]\s*/, ""));
    if (symbolBullets.length > bullets.length) bullets = symbolBullets;
  }
  if (bullets.length < 3) {
    const entryLines = [];
    let section = null;
    let inEntry = false;
    for (const line of lines) {
      const heading = headingOf(line);
      if (heading || looksLikeHeading(line)) {
        section = heading;
        inEntry = false;
      } else if (dateRanges(line).length) inEntry = true;
      else if (inEntry && !["education", "skills", "summary"].includes(section)) {
        if (/^[a-z]/.test(line) && entryLines.length) entryLines[entryLines.length - 1] += ` ${line}`;
        else entryLines.push(line);
      }
    }
    if (entryLines.length > bullets.length) bullets = entryLines;
  }
  bullets = bullets.filter((bullet) => bullet.trim().split(/\s+/).length >= 2);

  return { lines, sections, unknownHeadings, experienceBlocks, bullets, words: text.split(/\s+/).filter(Boolean).length };
}

// ---------- 1. Parseability (25) ----------

function parseabilityChecks({ inspection, text }) {
  const C = "parseability";
  const checks = [];
  const pages = inspection.pages;
  const imagePages = inspection.imagePages.length;

  checks.push(
    imagePages === 0
      ? check(C, "readable-text", "Text can be read", 6, 6, "All text could be extracted; nothing is locked inside images.", "")
      : check(
          C,
          "readable-text",
          "Text can be read",
          6,
          imagePages >= pages ? 0 : 2,
          `Page${imagePages > 1 ? "s" : ""} ${inspection.imagePages.join(", ")} ${imagePages > 1 ? "have" : "has"} little or no readable text, likely a scanned image or text inside a picture.`,
          "Export your resume straight from Word or Google Docs as a PDF or DOCX. Don't scan it, and don't put text inside images."
        )
  );

  const columns = inspection.columns;
  const columnWhere = columns.pages[0]?.starts ? ` (text starts at about ${columns.pages[0].starts.join("% and ")}% across page ${columns.pages[0].page})` : "";
  checks.push(
    columns.detected
      ? check(
          C,
          "single-column",
          "Single-column layout",
          6,
          0,
          columns.fromTemplate
            ? "Your template uses two columns. Many ATS read straight across the page, mixing the columns' text together."
            : `The layout has more than one column${columnWhere}. Many ATS read straight across the page, mixing the columns' text together.`,
          columns.fromTemplate
            ? 'In the editor, switch to a single-column template (such as Classic), or set Columns to 1 in the Design tab.'
            : "Use a single-column layout. Put skills and contact details in their own sections from top to bottom instead of a side column."
        )
      : check(C, "single-column", "Single-column layout", 6, 6, "The text runs in a single column, so it's read in the right order.", "")
  );

  const boxes = inspection.tables + inspection.textBoxes;
  const boxDetail = [inspection.tables && `${inspection.tables} table${inspection.tables > 1 ? "s" : ""}`, inspection.textBoxes && `${inspection.textBoxes} text box${inspection.textBoxes > 1 ? "es" : ""}`].filter(Boolean).join(" and ");
  checks.push(
    boxes > 0
      ? check(
          C,
          "no-tables",
          "No tables or text boxes",
          4,
          0,
          `Found ${boxDetail}. ATS often skip text in text boxes or read table cells in the wrong order.`,
          "Replace tables and text boxes with normal lines of text: one entry per line, with headings above."
        )
      : check(C, "no-tables", "No tables or text boxes", 4, 4, "No tables or text boxes found.", "")
  );

  const hf = inspection.headerFooter;
  checks.push(
    hf.detected
      ? check(
          C,
          "header-footer",
          "Nothing important in headers/footers",
          3,
          hf.hasContact ? 0 : 1.5,
          hf.hasContact
            ? `Your contact details are in the page header/footer ("${hf.texts[0].slice(0, 60)}"). Many ATS ignore headers and footers.`
            : `There's text in the page header/footer ("${hf.texts[0].slice(0, 60)}"). Many ATS ignore it.`,
          "Move your name and contact details into the main body at the top of page 1, and keep headers/footers empty (page numbers are fine)."
        )
      : check(C, "header-footer", "Nothing important in headers/footers", 3, 3, "No text was found in page headers or footers.", "")
  );

  const { unusual, icon } = inspection.fonts;
  const symbolIssues = icon.length > 0 || inspection.iconSymbols > 0;
  const fontReasons = [
    unusual.length && `uncommon fonts (${list(unusual, 3)})`,
    icon.length && `icon fonts (${list(icon, 2)})`,
    inspection.iconSymbols && `${inspection.iconSymbols} icon symbol${inspection.iconSymbols > 1 ? "s" : ""} that come out as unreadable characters`,
  ].filter(Boolean);
  checks.push(
    check(
      C,
      "fonts-symbols",
      "Standard fonts and symbols",
      3,
      3 - (unusual.length ? 1.5 : 0) - (symbolIssues ? 1.5 : 0),
      fontReasons.length ? `Found ${fontReasons.join(" and ")}.` : "Only standard fonts are used, with no icon symbols.",
      "Use a standard font such as Arial, Calibri or Georgia, and write contact labels as words (\"Email:\") instead of icons."
    )
  );

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = text.match(/\+?\(?\d[\d\s().-]{7,}\d/g)?.find((m) => m.replace(/\D/g, "").length >= 9);
  const missing = [!email && "email", !phone && "phone number"].filter(Boolean);
  checks.push(
    check(
      C,
      "contact-findable",
      "Email and phone can be found",
      3,
      3 - missing.length * 1.5,
      missing.length
        ? `No ${missing.join(" or ")} was found in the text an ATS reads${hf.hasContact ? " (it's in the page header, which ATS often skip)" : ""}.`
        : `Found your email (${email}) and phone number.`,
      `Add your ${missing.join(" and ")} as plain text near the top of the first page.`
    )
  );
  return checks;
}

// ---------- 2. Structure (15) ----------

function structureChecks({ info, parsed }) {
  const C = "structure";
  const checks = [];
  const required = [
    ["experience", "Experience"],
    ["education", "Education"],
    ["skills", "Skills"],
  ];
  const missing = required.filter(([id]) => !info.sections.has(id)).map(([, label]) => label);
  const unknown = info.unknownHeadings.length ? ` Headings like "${list(info.unknownHeadings, 2)}" aren't standard, so an ATS may not know what they contain.` : "";
  checks.push(
    check(
      C,
      "standard-headings",
      "Standard section headings",
      5,
      5 * ((required.length - missing.length) / required.length),
      missing.length ? `Missing a standard ${list(missing)} heading.${unknown}` : "Has standard Experience, Education and Skills headings.",
      `Use the usual headings ATS look for: ${missing.length ? list(missing) : "Experience, Education, Skills"} (e.g. "Experience" instead of "My Journey").`
    )
  );

  // Experience dates, newest first. Uses the Experience section if there is one, otherwise all dates.
  const blocks = info.experienceBlocks.length ? info.experienceBlocks : [info.lines.join("\n")];
  const blockRanges = blocks.map(dateRanges);
  const ranges = blockRanges.flat();
  const outOfOrder = blockRanges.map((r) => r.find((range, i) => i > 0 && range.start > r[i - 1].start)).find(Boolean);
  checks.push(
    ranges.length < 2
      ? check(C, "reverse-chronological", "Newest experience first", 4, 4, "Not enough dated entries to check the order.", "")
      : outOfOrder
        ? check(
            C,
            "reverse-chronological",
            "Newest experience first",
            4,
            0,
            `Your jobs aren't newest first: "${outOfOrder.text}" comes after an older one.`,
            "List jobs in reverse-chronological order: your current or most recent role first."
          )
        : check(C, "reverse-chronological", "Newest experience first", 4, 4, `Your ${ranges.length} dated entries are newest first.`, "")
  );

  const styles = dateStyles(info.lines.join("\n"));
  checks.push(
    styles.length > 1
      ? check(
          C,
          "consistent-dates",
          "Consistent date format",
          3,
          0,
          `Dates are written in ${styles.length} different ways (${styles.map((s) => `"${s.example}"`).join(", ")}).`,
          `Pick one format and use it everywhere, for example "${styles[0].style}".`
        )
      : check(C, "consistent-dates", "Consistent date format", 3, 3, styles.length ? `All dates use the "${styles[0].style}" style.` : "Dates are consistent.", "")
  );

  // Name and contact details at the top: the name in the first lines, then the contact
  // details in the lines right below it. Name, email and phone are what matter most
  // (1 + 0.75 + 0.75 points); location and LinkedIn are 0.25 each. Rounded down to the half
  // point, so a missing location or LinkedIn costs 0.5 and a missing phone or email costs 1.
  const fullName = parsed.personalInfo?.fullName ?? "";
  const nameAt = fullName ? info.lines.findIndex((line) => line.toLowerCase().includes(fullName.toLowerCase())) : -1;
  const hasName = nameAt >= 0 && nameAt < Math.max(10, info.lines.length * 0.2);
  const contactBlock = (hasName ? info.lines.slice(nameAt, nameAt + 6) : info.lines.slice(0, 8)).join("\n");
  const found = {
    email: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(contactBlock),
    phone: /\+?\(?\d[\d\s().-]{7,}\d/.test(contactBlock),
    location: Boolean(parsed.personalInfo?.location) && contactBlock.includes(parsed.personalInfo.location),
    LinkedIn: /linkedin\.com\//i.test(contactBlock),
  };
  const missingCore = [!hasName && "your name", !found.email && "email", !found.phone && "phone"].filter(Boolean);
  const missingExtra = ["location", "LinkedIn"].filter((item) => !found[item]);
  const rawPoints = (hasName ? 1 : 0) + (found.email ? 0.75 : 0) + (found.phone ? 0.75 : 0) + (2 - missingExtra.length) * 0.25;
  const contactPoints = Math.floor(rawPoints * 2) / 2;
  checks.push(
    check(
      C,
      "contact-top",
      "Name and contact details at the top",
      3,
      contactPoints,
      missingCore.length
        ? `At the top, couldn't find: ${[...missingCore, ...missingExtra].join(", ")}.`
        : missingExtra.length
          ? `Your name, email and phone are at the top; missing: ${missingExtra.join(" and ")}.`
          : "Your name is at the top, followed by your email, phone, location and LinkedIn.",
      missingCore.length
        ? "Start the resume with your full name, then a line with your email, phone, location and LinkedIn."
        : `Add your ${missingExtra.join(" and ")} to the contact line under your name.`
    )
  );
  return checks;
}

// ---------- 3. Content quality (25) ----------

function contentChecks({ info, parsed, text }) {
  const C = "content";
  const checks = [];
  const { bullets } = info;
  const noBullets = bullets.length === 0;
  const noBulletsReason = "No bullet points were found under your experience.";
  const noBulletsFix = "Describe each job with 3–5 bullet points that start with an action verb and show a result.";

  const withVerb = bullets.filter((b) => startsWithActionVerb(b));
  const verbShare = bullets.length ? withVerb.length / bullets.length : 0;
  const weakStart = bullets.find((b) => !startsWithActionVerb(b));
  checks.push(
    check(
      C,
      "action-verbs",
      "Bullets start with action verbs",
      6,
      6 * Math.min(1, verbShare / 0.8),
      noBullets ? noBulletsReason : `${withVerb.length} of ${bullets.length} bullets (${percent(withVerb.length, bullets.length)}%) start with an action verb.${weakStart && verbShare < 0.8 ? ` For example: "${weakStart.slice(0, 60)}${weakStart.length > 60 ? "…" : ""}"` : ""}`,
      noBullets ? noBulletsFix : 'Start each bullet with a strong verb such as "Led", "Built", "Reduced" or "Launched" instead of "Responsible for" or "Worked on".'
    )
  );

  const quantified = bullets.filter(hasNumber);
  const quantShare = bullets.length ? quantified.length / bullets.length : 0;
  checks.push(
    check(
      C,
      "quantified",
      "Results are measured",
      6,
      6 * Math.min(1, quantShare / 0.5),
      noBullets ? noBulletsReason : `${quantified.length} of ${bullets.length} bullets (${percent(quantified.length, bullets.length)}%) include a number, percentage or amount.`,
      noBullets ? noBulletsFix : "Add numbers to at least half of your bullets: time or money saved, users, revenue, team size, or % improvement."
    )
  );

  const tooShort = bullets.filter((b) => b.split(/\s+/).length < 6);
  const tooLong = bullets.filter((b) => b.split(/\s+/).length > 30);
  const goodLength = bullets.length - tooShort.length - tooLong.length;
  checks.push(
    check(
      C,
      "bullet-length",
      "Bullets are a good length",
      4,
      bullets.length ? 4 * (goodLength / bullets.length) : 0,
      noBullets
        ? noBulletsReason
        : tooShort.length + tooLong.length === 0
          ? `All ${bullets.length} bullets are 6–30 words long.`
          : `${[tooShort.length && `${tooShort.length} too short (under 6 words)`, tooLong.length && `${tooLong.length} too long (over 30 words)`].filter(Boolean).join(" and ")}.`,
      noBullets ? noBulletsFix : "Keep each bullet to one or two lines (about 6–30 words): what you did, how, and the result."
    )
  );

  const pronouns = findPronouns(text);
  checks.push(
    check(
      C,
      "no-pronouns",
      "No first-person pronouns",
      3,
      pronouns.length === 0 ? 3 : pronouns.length <= 1 ? 1.5 : 0,
      pronouns.length ? `Uses first-person words: ${pronouns.map((p) => `"${p}"`).join(", ")}.` : 'No "I", "me" or "my": the resume uses the usual implied first person.',
      'Drop "I", "me" and "my": write "Led a team of 5" instead of "I led a team of 5".'
    )
  );

  const cliches = findCliches(text);
  checks.push(
    check(
      C,
      "no-cliches",
      "No clichés",
      3,
      cliches.length === 0 ? 3 : cliches.length === 1 ? 1.5 : 0,
      cliches.length ? `Found ${cliches.length} cliché${cliches.length > 1 ? "s" : ""}: ${cliches.map((c) => `"${c}"`).join(", ")}.` : "No overused buzzwords found.",
      'Replace buzzwords with proof: instead of "team player", describe something you achieved with a team.'
    )
  );

  const summaryWords = (parsed.summary ?? "").split(/\s+/).filter(Boolean).length;
  const hasSummarySection = info.sections.has("summary");
  checks.push(
    summaryWords >= 15 && summaryWords <= 100
      ? check(C, "summary", "Has a professional summary", 3, 3, `Has a summary of ${summaryWords} words.`, "")
      : check(
          C,
          "summary",
          "Has a professional summary",
          3,
          summaryWords > 0 || hasSummarySection ? 1.5 : 0,
          summaryWords > 100 ? `The summary is long (${summaryWords} words).` : summaryWords > 0 ? `The summary is very short (${summaryWords} words).` : "No summary found at the top.",
          "Add a 2–4 sentence summary at the top: your title, years of experience, key skills, and what you're looking for."
        )
  );
  return checks;
}

// ---------- 4. Keywords (25) ----------

function keywordChecks({ info, text, parsed, jobDescription, jobTitle }) {
  const C = "keywords";
  const checks = [];

  if (jobDescription) {
    const result = analyzeKeywords(jobDescription, text);
    const skills = [...result.matched, ...result.missing].filter((k) => k.type === "skill");
    const others = [...result.matched, ...result.missing].filter((k) => k.type === "keyword");
    const weight = (k) => (k.required ? 4 : 3);
    const skillTotal = skills.reduce((sum, k) => sum + weight(k), 0);
    const skillMatched = result.matched.filter((k) => k.type === "skill").reduce((sum, k) => sum + weight(k), 0);
    const missingSkills = result.missing.filter((k) => k.type === "skill").map((k) => k.term);

    checks.push(
      skillTotal === 0
        ? check(C, "job-skills", "Skills and tools from the job", 15, 15 * (result.score / 100), "The job description doesn't name specific tools; see the keyword check.", "")
        : check(
            C,
            "job-skills",
            "Skills and tools from the job",
            15,
            15 * (skillMatched / skillTotal),
            `Matches ${skills.length - missingSkills.length} of ${skills.length} skills the job asks for${missingSkills.length ? `; missing ${list(missingSkills)}` : ""}.`,
            `If you have them, add ${list(missingSkills)} to your Skills section and show them in a bullet point. Don't add skills you don't have.`
          )
    );

    const otherMatched = result.matched.filter((k) => k.type === "keyword").length;
    const missingOthers = result.missing.filter((k) => k.type === "keyword").map((k) => k.term);
    checks.push(
      others.length === 0
        ? check(C, "job-keywords", "Other important words from the job", 5, 5, "No other repeated keywords in the job description.", "")
        : check(
            C,
            "job-keywords",
            "Other important words from the job",
            5,
            5 * (otherMatched / others.length),
            `Uses ${otherMatched} of ${others.length} other key terms from the job${missingOthers.length ? `; missing ${list(missingOthers.map((t) => `"${t}"`))}` : ""}.`,
            "Mirror the job's wording where it truthfully describes your work, especially in your summary and bullets."
          )
    );

    const title = jobTitle || extractJobTitle(jobDescription);
    if (!title) {
      checks.push(check(C, "job-title", "Job title", 5, 5, "Couldn't find a job title in the job description to compare.", ""));
    } else {
      const match = matchJobTitle(title, text);
      checks.push(
        check(
          C,
          "job-title",
          `Job title ("${title}")`,
          5,
          match.level === "full" ? 5 : match.level === "partial" ? 2.5 : 0,
          match.level === "full"
            ? `Your resume uses the job title "${title}".`
            : match.level === "partial"
              ? `Your resume has part of the job title, but not "${match.missingWords.join(" ")}".`
              : `The job title "${title}" doesn't appear in your resume.`,
          `If it fits your experience, use the job's title in your headline or summary (e.g. "${title} with 5 years of experience").`
        )
      );
    }
    return { checks, keywords: { ...result, jobTitle: title ?? null } };
  }

  // No job description: check for a clear, specific skills section instead
  const listed = parsed.skills ?? [];
  const hasSkillsSection = info.sections.has("skills");
  checks.push(
    check(
      C,
      "skills-section",
      "Clear skills section",
      10,
      !hasSkillsSection ? 0 : listed.length >= 6 ? 10 : listed.length >= 3 ? 5 : 2.5,
      !hasSkillsSection ? "No Skills section was found." : `Your Skills section lists ${listed.length} skill${listed.length === 1 ? "" : "s"}.`,
      'Add a "Skills" section listing 6–15 specific tools and abilities, separated by commas.'
    )
  );

  const known = findKnownSkills(text);
  checks.push(
    check(
      C,
      "specific-tools",
      "Names specific tools and technologies",
      10,
      10 * Math.min(1, known.length / 10),
      known.length ? `Names ${known.length} recognised tools/skills (${list(known, 6)}).` : "No specific tools or technologies were recognised.",
      "Name the exact tools you use (e.g. \"Excel, SQL, Salesforce\" or \"React, Node.js, AWS\") rather than general terms."
    )
  );

  const bulletText = info.bullets.join("\n");
  const inContext = findKnownSkills(bulletText);
  checks.push(
    check(
      C,
      "skills-in-context",
      "Skills shown in your experience",
      5,
      inContext.length >= 3 ? 5 : inContext.length * 1.5,
      inContext.length ? `${inContext.length} of your skills also appear in your bullet points (${list(inContext, 4)}).` : "None of your skills are mentioned in your bullet points.",
      "Mention your key tools inside your bullets too (e.g. \"Built a dashboard in React\"), not only in the Skills list."
    )
  );
  return { checks, keywords: null, detectedSkills: known };
}

// ---------- 5. Length and polish (10) ----------

function polishChecks({ inspection, info, text, parsed, jobDescription }) {
  const C = "polish";
  const checks = [];
  const pages = inspection.pages;
  const pageLabel = `${pages} page${pages > 1 ? "s" : ""}${inspection.pagesEstimated ? " (estimated)" : ""}`;
  checks.push(
    info.words < 200
      ? check(C, "length", "1–2 pages", 4, 2, `Very short: about ${info.words} words.`, "Add more detail to your experience: aim for 400–800 words on 1–2 pages.")
      : pages <= 2
        ? check(C, "length", "1–2 pages", 4, 4, `${pageLabel}, about ${info.words} words.`, "")
        : check(
            C,
            "length",
            "1–2 pages",
            4,
            pages === 3 ? 2 : 0,
            `${pageLabel}: longer than most recruiters read.`,
            "Cut it to 1–2 pages: keep the last 10–15 years and the most relevant achievements."
          )
  );

  // Repeated words, ignoring the person's name, section headings and every word that's part of
  // a technology, skill or keyword: the skills dictionary (all spellings, so "node" from
  // Node.js and "native" from React Native), the resume's Skills list and the job's keywords
  const wordsOf = (terms) => terms.flatMap((term) => term.toLowerCase().split(/[^a-z]+/)).filter(Boolean);
  let jobKeywords = [];
  if (jobDescription) {
    const { matched, missing } = analyzeKeywords(jobDescription, "");
    jobKeywords = [...matched, ...missing].map((keyword) => keyword.term);
  }
  const ignore = new Set([
    ...wordsOf([parsed.personalInfo?.fullName ?? ""]),
    ...wordsOf(SKILLS.flatMap((skill) => [skill.name, ...skill.terms])),
    ...wordsOf(parsed.skills ?? []),
    ...wordsOf(jobKeywords),
    "experience", "education", "skills", "projects", "summary", "present",
  ]);
  const overused = overusedWords(text, ignore);
  // A suggestion per word: its own synonyms, or a plain "vary it" when there are none
  const suggestion = ({ word }) => {
    const synonyms = synonymsFor(word);
    return synonyms.length
      ? `instead of repeating "${word}", try ${synonyms.slice(0, -1).map((s) => `"${s}"`).join(", ")} or "${synonyms.at(-1)}"`
      : `"${word}": try varying this word`;
  };
  checks.push(
    check(
      C,
      "overused-words",
      "No overused words",
      3,
      3 - overused.length,
      overused.length ? `Repeated a lot: ${list(overused.map((o) => `"${o.word}" (${o.count}×)`), 3)}.` : "No word is overused.",
      overused.length ? `Vary your wording: ${overused.slice(0, 3).map(suggestion).join("; ")}.` : ""
    )
  );

  const typos = spellingIssues(text);
  checks.push(
    check(
      C,
      "spelling",
      "No spelling-looking problems",
      3,
      typos.length === 0 ? 3 : typos.length <= 2 ? 1.5 : 0,
      typos.length ? `Possible typos: ${list(typos, 4)}.` : "No obvious typos found (a quick check, not a full spell-check).",
      "Fix these, then run a full spell-check in Word or Google Docs before sending."
    )
  );
  return checks;
}

// ---------- Total ----------

// Category scores, total score and grade from a list of checks
export function totals(checks) {
  const categories = CATEGORIES.map((category) => {
    const own = checks.filter((c) => c.category === category.id);
    return {
      ...category,
      score: roundHalf(own.reduce((sum, c) => sum + c.points, 0)),
      passed: own.filter((c) => c.passed).length,
      total: own.length,
    };
  });
  const score = Math.round(categories.reduce((sum, c) => sum + c.score, 0));
  return { score, grade: gradeFor(score), categories };
}

export default function scoreResume({ text, inspection, parsed, jobDescription, jobTitle }) {
  const info = analyzeText(text, parsed);
  const keywordResult = keywordChecks({ info, text, parsed, jobDescription, jobTitle });

  let checks = [
    ...parseabilityChecks({ inspection, text }),
    ...structureChecks({ info, parsed }),
    ...contentChecks({ info, parsed, text }),
    ...keywordResult.checks,
    ...polishChecks({ inspection, info, text, parsed, jobDescription }),
  ];

  // Almost no readable text (e.g. a scanned resume): an ATS sees an empty page, so checks
  // like "no typos" or "no clichés" can't pass just because there's nothing to read.
  // (A short resume with real text is scored normally; its length check says it's short.)
  const unreadable = inspection.imagePages.length >= inspection.pages || info.words <= MAX_UNREADABLE_WORDS;
  if (unreadable) {
    checks = checks.map((c) =>
      c.category === "parseability"
        ? c
        : {
            ...c,
            passed: false,
            points: 0,
            reason: "Couldn't check this: almost no text could be read from your file.",
            fix: "Upload a resume with real, selectable text (exported from Word or Google Docs), not a scan or image.",
          }
    );
  }

  return {
    ...totals(checks),
    checks,
    keywords: keywordResult.keywords,
    detectedSkills: keywordResult.detectedSkills ?? null,
    bullets: info.bullets,
  };
}
