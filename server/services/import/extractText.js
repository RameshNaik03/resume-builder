import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MIN_LETTERS = 80; // Less than this means there's no real text (e.g. a scanned image)
const MAX_CHARACTERS = 50000; // Far more than any resume; protects the parser and the AI call

// Creates an error with an HTTP status the error handler will use
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Every real PDF starts with "%PDF" and every DOCX (a zip file) with "PK".
// This catches files that were simply renamed, e.g. photo.jpg -> photo.pdf.
const looksLikePdf = (buffer) => buffer.subarray(0, 4).toString() === "%PDF";
const looksLikeDocx = (buffer) => buffer[0] === 0x50 && buffer[1] === 0x4b;

async function readPdf(buffer) {
  // pdf-parse may take over the memory it's given, so pass a copy of the bytes
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy(); // Free the memory pdf.js used
  }
}

async function readDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Tidies extracted text: consistent line breaks, no repeated spaces or blank lines
const normalize = (text) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Returns the plain text of an uploaded PDF or DOCX file, or throws an error with a status
export default async function extractText(file) {
  const isPdf = file.mimetype === "application/pdf";

  if (isPdf ? !looksLikePdf(file.buffer) : !looksLikeDocx(file.buffer)) {
    throw httpError(415, `This file isn't a valid ${isPdf ? "PDF" : "DOCX"} file.`);
  }

  let rawText;
  try {
    rawText = isPdf ? await readPdf(file.buffer) : await readDocx(file.buffer);
  } catch {
    throw httpError(
      422,
      "We couldn't read this file. It may be damaged or password-protected. Try saving it again as a PDF or DOCX."
    );
  }

  const text = normalize(rawText ?? "");
  const letterCount = (text.match(/\p{L}/gu) ?? []).length;

  if (letterCount < MIN_LETTERS) {
    throw httpError(
      422,
      "We couldn't find any text in this file. It looks like a scanned image. Please upload a PDF exported from Word or Google Docs, or a DOCX file."
    );
  }
  if (text.length > MAX_CHARACTERS) {
    throw httpError(422, "This file has much more text than a typical resume. Please upload a resume of a few pages.");
  }

  return text;
}
