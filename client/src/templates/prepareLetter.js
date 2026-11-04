import { toPlainText, toSafeHtml } from "../utils/richText";
import { LETTER_PLACEHOLDER, findPlaceholders, markPlaceholders } from "../utils/placeholders";

// Cleans up a cover letter for the templates (like prepareResume does for a resume). A letter is
// drawn by the linked resume's own layout, in place of its sections (see TemplateRenderer), so
// the letter and resume share the header, fonts and palette.
// Returns { date, recipient: [lines], subject, greeting, paragraphs: [html], closing }:
//   date       - localized: "4 November 2026" / "4. November 2026"
//   recipient  - the recipient's name ("Frau Anna Schmidt" in German with a salutation) and company
//   greeting   - the body's first paragraph ("Dear ...,"; HTML)
//   paragraphs - the paragraphs after it, sanitized; one block each, so pagination keeps them whole
//   closing    - { signOff, name } (HTML) when the body ends with "Kind regards,<br>Name", else null
//   highlightPlaceholders - mark [placeholders] in yellow (on-screen previews only)

const DATE_LOCALES = { en: "en-GB", de: "de-DE" };

export default function prepareLetter(letter, { highlightPlaceholders = false } = {}) {
  const language = letter.language === "de" ? "de" : "en";
  const date = letter.date ? new Date(letter.date) : new Date();
  const name = (letter.recipientName ?? "").trim();
  const nameLine = name && language === "de" && letter.recipientSalutation ? `${letter.recipientSalutation} ${name}` : name;

  const mark = (html) => (highlightPlaceholders ? markPlaceholders(html, LETTER_PLACEHOLDER) : html);
  const safe = toSafeHtml(letter.body ?? "", { links: false });
  const paragraphs = (safe.match(/<p[^>]*>[\s\S]*?<\/p>/g) ?? (safe ? [`<p>${safe}</p>`] : [])).map(mark);

  // A generated letter ends with "Kind regards,<br>Name": the sign-off and the name are drawn
  // apart, with room to sign between them. A hand-written ending without a line break stays a
  // normal paragraph.
  const last = paragraphs.length > 1 ? paragraphs.at(-1).match(/^<p[^>]*>([\s\S]*?)<br\s*\/?>([\s\S]*)<\/p>$/) : null;
  const closing = last && last[2].trim() ? { signOff: last[1].trim(), name: last[2].replace(/<br\s*\/?>/g, " ").trim() } : null;
  const text = closing ? paragraphs.slice(0, -1) : paragraphs;

  return {
    date: Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(DATE_LOCALES[language], { day: "numeric", month: "long", year: "numeric" }),
    recipient: [nameLine, (letter.companyName ?? "").trim()].filter(Boolean),
    subject: mark((letter.subject ?? "").trim()),
    greeting: text.length > 1 ? text[0] : "",
    paragraphs: text.length > 1 ? text.slice(1) : text,
    closing,
  };
}

// Every placeholder still in a letter (subject, recipient and body), e.g. ["[Hiring Manager]"]
export function letterPlaceholders(letter) {
  const text = [letter.subject, letter.recipientName, letter.companyName, toPlainText(letter.body ?? "")].join("\n");
  return [...new Set(findPlaceholders(text, LETTER_PLACEHOLDER))];
}
