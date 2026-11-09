import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFParse } from "pdf-parse";
import JSZip from "jszip";

// Looks at the ORIGINAL file (not just its text) for things that confuse applicant
// tracking systems: several columns, tables, text in images, running headers/footers,
// unusual fonts and icon symbols. Returns plain facts; scoring happens elsewhere.
//
// Result:
//   pages, charsPerPage[]
//   columns:      { detected, pages: [{ page, starts: [% across the page], lines }] }
//   tables:       number of tables found
//   textBoxes:    number of text boxes (DOCX only)
//   imagePages:   page numbers that are mostly an image (scanned / text in pictures)
//   headerFooter: { detected, texts: [...], hasContact }
//   fonts:        { all: [...], unusual: [...], icon: [...] }
//   iconSymbols:  number of "private use" characters (icon-font symbols that extract as junk)

// Fonts that every ATS and computer handles well (matched by name, ignoring style suffixes)
const STANDARD_FONTS = [
  "arial", "helvetica", "calibri", "carlito", "cambria", "caladea", "georgia", "garamond", "ebgaramond", "times", "timesnewroman",
  "verdana", "tahoma", "trebuchet", "bookantiqua", "palatino", "palatinolinotype", "centurygothic", "gillsans", "segoeui",
  "aptos", "roboto", "opensans", "lato", "inter", "sourcesans", "sourcesanspro", "sourcesans3", "montserrat", "merriweather",
  "lora", "playfairdisplay", "notosans", "notoserif", "liberationsans", "liberationserif", "dejavusans", "dejavuserif",
  "helveticaneue", "franklingothic", "candara", "corbel", "constantia", "bookman", "baskerville", "didot", "sfpro", "ptsans", "ptserif",
  "ibmplexsans", "sourceserif", "fraunces", "nunito", "raleway", "worksans", "poppins", "ubuntu", "arimo", "tinos", "symbolmt",
];
const ICON_FONTS = /fontawesome|awesome|materialicons|materialsymbols|glyphicons|ionicons|icomoon|wingdings|webdings|zapfdingbats|dingbats|^symbol$|feather|lucide|bootstrapicons|remixicon/;

// "ABCDEF+Arial-BoldMT" -> "arial"
const fontKey = (name) =>
  name
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[-,](bold|italic|oblique|regular|light|medium|semibold|black|book|roman|condensed|narrow|mt|ps|psmt|boldmt|italicmt|bolditalic|bolditalicmt)+.*$/i, "")
    .replace(/(MT|PS|PSMT)$/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

function classifyFonts(names) {
  const unique = [...new Set(names.filter(Boolean).map((name) => name.replace(/^[A-Z]{6}\+/, "")))];
  const unusual = [];
  const icon = [];
  for (const name of unique) {
    const key = fontKey(name);
    if (!key) continue;
    if (ICON_FONTS.test(key)) icon.push(name);
    else if (!STANDARD_FONTS.some((standard) => key === standard || key.startsWith(standard))) unusual.push(name);
  }
  return { all: unique, unusual, icon };
}

// Icon-font symbols come out as "private use" characters, or as \u0000 / � when the font
// has no text mapping for them: either way an ATS sees junk instead of a phone or email icon
// oxlint-disable-next-line no-control-regex -- U+0000 is one of the junk characters counted
const countIconSymbols = (text) => (text.match(/[-\u0000�]/gu) ?? []).length;
const CONTACT = /[\w.+-]+@[\w-]+\.[\w.-]+|\+?\(?\d[\d\s().-]{7,}\d/;
const DATE_LIKE = /\b((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|(19|20)\d{2}|present|current)\b/i;

// ---------- PDF ----------

// Groups text items into lines (same height on the page), then splits each line into
// segments wherever there's a big horizontal gap. Also used by extractText's reading order.
export function toSegments(items, pageWidth) {
  const lines = [];
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - item.y) < Math.max(2, item.h * 0.4));
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }

  const segments = [];
  for (const line of lines) {
    const sorted = line.items.sort((a, b) => a.x - b.x);
    let current = null;
    for (const item of sorted) {
      const gap = current ? item.x - current.endX : Infinity;
      const charWidth = item.w / Math.max(item.str.length, 1);
      if (current && gap < Math.max(pageWidth * 0.03, charWidth * 3)) {
        current.text += (gap > charWidth * 0.3 ? " " : "") + item.str;
        current.endX = Math.max(current.endX, item.x + item.w);
      } else {
        current = { x: item.x, endX: item.x + item.w, y: line.y, text: item.str };
        segments.push(current);
      }
    }
  }
  return { lines, segments };
}

