import api from "../api/axios";

// The file a resume was imported from (see server/models/OriginalFile.js). It's private, so it's
// fetched with the user's token (not linked to directly) and kept in memory for this session.

const bytesCache = new Map(); // resumeId -> Promise<ArrayBuffer>
const previewCache = new Map(); // resumeId -> Promise<string> (a DOCX's HTML)

// The original's bytes (a PDF is drawn from them)
export function originalBytes(resumeId) {
  if (!bytesCache.has(resumeId)) {
    const request = api.get(`/resumes/${resumeId}/original`, { responseType: "arraybuffer" }).then(({ data }) => data);
    request.catch(() => bytesCache.delete(resumeId)); // A failed fetch can be tried again
    bytesCache.set(resumeId, request);
  }
  return bytesCache.get(resumeId);
}

// A DOCX original as HTML (sanitized by the server)
export function originalPreviewHtml(resumeId) {
  if (!previewCache.has(resumeId)) {
    const request = api.get(`/resumes/${resumeId}/original/preview`).then(({ data }) => data.html);
    request.catch(() => previewCache.delete(resumeId));
    previewCache.set(resumeId, request);
  }
  return previewCache.get(resumeId);
}

// Saves the original exactly as it was uploaded, with its own file name
export async function downloadOriginal(resume) {
  const { data, headers } = await api.get(`/resumes/${resume._id}/original`, { params: { download: 1 }, responseType: "blob" });
  const url = URL.createObjectURL(new Blob([data], { type: headers["content-type"] }));
  const link = Object.assign(document.createElement("a"), { href: url, download: resume.original?.fileName || "resume" });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "Priya_Sharma-Resume.pdf · PDF · 84 KB"
export const describeOriginal = (original) =>
  original ? `${original.fileName} · ${original.kind.toUpperCase()} · ${Math.max(1, Math.round(original.size / 1024))} KB` : "";
