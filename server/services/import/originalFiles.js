import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import OriginalFile from "../../models/OriginalFile.js";

// The files resumes were imported from (see models/OriginalFile.js): saved at import, served
// only to their owner, deleted with their resume.

export const kindOf = (mimetype) => (mimetype === "application/pdf" ? "pdf" : "docx");

// Saves the uploaded file (multer's { buffer, mimetype, originalname, size }) for a resume
export const saveOriginal = (userId, resumeId, file) =>
  OriginalFile.create({
    userId,
    resumeId,
    fileName: String(file.originalname ?? "resume").slice(0, 200),
    mimetype: file.mimetype,
    size: file.buffer.length,
    data: file.buffer,
  });

// The original of one of the user's resumes, or null
export const findOriginal = (userId, resumeId) => OriginalFile.findOne({ userId, resumeId });

// Deletes the originals of these resumes (only the user's own)
export const deleteOriginals = (userId, resumeIds) => OriginalFile.deleteMany({ userId, resumeId: { $in: resumeIds } });

// A DOCX file as HTML, for the preview (Word layout isn't kept exactly: headings, paragraphs,
// lists, tables, emphasis and pictures are). Sanitized: no scripts, styles or outside links.
export async function docxPreviewHtml(buffer) {
  const { value } = await mammoth.convertToHtml({ buffer });
  return sanitizeHtml(value, {
    allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "strong", "b", "em", "i", "u", "br", "table", "thead", "tbody", "tr", "td", "th", "img", "a", "sup", "sub"],
    allowedAttributes: { img: ["src", "alt"], a: ["href", "rel", "target"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] }, // Pictures in the file are embedded as data: URLs
    transformTags: { a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" } }) },
  });
}
