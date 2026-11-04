import { htmlToText } from "../../utils/richText.js";
import { skillMatcher } from "../jobs/matchReport.js";
import { findBannedPhrase } from "./bannedPhrases.js";
import { TARGET_WORDS } from "./generateLetter.js";

// The editor's letter strength check (a mini ATS check for cover letters). Works on the letter as
// it is now, including the user's own edits. Returns { checks: [{ id, label, passed, tip }],
// passed, total }:
//   opening      - specific: names the role or company and a top skill or a result; no cliché opener
//   evidence     - the job's top two must-haves are answered in the body
//   motivation   - a "why this company" paragraph from the user's own answers (no placeholder)
//   cliches      - no banned phrase
//   length       - close to the target for its length setting
//   placeholders - none left unfilled

const PLACEHOLDER = /\[[^\]\d<>]{1,120}\]/g; // For finding them all
const HAS_PLACEHOLDER = /\[[^\]\d<>]{1,120}\]/; // For yes/no tests (no global state)
const MOTIVATION_PLACEHOLDER = /\[(Why this company\?|Warum dieses Unternehmen\?)/;
const CLICHE_OPENER = /^(I am writing to|I'm writing to|Hiermit bewerbe ich mich|To whom it may concern)/i;
const LENGTH_RANGES = { short: [110, 200], standard: [190, 320], detailed: [270, 430] };

// The body's paragraphs as plain text (greeting first, sign-off last)
const paragraphsOf = (html) => (String(html ?? "").match(/<p[^>]*>[\s\S]*?<\/p>/g) ?? []).map((p) => htmlToText(p).replace(/\s+/g, " ").trim()).filter(Boolean);

export default function letterStrength(letter, analysis = {}) {
  const de = letter.language === "de";
  const paragraphs = paragraphsOf(letter.body);
  const opening = paragraphs[1] ?? "";
  const middle = paragraphs.slice(2, -1).join("\n");
  const withOpening = paragraphs.slice(1, -1).join("\n"); // The opening cites evidence too
  const text = paragraphs.join("\n");
  const role = analysis.title || "";
  const company = letter.companyName || analysis.company || "";
  const top = (analysis.mustHave ?? []).slice(0, 2);
  const mentions = (value, haystack) => Boolean(value) && haystack.toLowerCase().includes(value.toLowerCase());
  const checks = [];
  const add = (id, label, passed, tip) => checks.push({ id, label, passed, tip: passed ? "" : tip });

  const namesJob = mentions(role, opening) || mentions(company, opening);
  const concrete = top.some((skill) => skillMatcher(skill)(opening)) || /\d/.test(opening.replace(PLACEHOLDER, ""));
  add(
    "opening",
    "Specific opening",
    Boolean(opening) && !CLICHE_OPENER.test(opening) && !findBannedPhrase(opening) && namesJob && concrete && !HAS_PLACEHOLDER.test(opening),
    "Open with the job's most important need and your strongest matching result, naming the role. Pick another opening above, or write one."
  );

  const missing = top.filter((skill) => !skillMatcher(skill)(withOpening));
  add(
    "evidence",
    "Evidence for the top must-haves",
    missing.length === 0,
    `Show where you used ${missing.join(de ? " und " : " and ")}, with a result, in the main paragraphs.`
  );

  add(
    "motivation",
    "Why this company",
    !MOTIVATION_PLACEHOLDER.test(text) && (Boolean(letter.whyCompany || letter.companyInterest) || mentions(company, middle)),
    'Say in your own words why this company: answer "Why this company?" or "What interests you about the company?" and regenerate, or write it in.'
  );

  const cliche = findBannedPhrase(text);
  add("cliches", "No clichés", !cliche, `Replace "${cliche}" with something specific you did.`);

  const words = text.split(/\s+/).filter(Boolean).length;
  const [low, high] = LENGTH_RANGES[letter.length] ?? LENGTH_RANGES.standard;
  add(
    "length",
    "Length",
    words >= low && words <= high,
    words < low
      ? `${words} words: a little short for a "${letter.length}" letter (about ${TARGET_WORDS[letter.length] ?? 250}). Your achievement story adds the most.`
      : `${words} words: long for a "${letter.length}" letter (about ${TARGET_WORDS[letter.length] ?? 250}). Trim to the strongest examples.`
  );

  const left = [...new Set([...`${letter.subject ?? ""}\n${text}`.matchAll(PLACEHOLDER)].map((match) => match[0]))];
  add("placeholders", "No unfilled placeholders", left.length === 0, `Fill in or remove: ${left.join(", ")}`);

  return { checks, passed: checks.filter((check) => check.passed).length, total: checks.length, words };
}
