// Phrases a cover letter never uses: clichés recruiters skim past, in English and German.
// Generated letters must avoid them (an AI letter with one is dropped), and the editor's strength
// check flags them in the user's own edits.
export const BANNED_PHRASES = {
  en: [
    "I am writing to apply",
    "I am writing to express",
    "To whom it may concern",
    "team player",
    "passionate",
    "dynamic",
    "hard-working",
    "hardworking",
    "self-starter",
    "results-driven",
    "detail-oriented",
    "go-getter",
    "think outside the box",
    "synergy",
    "proven track record",
    "highly motivated",
    "perfect fit",
    "dream job",
    "fast-paced environment",
  ],
  de: [
    "Hiermit bewerbe ich mich",
    "mit großem Interesse",
    "teamfähig",
    "Teamfähigkeit",
    "Teamplayer",
    "belastbar",
    "Belastbarkeit",
    "hochmotiviert",
    "leidenschaftlich",
    "Leidenschaft",
    "dynamisch",
    "zielstrebig",
    "kommunikationsstark",
    "über den Tellerrand",
  ],
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words; a space or hyphen in a phrase also matches the other ("hard working" = "hard-working").
// German ones also match their inflected forms ("hochmotivierter", "im dynamischen Umfeld").
const pattern = (phrase, ending = "") => new RegExp(`(?<![\\p{L}])${escapeRegex(phrase).replace(/[\s-]+/g, "[\\s-]?")}${ending}(?![\\p{L}])`, "iu");
const PATTERNS = [
  ...BANNED_PHRASES.en.map((phrase) => ({ phrase, pattern: pattern(phrase) })),
  ...BANNED_PHRASES.de.map((phrase) => ({ phrase, pattern: pattern(phrase, "(?:e|er|en|es|em)?") })),
];

// The first banned phrase in a text (either language), or null
export function findBannedPhrase(text) {
  return PATTERNS.find(({ pattern }) => pattern.test(text ?? ""))?.phrase ?? null;
}
