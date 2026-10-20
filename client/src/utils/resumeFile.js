// Shared rules for uploading a resume file (import and ATS checker)

export const MAX_SIZE_MB = 5;
export const ACCEPTED_TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const ACCEPT_ATTRIBUTE = `.pdf,.docx,${Object.values(ACCEPTED_TYPES).join(",")}`;

const getExtension = (file) => file.name.toLowerCase().match(/\.[^.]+$/)?.[0];

// Returns an error message for files we can't read, or null if the file looks fine
export function validateFile(file) {
  const extension = getExtension(file);
  if (extension === ".doc") {
    return "Old .doc files aren't supported. In Word, use File → Save As → Word Document (.docx), then try again.";
  }
  if (!ACCEPTED_TYPES[extension]) return "Please choose a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum size is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

// Re-wraps the file with the correct type (some systems report .docx files with no type)
export const toUploadFile = (file) => new File([file], file.name, { type: ACCEPTED_TYPES[getExtension(file)] });

// A file a guest checked on the ATS page and wants to edit after signing up.
// Kept in memory only (never stored), so it survives moving between pages but not a reload.
let pendingImport = null;
export const setPendingImport = (file) => {
  pendingImport = file;
};
export const getPendingImport = () => pendingImport;
export const clearPendingImport = () => {
  pendingImport = null;
};
