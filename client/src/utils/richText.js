import DOMPurify from "dompurify";

// Rich text for the summary, bullet points and project descriptions (see server/utils/richText.js).
// Stored as small HTML: <p>, <br>, <strong>, <em>, <u>, <a href> (bullet points: no <p>/<br>).
// Older resumes and imported files have plain text in these fields; it's recognised and
// converted automatically, so both kinds of value work everywhere.

// Same check as the server: editor HTML has one of these tags or an HTML entity
export const looksLikeHtml = (value) =>
  /<\/?(p|br|strong|b|em|i|u|a)(\s[^>]*)?\/?>/i.test(value) || /&(amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);/i.test(value);

const escapeText = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "<p>a</p><p>b</p>" -> "a b" (bullet points are a single line)
const unwrapParagraphs = (html) =>
  html
    .replace(/<\/p>\s*<p[^>]*>|<br\s*\/?>/gi, " ")
    .replace(/<\/?p[^>]*>/gi, "")
    .trim();

// A stored value (HTML or plain text) -> HTML
export function toHtml(value, { inline = false } = {}) {
  if (!value) return "";
  if (looksLikeHtml(value)) return inline ? unwrapParagraphs(value) : value;
  if (inline) return escapeText(value.replace(/\s*\n\s*/g, " "));
  // Plain text: blank lines start a new paragraph, single line breaks become <br>
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeText(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// A stored value -> HTML that's safe to put on the page (and into the PDF).
// The server already sanitizes everything it saves; this is a second, client-side check.
//   links: false turns links into plain text (thumbnails are buttons, which can't contain links)
export function toSafeHtml(value, { inline = false, links = true } = {}) {
  const html = toHtml(value, { inline });
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "u", ...(links ? ["a"] : []), ...(inline ? [] : ["p", "br"])],
    ALLOWED_ATTR: ["href", "rel", "target"],
  });
}

// A stored value -> plain text (e.g. to count characters or check if it's empty)
export function toPlainText(value) {
  if (!value) return "";
  if (!looksLikeHtml(value)) return value;
  const withLineBreaks = value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  return new DOMParser().parseFromString(withLineBreaks, "text/html").body.textContent ?? "";
}
