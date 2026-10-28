import SKILLS from "./skills.js";

// Rule-based keyword matching: finds the important words in a job description and
// checks which of them appear in the resume. No AI involved, so it always works.

const SKILL_WEIGHT = 3; // A known skill counts three times as much as a general keyword
const KEYWORD_WEIGHT = 1;
const MAX_KEYWORDS = 12; // General keywords kept (on top of the known skills)

// Common English words plus job-posting filler that says nothing about the role
const STOPWORDS = new Set(
  `a about above across after again against all also am an and any are as at be because been before being
  below between both but by can could did do does doing down during each either else etc even ever every
  few for from further get gets getting give given go going good great had has have having he her here
  hers him his how however i if in into is it its itself just know like make makes making many may me
  more most much must my need needs new no nor not now of off often on once one only or other our ours
  out over own per please plus rather really same see seeking several shall she should so some such than
  that the their them then there these they this those through to too toward under until up upon us use
  used uses using very via want wants was way we well were what when where whether which while who whom
  whose why will with within without would yet you your yours yourself
  ability able apply applicant applicants applying based benefit benefits best bonus candidate candidates
  career careers company companies competitive culture day days description diverse diversity eligible
  employee employees employer employment environment equal excellent exciting experience experienced
  hiring ideal include includes including individual join level life location looking member members
  minimum offer offers opportunity opportunities paid part people period plus position positions
  preferred proven qualification qualifications related requirement requirements required responsibilities
  responsibility responsible role roles salary skill skills strong successful team teams time today
  understanding work working works world year years
  build builds building built create creating deliver delivering design designing develop developing drive
  end ensure familiarity familiar feature features help helping improve improving knowledge maintain
  maintaining own owning part take taking write writing nice
  junior senior lead leads intern interns internship principal staff mid entry trainee graduate graduates
  remote hybrid onsite office relocation visa sponsorship fulltime permanent
  hire hires hired recruiting recruiter interview interviews resume cv cover letter
  colleague colleagues employer join joining hiring paced passionate motivated`.split(/\s+/)
);

// Lines that usually list what the employer actually requires
const REQUIREMENT_LINE =
  /require|must|qualif|proficien|experience (?:with|in)|knowledge of|familiar|you have|you bring|you'll need|nice to have|preferred|bonus|skills/i;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matches a term as a whole word. Symbols count as part of a word (so "Java" doesn't
// match "JavaScript" and "JS" doesn't match the "js" in "Node.js"), and a space in the
// term also matches a hyphen ("problem solving" = "problem-solving").
const termPattern = (term) =>
  `(?<![\\p{L}\\p{N}+#.])${escapeRegex(term).replace(/ /g, "[\\s-]+")}(?![\\p{L}\\p{N}+#])`;

export const containsAnyTerm = (text, terms, caseSensitive) =>
  new RegExp(terms.map(termPattern).join("|"), caseSensitive ? "u" : "iu").test(text);

// Known skills (from skills.js) that appear in a text, e.g. ["React", "Node.js"]
export const findKnownSkills = (text) =>
  SKILLS.filter((skill) => containsAnyTerm(text, skill.terms, skill.caseSensitive)).map((skill) => skill.name);

// Very light stemming so "developing", "developed" and "develops" all match "develop"
const stem = (word) => {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
};

