// Language rules for the ATS checker: action verbs, clichés, pronouns, date formats,
// spelling-style problems and overused words. Each helper returns what it found
// (not just true/false), so every check can explain itself.

// ---------- Action verbs ----------

// Strong verbs to start a bullet with (past and present forms both count)
const ACTION_VERBS = new Set(
  `accelerate achieve acquire adapt administer advance advise advocate align analyse analyze architect arrange assemble assess
  audit author automate balance boost budget build calculate campaign champion clarify coach code collaborate compile complete
  compose conceive conduct configure consolidate construct consult convert coordinate create cultivate curate cut debug decrease
  define delegate deliver demonstrate deploy design detect develop devise diagnose direct discover document double draft drive
  edit educate eliminate enable encourage engineer enhance establish evaluate examine execute expand expedite experiment
  facilitate finalize forecast forge formulate found generate grow guide halve head hire identify implement improve increase
  influence initiate innovate inspect install institute instruct integrate interview introduce invent investigate launch lead
  leverage lower maintain manage map market maximize measure mentor merge migrate minimize model moderate modernize monitor
  motivate navigate negotiate onboard operate optimize orchestrate organize originate outperform overhaul oversee own partner
  perform pilot pioneer plan present prevent prioritize process produce program promote propose prototype provide publish
  qualify raise rank rebuild recommend reconcile recruit redesign reduce re-engineer reengineer refactor refine reorganize
  repair replace report research reshape resolve restore restructure revamp review revise revitalize run save scale schedule
  screen secure select sell ship simplify slash solve source spearhead standardize steer streamline strengthen structure
  supervise surpass survey sustain teach test train transform translate triple troubleshoot unify upgrade validate verify
  visualize win write clean prepare`.split(/\s+/)
);
const IRREGULAR = {
  built: "build", led: "lead", drove: "drive", grew: "grow", ran: "run", wrote: "write", won: "win", taught: "teach",
  oversaw: "oversee", sold: "sell", made: "make", brought: "bring", began: "begin", chose: "choose", rebuilt: "rebuild",
  troubleshot: "troubleshoot", cut: "cut", set: "set", spearheaded: "spearhead", forged: "forge", founded: "found",
};
// Common ways bullets start that describe duties instead of results
const WEAK_OPENERS = /^(responsible for|worked on|working on|helped|helping|assisted|assisting|duties included|involved in|tasked with|in charge of|participated in|handled|was |were |did |doing )/i;

// "Developed" / "Develops" / "Develop" -> "develop"
function baseVerb(word) {
  const w = word.toLowerCase();
  if (IRREGULAR[w]) return IRREGULAR[w];
  const candidates = [w];
  if (w.endsWith("ied")) candidates.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ed")) candidates.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3)); // grouped, migrated, planned
  if (w.endsWith("es")) candidates.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith("s")) candidates.push(w.slice(0, -1));
  if (w.endsWith("ing")) candidates.push(w.slice(0, -3), `${w.slice(0, -3)}e`);
  return candidates.find((c) => ACTION_VERBS.has(c)) ?? null;
}

// The bullet's first word if it's an action verb, otherwise null
export function startsWithActionVerb(bullet) {
  const text = bullet.replace(/^[^\p{L}]+/u, "");
  if (WEAK_OPENERS.test(text)) return null;
  const first = text.match(/^[\p{L}-]+/u)?.[0];
  return first ? baseVerb(first) : null;
}

// ---------- Numbers, pronouns and clichés ----------

export const hasNumber = (text) => /\d|%|\$|€|£|₹|\b(one|two|three|four|five|six|seven|eight|nine|ten|twice|double|triple|half)\b/i.test(text);

// "I" only as a capital letter (so "i.e." isn't counted); no "us" (it's usually "US")
const PRONOUNS = /\bI\b(?!\.)|\b(me|my|mine|myself|we|our|ours)\b/g;
export const findPronouns = (text) => [...new Set((text.match(PRONOUNS) ?? []).map((p) => (p === "I" ? p : p.toLowerCase())))];

const CLICHES = [
  "hard-working", "hardworking", "hard working", "team player", "go-getter", "results-driven", "results-oriented", "result-oriented",
  "self-starter", "self starter", "think outside the box", "thinks outside the box", "thinking outside the box", "out of the box",
  "synergy", "go-to person", "proven track record", "dynamic individual", "detail-oriented professional", "highly motivated",
  "people person", "fast learner", "quick learner", "works well under pressure", "excellent communication skills",
  "strong work ethic", "best of breed", "value add", "wears many hats", "perfectionist",
];
export const findCliches = (text) => {
  const lower = text.toLowerCase();
  const found = CLICHES.filter((cliche) => new RegExp(`(^|[^a-z])${cliche.replace(/[-\s]/g, "[-\\s]?")}([^a-z]|$)`).test(lower));
  // "hard-working" and "hard working" are the same cliché: keep the first spelling only
  const seen = new Set();
  return found.filter((cliche) => {
    const key = cliche.replace(/[-\s]/g, "");
    return !seen.has(key) && seen.add(key);
  });
};

