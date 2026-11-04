import { PAGE_SIZES } from "../templates/design";

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