const tokenize = (text) => text.toLowerCase().match(/[\p{L}][\p{L}\p{N}+#]*/gu) ?? [];
const isContentWord = (word) => word.length >= 3 && !STOPWORDS.has(word);

// Known skills mentioned in the job description (more important if on a "requirements" line)
function findSkills(jobDescription) {
  const requirementText = jobDescription
    .split("\n")
    .filter((line) => REQUIREMENT_LINE.test(line))
    .join("\n");

  return SKILLS.filter((skill) => containsAnyTerm(jobDescription, skill.terms, skill.caseSensitive)).map(
    (skill) => ({
      skill,
      required: containsAnyTerm(requirementText, skill.terms, skill.caseSensitive),
    })
  );
}

// Other repeated words and two-word phrases ("customer onboarding", "budget") that the
// skills list doesn't know about. Phrases must appear at least twice; single words twice,
// or once on a requirements line.
function findOtherKeywords(jobDescription, skillWords) {
  const counts = new Map(); // term -> { count, required }
  const add = (term, required) => {
    const entry = counts.get(term) ?? { count: 0, required: false };
    entry.count += 1;
    entry.required ||= required;
    counts.set(term, entry);
  };

  for (const line of jobDescription.split("\n")) {
    const required = REQUIREMENT_LINE.test(line);
    // Split into phrases at punctuation so a pair never spans two sentences or list items
    for (const phrase of line.split(/[.,;:!?()•·|/]+/)) {
      const words = tokenize(phrase);
      words.forEach((word, index) => {
        if (!isContentWord(word) || /\d/.test(word)) return;
        add(word, required);
        const next = words[index + 1];
        if (next && isContentWord(next)) add(`${word} ${next}`, required);
      });
    }
  }

  const candidates = [...counts.entries()]
    .map(([term, { count, required }]) => ({ term, score: count + (required ? 1 : 0), isPhrase: term.includes(" ") }))
    .filter(({ term, score, isPhrase }) => (isPhrase ? counts.get(term).count >= 2 : score >= 2) && !skillWords.has(term))
    // Phrases first (they're more specific), then the highest scores
    .sort((a, b) => Number(b.isPhrase) - Number(a.isPhrase) || b.score - a.score);

  // Keep the best ones, skipping any that share a word (or its stem) with one already chosen
  // ("full stack" + "stack developer", "customer onboarding" + "customer", "engineer" + "engineers")
  const chosen = [];
  const usedWords = new Set();
  for (const candidate of candidates) {
    if (chosen.length >= MAX_KEYWORDS) break;
    const words = candidate.term.split(" ");
    if (words.some((word) => usedWords.has(stem(word)) || skillWords.has(word))) continue;
    chosen.push(candidate);
    words.forEach((word) => usedWords.add(stem(word)));
  }
  return chosen;
}

// Compares the resume with the job description.
// Returns { score, matched, missing, totalKeywords } where matched/missing are
// [{ term, type: "skill" | "keyword", required }], most important first.
export default function analyzeKeywords(jobDescription, resumeText) {
  const skills = findSkills(jobDescription);
  // Skill terms and their parts ("next.js" and "next"), so they aren't counted again as general keywords
  const skillWords = new Set(
    skills.flatMap(({ skill }) => skill.terms.flatMap((term) => [term.toLowerCase(), ...tokenize(term)]))
  );
  const others = findOtherKeywords(jobDescription, skillWords);

  const resumeStems = tokenize(resumeText).map(stem);
  const resumeStemText = ` ${resumeStems.join(" ")} `;
  const inResume = (term) => resumeStemText.includes(` ${term.split(" ").map(stem).join(" ")} `);

  const results = [
    ...skills.map(({ skill, required }) => ({
      term: skill.name,
      type: "skill",
      required,
      weight: SKILL_WEIGHT + (required ? 1 : 0),
      found: containsAnyTerm(resumeText, skill.terms, skill.caseSensitive),
    })),
    ...others.map(({ term, score }) => ({
      term,
      type: "keyword",
      required: false,
      weight: KEYWORD_WEIGHT,
      found: inResume(term),
      score,
    })),
  ].sort((a, b) => b.weight - a.weight || (b.score ?? 0) - (a.score ?? 0));

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const matchedWeight = results.filter((r) => r.found).reduce((sum, r) => sum + r.weight, 0);
  const strip = ({ term, type, required }) => ({ term, type, required });

  return {
    score: totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0,
    matched: results.filter((r) => r.found).map(strip),
    missing: results.filter((r) => !r.found).map(strip),
    totalKeywords: results.length,
  };
}
