import sanitizeHtml from "sanitize-html";

// Rich text for the summary, bullet points and project descriptions.
// Stored as small, sanitized HTML:
//   block fields (summary, project description): <p>, <br>, <strong>, <em>, <u>, <a href>
//   inline fields (bullet points):               <strong>, <em>, <u>, <a href>
// Older resumes and imported files have plain text in these fields. Plain text is
// recognised automatically and converted (escaped), so it keeps working everywhere.

const INLINE_TAGS = ["strong", "em", "u", "a"];
const BLOCK_TAGS = [...INLINE_TAGS, "p", "br"];

// HTML from the editor always has one of these tags or an HTML entity (e.g. "R&amp;D");
// plain text normally has neither
export const looksLikeHtml = (value) =>
  /<\/?(p|br|strong|b|em|i|u|a)(\s[^>]*)?\/?>/i.test(value) || /&(amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);/i.test(value);

const escapeText = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Plain text -> HTML: blank lines start a new paragraph, single line breaks become <br>
const textToHtml = (text, inline) => {
  if (inline) return escapeText(text.replace(/\s*\n\s*/g, " "));
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeText(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

const sanitizeOptions = (inline) => ({
  allowedTags: inline ? INLINE_TAGS : BLOCK_TAGS,
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"], // No javascript: or data: links
  allowProtocolRelative: false,
  transformTags: {
    b: "strong",
    i: "em",
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
});

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&amp;/g, "&"); // Last, so "&amp;lt;" becomes "&lt;" (not "<")

// HTML (or plain text) -> plain text, e.g. for the ATS checker
export function htmlToText(value) {
  if (!value) return "";
  if (!looksLikeHtml(value)) return value;
  const withLineBreaks = value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  return decodeEntities(sanitizeHtml(withLineBreaks, { allowedTags: [], allowedAttributes: {} })).trim();
}

// Any value -> safe HTML ("" when there's no text, e.g. an empty editor's "<p></p>")
export function sanitizeRichText(value, { inline = false } = {}) {
  if (typeof value !== "string") return value;

  let html = looksLikeHtml(value) ? value : textToHtml(value, inline);
  // Bullet points are one line: paragraph breaks become spaces
  if (inline) html = html.replace(/<\/p>\s*<p[^>]*>|<br\s*\/?>/gi, " ");

  const clean = sanitizeHtml(html, sanitizeOptions(inline))
    .replace(/<p>\s+/g, "<p>") // No spaces at the start or end of a paragraph
    .replace(/\s+<\/p>/g, "</p>")
    .replace(/<p><\/p>/g, "") // Empty paragraphs
    .trim();
  return htmlToText(clean).trim() ? clean : "";
}

// Mongoose setters (used in the Resume model)
export const richBlock = (value) => sanitizeRichText(value);
export const richInline = (value) => sanitizeRichText(value, { inline: true });
