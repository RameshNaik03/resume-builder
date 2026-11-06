import { PAGE_SIZES } from "../templates/design";
import toast from "./toast";

// Print settings for the PDF: the design's paper size (A4 or US Letter) and no page margins
// (the page draws its own margins, and pagination adds them to every page).
// Zero margins also stop the browser from adding its date/URL headers and footers.
const printPageStyle = (pageSize) => `
  @page { size: ${PAGE_SIZES[pageSize].css}; margin: 0; }
  @media print {
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export default printPageStyle;

// The longest we wait for the print frame's fonts before printing anyway (with fallback fonts)
const FONT_WAIT_MS = 5000;

// react-to-print's `print` option: once the print frame is ready, wait for the fonts the page
// actually uses, then open the print dialog (where "Save as PDF" makes the file).
// Why not react-to-print's own `fonts` option: it waits for every face it's given to load, but a
// browser only loads a face that some text uses. A weight or italic the resume doesn't use never
// loads, so it waited forever and the dialog never opened. document.fonts.ready only waits for
// the faces in use.
//   getTitle - the PDF's file name (react-to-print only sets it when it prints by itself)
export const printWhenFontsReady = (getTitle) => async (iframe) => {
  const frameDocument = iframe.contentDocument;
  frameDocument.body.getBoundingClientRect(); // Lay the page out, so the fonts it uses start loading
  await Promise.race([frameDocument.fonts.ready, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
  const title = getTitle();
  const previousTitle = document.title;
  if (title) {
    document.title = title;
    frameDocument.title = title;
  }
  iframe.contentWindow.print(); // Blocks until the dialog closes
  document.title = previousTitle;
};

// react-to-print's onPrintError: say so instead of doing nothing (where: "onBeforePrint" or "print")
export function reportPrintError(where, error) {
  console.error(`PDF download failed (${where}):`, error);
  toast.error("Couldn't open the print dialog for the PDF. Please try again, or reload the page.");
}