// A table drawn without lines (or that pdf-parse missed): several rows with 3+ cells that
// start at the same positions across the page
function detectTableGrid(segments, pageWidth) {
  const rows = new Map(); // y -> start bins
  for (const s of segments) {
    const key = Math.round(s.y);
    rows.set(key, [...(rows.get(key) ?? []), Math.round((s.x / pageWidth) * 50)]);
  }
  const patterns = [...rows.values()].filter((starts) => starts.length >= 3).map((starts) => starts.sort((a, b) => a - b));
  const sameColumns = (a, b) => a.filter((bin) => b.some((other) => Math.abs(other - bin) <= 1)).length >= 3;
  return patterns.filter((pattern, i) => patterns.some((other, j) => i !== j && sameColumns(pattern, other))).length >= 3;
}

// Two or more columns: besides the left margin, many text segments start at the same
// position further across the page (short right-aligned dates and centred lines don't count)
export function detectColumns(segments, pageWidth) {
  const content = segments.filter((s) => {
    const words = s.text.trim().split(/\s+/).length;
    const centred = Math.abs((s.x + s.endX) / 2 - pageWidth / 2) < pageWidth * 0.04 && s.x > pageWidth * 0.15;
    return words >= 2 && !centred && !(words <= 5 && DATE_LIKE.test(s.text));
  });
  if (content.length < 8) return null;

  const binOf = (x) => Math.round((x / pageWidth) * 50); // 2% wide bins
  const counts = new Map();
  for (const s of content) counts.set(binOf(s.x), (counts.get(binOf(s.x)) ?? 0) + 1);
  const leftMargin = Math.min(...content.map((s) => s.x));

  // Clusters of starts at least 25% of the page right of the left margin
  const far = content.filter((s) => s.x - leftMargin > pageWidth * 0.25);
  if (far.length < Math.max(5, content.length * 0.2)) return null;
  const bins = new Map();
  for (const s of far) {
    // Merge neighbouring bins (±1 = within ~2% of the page)
    const bin = binOf(s.x);
    const key = [...bins.keys()].find((k) => Math.abs(k - bin) <= 1) ?? bin;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  const [bestBin, bestCount] = [...bins.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestCount < Math.max(5, content.length * 0.2)) return null;
  return {
    starts: [Math.round((leftMargin / pageWidth) * 100), bestBin * 2],
    lines: bestCount,
  };
}

async function inspectPdf(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  const result = {
    pages: doc.numPages,
    charsPerPage: [],
    columns: { detected: false, pages: [] },
    tables: 0,
    textBoxes: 0,
    imagePages: [],
    headerFooter: { detected: false, texts: [], hasContact: false },
    fonts: { all: [], unusual: [], icon: [] },
    iconSymbols: 0,
  };
  const fontNames = [];
  const zoneLines = { header: [], footer: [] }; // Per page: the lines in the top / bottom 8%
  const gridTablePages = new Set();

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const ops = await page.getOperatorList(); // Also loads the fonts, so their names are known

      const items = content.items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: height - item.transform[5],
          w: item.width,
          h: item.height || Math.abs(item.transform[3]),
          fontName: item.fontName,
        }));

      const pageText = items.map((item) => item.str).join(" ");
      const chars = pageText.replace(/\s/g, "").length;
      result.charsPerPage.push(chars);
      result.iconSymbols += countIconSymbols(pageText);

      for (const fontId of new Set(items.map((item) => item.fontName))) {
        try {
          fontNames.push(page.commonObjs.get(fontId)?.name);
        } catch {
          // Font not loaded (e.g. a standard font that wasn't embedded): skip it
        }
      }

      // Pictures: a page with an image but little real text is probably scanned / text in a picture
      const imageOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject]);
      const images = ops.fnArray.filter((fn) => imageOps.has(fn)).length;
      if ((images > 0 && chars < 400) || chars < 40) result.imagePages.push(n);

      const { segments } = toSegments(items, width);

      // Running headers / footers: the lines near the top and bottom edge of each page
      zoneLines.header.push(new Set(segments.filter((s) => s.y < height * 0.08).map((s) => s.text.trim())));
      zoneLines.footer.push(new Set(segments.filter((s) => s.y > height * 0.92).map((s) => s.text.trim())));

      if (detectTableGrid(segments, width)) gridTablePages.add(n);
      const columns = detectColumns(segments, width);
      if (columns) result.columns.pages.push({ page: n, ...columns });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  // Tables: pdf-parse finds tables drawn with lines; the grid check finds the rest.
  // Pages with a table aren't also counted as "columns": the table cells line the text up.
  const tablePages = new Set(gridTablePages);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const tables = await parser.getTable();
    for (const page of tables.pages) if (page.tables.length > 0) tablePages.add(page.num);
    result.tables = Math.max(tables.pages.reduce((sum, page) => sum + page.tables.length, 0), gridTablePages.size);
  } catch {
    result.tables = gridTablePages.size; // pdf-parse's table detection is best-effort
  } finally {
    await parser.destroy();
  }
  result.columns.pages = result.columns.pages.filter((page) => !tablePages.has(page.page));
  result.columns.detected = result.columns.pages.length > 0;

  // A line that appears near the top (or bottom) edge on two or more pages = running header/footer.
  // Page numbers ("Page 2 of 3") don't count.
  const normalize = (text) => text.replace(/\d+/g, "#").replace(/\s+/g, " ").toLowerCase();
  for (const zone of ["header", "footer"]) {
    const counts = new Map();
    for (const lines of zoneLines[zone]) {
      for (const line of new Set([...lines].map(normalize))) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    for (const [line, count] of counts) {
      if (count >= 2 && line.replace(/[#\s/|-]|page|of/g, "").length > 3) {
        result.headerFooter.texts.push(zoneLines[zone].flatMap((set) => [...set]).find((text) => normalize(text) === line));
      }
    }
  }
  result.headerFooter.detected = result.headerFooter.texts.length > 0;
  result.headerFooter.hasContact = result.headerFooter.texts.some((text) => CONTACT.test(text));

  result.fonts = classifyFonts(fontNames);
  return result;
}

// ---------- DOCX ----------

const xmlText = (xml) =>
  (xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) ?? [])
    .map((t) => t.replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

async function inspectDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name) => (zip.file(name) ? zip.file(name).async("string") : "");
  const document = await read("word/document.xml");
  const styles = await read("word/styles.xml");
  const appXml = await read("docProps/app.xml");

  const headerFooterFiles = Object.keys(zip.files).filter((name) => /^word\/(header|footer)\d*\.xml$/.test(name));
  const headerFooterTexts = [];
  for (const name of headerFooterFiles) {
    const text = xmlText(await read(name));
    if (text.replace(/[\d\s/|-]|page|of/gi, "").length > 3) headerFooterTexts.push(text);
  }

  const columnCounts = [...document.matchAll(/<w:cols\b[^>]*\bw:num="(\d+)"/g)].map((m) => Number(m[1]));
  const bodyText = xmlText(document);
  const words = bodyText.split(/\s+/).filter(Boolean).length;
  const pagesFromApp = Number(appXml.match(/<Pages>(\d+)<\/Pages>/)?.[1]);
  const fontNames = [...`${document}${styles}`.matchAll(/w:(?:ascii|hAnsi)="([^"]+)"/g)].map((m) => m[1]);
  const images = Object.keys(zip.files).filter((name) => name.startsWith("word/media/")).length;

  return {
    pages: pagesFromApp || Math.max(1, Math.ceil(words / 500)), // Word stores the page count; otherwise estimate
    pagesEstimated: !pagesFromApp,
    charsPerPage: [bodyText.replace(/\s/g, "").length],
    columns: {
      detected: columnCounts.some((count) => count >= 2),
      pages: columnCounts.some((count) => count >= 2) ? [{ page: 1, sections: Math.max(...columnCounts) }] : [],
    },
    tables: (document.match(/<w:tbl>/g) ?? []).length,
    textBoxes: (document.match(/<w:txbxContent>|<v:textbox\b/g) ?? []).length,
    imagePages: images > 0 && bodyText.length < 400 ? [1] : [],
    headerFooter: {
      detected: headerFooterTexts.length > 0,
      texts: headerFooterTexts,
      hasContact: headerFooterTexts.some((text) => CONTACT.test(text)),
    },
    fonts: classifyFonts(fontNames),
    iconSymbols: countIconSymbols(bodyText),
  };
}

export default async function inspectFile(file) {
  return file.mimetype === "application/pdf" ? inspectPdf(file.buffer) : inspectDocx(file.buffer);
}
