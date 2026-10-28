import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { detectColumns, toSegments } from "../ats/inspectFile.js";

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
    // Reads every page (no page range is set). pageJoiner "\n" replaces pdf-parse's
    // default "-- 1 of 2 --" separator lines, which the parsers mistook for content.
    const result = await parser.getText({ pageJoiner: "\n" });
    return result.text;
  } finally {
    await parser.destroy(); // Free the memory pdf.js used
  }
}

// The PDF's lines from top to bottom as they appear on the page. Text order inside a PDF can
// differ from what you see: e.g. bold job titles drawn in a separate pass come out first, all
// together, above the name. Sorting by position puts each title back above its bullet points.
// Returns null for multi-column pages (sorting by height would mix the columns together),
// and the caller then uses the PDF's own order.
async function readPdfInReadingOrder(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const items = (await page.getTextContent()).items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: height - item.transform[5],
          w: item.width,
          h: item.height || Math.abs(item.transform[3]),
        }));
      const { lines, segments } = toSegments(items, width);
      if (detectColumns(segments, width)) return null;

      // toSegments already sorted the lines top to bottom; join each line's items left to right,
      // with a space wherever there's a visible gap between them
      pages.push(
        lines.map((line) => {
          let text = "";
          let endX = -Infinity;
          for (const item of line.items.sort((a, b) => a.x - b.x)) {
            const gap = item.x - endX;
            if (text && gap > item.h * 0.15 && !text.endsWith(" ") && !item.str.startsWith(" ")) text += " ";
            text += item.str;
            endX = item.x + item.w;
          }
          return text;
        }).join("\n")
      );
      page.cleanup();
    }
    return pages.join("\n");
  } finally {
    await doc.destroy();
  }
}

async function readDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Page-number footers such as "Page 2 of 3", "2 / 3" or "-- 2 of 3 --"
const PAGE_NUMBER_LINE = /^(?:-+\s*)?(?:page\s*)?\d+\s*(?:of|\/)\s*\d+(?:\s*-+)?$/i;

// Tidies extracted text: consistent line breaks, no repeated spaces, page numbers or blank lines
const normalize = (text) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !PAGE_NUMBER_LINE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Returns the plain text of an uploaded PDF or DOCX file, or throws an error with a status.
//   allowNoText  - return the (nearly empty) text of a scanned file instead of rejecting it
//                  (the ATS analyzer reports it as a failed check)
//   readingOrder - PDFs: lines in the order they appear on the page (for parsing into resume
//                  fields). Without it, the PDF's own text order: what an ATS reads.
export default async function extractText(file, { allowNoText = false, readingOrder = false } = {}) {
  const isPdf = file.mimetype === "application/pdf";

  if (isPdf ? !looksLikePdf(file.buffer) : !looksLikeDocx(file.buffer)) {
    throw httpError(415, `This file isn't a valid ${isPdf ? "PDF" : "DOCX"} file.`);
  }

  let rawText;
  try {
    if (isPdf && readingOrder) rawText = await readPdfInReadingOrder(file.buffer).catch(() => null);
    rawText ??= isPdf ? await readPdf(file.buffer) : await readDocx(file.buffer);
  } catch {
    throw httpError(
      422,
      "We couldn't read this file. It may be damaged or password-protected. Try saving it again as a PDF or DOCX."
    );
  }

  const text = normalize(rawText ?? "");
  const letterCount = (text.match(/\p{L}/gu) ?? []).length;

  if (letterCount < MIN_LETTERS && !allowNoText) {
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