// ---------- Dates ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const LONG_MONTHS = /\b(january|february|march|april|june|july|august|september|october|november|december)\s+(19|20)\d{2}\b/gi;
const SHORT_MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(19|20)\d{2}\b/gi;
const NUMERIC_SLASH = /\b(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/g;
const NUMERIC_DASH = /\b(0?[1-9]|1[0-2])-(19|20)\d{2}\b|\b(19|20)\d{2}-(0[1-9]|1[0-2])\b/g;

// The month-date styles used ("Jan 2024", "January 2024", "01/2024", "01-2024").
// Year-only dates ("2019 – 2023") are fine alongside any of them.
export function dateStyles(text) {
  const styles = [
    { style: "Jan 2024", examples: text.match(SHORT_MONTHS) ?? [] },
    { style: "January 2024", examples: text.match(LONG_MONTHS) ?? [] },
    { style: "01/2024", examples: text.match(NUMERIC_SLASH) ?? [] },
    { style: "01-2024", examples: text.match(NUMERIC_DASH) ?? [] },
  ];
  return styles.filter((s) => s.examples.length > 0).map((s) => ({ style: s.style, example: s.examples[0] }));
}

// "Mar 2021" / "03/2021" / "2021" -> a sortable number (year * 12 + month); null if not a date
export function dateValue(text) {
  const t = text.trim().toLowerCase();
  if (/^(present|current|now|today)$/.test(t)) return Infinity;
  const month = MONTHS.findIndex((m) => t.startsWith(m));
  const year = Number(t.match(/(19|20)\d{2}/)?.[0]);
  if (!year) return null;
  if (month >= 0) return year * 12 + month;
  const numeric = t.match(/^(\d{1,2})[/-](19|20)\d{2}$/);
  if (numeric) return year * 12 + Number(numeric[1]) - 1;
  return year * 12;
}

const DATE = "(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s*(?:19|20)\\d{2}|\\d{1,2}[/-](?:19|20)\\d{2}|(?:19|20)\\d{2})";
const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|present|current|now|today)`, "gi");

// All date ranges in the order they appear: [{ text, start }]
export const dateRanges = (text) =>
  [...text.matchAll(DATE_RANGE)].map((m) => ({ text: m[0], start: dateValue(m[1]) })).filter((r) => r.start !== null);

// ---------- Spelling-style problems and overused words ----------

const COMMON_MISSPELLINGS = {
  teh: "the", recieve: "receive", recieved: "received", acheive: "achieve", acheived: "achieved", managment: "management",
  enviroment: "environment", developement: "development", succesful: "successful", sucessful: "successful",
  successfull: "successful", responsiblity: "responsibility", responsibilites: "responsibilities", experiance: "experience",
  seperate: "separate", occured: "occurred", definately: "definitely", accomodate: "accommodate", comunication: "communication",
  communcation: "communication", leadeship: "leadership", maintainance: "maintenance", independant: "independent",
  knowlege: "knowledge", proffesional: "professional", profesional: "professional", recomend: "recommend",
  begining: "beginning", calender: "calendar", collegue: "colleague", commited: "committed", untill: "until",
  analysys: "analysis", strategys: "strategies", buisness: "business", bussiness: "business", technicial: "technical",
  sucess: "success", acomplished: "accomplished", achived: "achieved", managent: "management", budgett: "budget",
};

// Things that look like typos, without a full dictionary: known misspellings, a word typed
// twice ("the the"), a letter repeated 3+ times, and a missing space after punctuation
export function spellingIssues(text) {
  const issues = [];
  for (const word of text.match(/\b[a-z]+\b/gi) ?? []) {
    const fix = COMMON_MISSPELLINGS[word.toLowerCase()];
    if (fix) issues.push(`"${word}" → "${fix}"`);
  }
  for (const m of text.matchAll(/\b([a-z]{2,})\s+\1\b/gi)) issues.push(`"${m[0]}" (word repeated)`);
  for (const m of text.matchAll(/\b[a-z]*([a-z])\1\1[a-z]*\b/gi)) {
    if (!/^(www|x+|i+|v+)$/i.test(m[0])) issues.push(`"${m[0]}" (letter repeated)`);
  }
  for (const m of text.matchAll(/\b[a-z]{2,}[.,;][A-Z][a-z]+/g)) {
    if (!/\.(js|ts|io|com|net|org|dev|ai|py|NET)\b/i.test(m[0])) issues.push(`"${m[0]}" (missing space)`);
  }
  return [...new Set(issues)];
}

const COMMON_WORDS = new Set(
  `about after also because before being between both could does each from have into just like make many more most much only
  other over same some such than that their them then there these they this those through very well were what when where
  which while will with within would year years month months team teams work worked working company role using used`.split(/\s+/)
);

// Words (4+ letters) used so often they stand out, e.g. "managed" six times.
//   ignore - words to skip (the person's name, known skills, section headings)
export function overusedWords(text, ignore = new Set()) {
  const words = (text.toLowerCase().match(/\b[a-z][a-z-]{3,}\b/g) ?? []).filter((w) => !COMMON_WORDS.has(w) && !ignore.has(w));
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  const limit = Math.max(5, Math.round(words.length * 0.012)); // ~1.2% of the words, at least 5 times
  return [...counts.entries()]
    .filter(([, count]) => count >= limit)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));
}
