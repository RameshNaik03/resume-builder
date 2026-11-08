import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import { detectColumns, toSegments } from "../ats/inspectFile.js";

// Reads the DESIGN of an uploaded resume (not its content): fonts, text sizes, colours, columns,
// header alignment, section order and headings, bullet style and whether it has a photo. The
// client matches this to the closest template and design settings (client/src/templates/
// matchDesign.js). Every field is a best guess; null means "couldn't tell" (the template's
// default is used).
//
// Result (the same shape for PDF and DOCX):
//   source:   "pdf" | "docx"
//   pageSize: "A4" | "Letter" | null
//   fonts:    { body, heading, name }: each { name: "Georgia", category: "serif" | "sans" } or null
//   sizes:    { body, heading, name } in pt (null when unknown)
//   colors:   { accent, text, sidebar, headerBand } as "#rrggbb" (null when there's none)
//   layout:   { columns: 1 | 2, sidebar: "left" | "right" | null, sideRatio: 30 | 35 | 40 | null,
//               headerAlign: "left" | "center" | "right" | null }
//   sections: [{ id, heading, side }] in reading order (main column first, then the side
//             column); id is one of summary, experience, education, skills, projects, additional
//   bulletStyle: "disc" | "dash" | "arrow" | null
//   hasPhoto: boolean

const MAX_PAGES = 3; // The design shows on the first pages; long files aren't read further

// ---------- Shared helpers ----------

// Section headings people use, by section (checked against the whole heading)
const SECTION_PATTERNS = [
  ["summary", /^(professional\s+)?(summary|profile|about(\s+me)?|objective|career\s+(summary|objective|profile)|personal\s+(statement|profile)|introduction|overview)$/i],
  ["experience", /^((professional|work|relevant|employment|career|earlier|previous|prior|other|additional)\s+)?(experience|history|background)$|^(employment|work)(\s+history)?$|^career$|^positions?\s+held$/i],
  ["education", /^((more|further|additional|continuing|higher)\s+)?(education|academic\s+(background|history|qualifications)|qualifications|education\s*(&|and)\s*training|studies)$/i],
  ["skills", /^((technical|key|core|professional)\s+)?(skills|competenc(ies|e)|expertise|technologies|tech\s+stack|tools(\s*(&|and)\s*technologies)?|strengths)$|^skills\s*(&|and)\s*\w+$/i],
  ["projects", /^((selected|personal|key|side|academic)\s+)?(projects|portfolio|work\s+samples)$/i],
];
// Headings of sections that go in "additional" (and other short title-like lines)
const ADDITIONAL_PATTERN = /^(certifications?|certificates|licen[cs]es?|languages?|awards?|honou?rs|achievements|publications|volunteer(ing)?(\s+experience)?|interests|hobbies|activities|references|courses|training|memberships|affiliations|conferences|talks|patents|leadership)(\s*(&|and)\s*\w+)?$/i;

// Headings over the contact details (often in a sidebar): personal info, not a section
const CONTACT_HEADING = /^(contact|contacts|contact\s+(details|information|info|me)|personal\s+(details|information|info|data)|get\s+in\s+touch|details)$/i;
export const isContactHeading = (heading) => CONTACT_HEADING.test(heading.replace(/[:.\s]+$/, "").trim());

export const sectionIdOf = (heading) => {
  const text = heading.replace(/[:.\s]+$/, "").replace(/\s+/g, " ").trim();
  for (const [id, pattern] of SECTION_PATTERNS) if (pattern.test(text)) return id;
  return ADDITIONAL_PATTERN.test(text) ? "additional" : null;
};

// "WORK HISTORY" -> "Work History" (all-caps headings are a style, not the name)
const tidyHeading = (text) => {
  const clean = text.replace(/[:\s]+$/, "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (clean !== clean.toUpperCase() || !/[A-Z]/.test(clean)) return clean;
  return clean.toLowerCase().replace(/(^|[\s/&(-])(\p{L})/gu, (match, before, letter) => before + letter.toUpperCase()).replace(/\b(And|Of|The|In)\b/g, (word) => word.toLowerCase());
};

// Fonts that are serif (by name); everything else not known as one is treated as sans
const SERIF_FONTS = /times|georgia|garamond|cambria|caladea|book\s*antiqua|palatino|baskerville|didot|bodoni|merriweather|lora|playfair|serif|minion|caslon|century\s*schoolbook|constantia|charter|crimson|libre\s*baskerville|spectral|fraunces|newsreader|tinos|bookman|perpetua|rockwell|cormorant|literata|noto\s*serif|pt\s*serif|source\s*serif|dejavu\s*serif|liberation\s*serif|sitka|georgia/i;

// "ABCDEF+Georgia-BoldItalic" -> "Georgia"; "TimesNewRomanPSMT" -> "Times New Roman"
export function cleanFontName(raw) {
  if (!raw) return null;
  let name = String(raw)
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[-,_](bold|italic|oblique|regular|light|medium|semibold|demibold|black|heavy|book|roman|condensed|narrow|thin|extralight|extrabold)+.*$/i, "")
    .replace(/(PS)?MT$|PS$/, "")
    .replace(/[-_]+$/, "");
  name = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim(); // CamelCase -> words
  return name || null;
}
const fontCategory = (name, fallback) => (SERIF_FONTS.test(name ?? "") ? "serif" : /serif/i.test(fallback ?? "") && !/sans/i.test(fallback ?? "") ? "serif" : "sans");
const isBoldFont = (raw) => /bold|black|heavy|semibold|demi/i.test(String(raw ?? ""));

// Colours: neutral (black, white, grays) never count as the accent
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const isNeutral = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 24; // Gray: the channels are about the same
};
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const topKey = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const round = (value, step = 0.5) => Math.round(value / step) * step;

// Bullet characters at the start of a line
const BULLETS = [
  ["disc", /^[•●▪■◦○·∙⦁]/],
  ["dash", /^[–—‐-](?=\s)/],
  ["arrow", /^[▸►▶➤➢→›»>](?=\s?)/],
];
const bulletOf = (text) => BULLETS.find(([, pattern]) => pattern.test(text.trim()))?.[0] ?? null;
// A bullet symbol on its own (a Word list's bullet character)
const bulletOfSymbol = (symbol) => (/^[•●▪■◦○·∙⦁]$/.test(symbol) ? "disc" : /^[–—‐-]$/.test(symbol) ? "dash" : /^[▸►▶➤➢→›»>]$/.test(symbol) ? "arrow" : null);
const sideRatioOf = (percent) => [30, 35, 40].reduce((best, value) => (Math.abs(value - percent) < Math.abs(best - percent) ? value : best), 35);

// ---------- PDF ----------

// 2D matrices [a, b, c, d, e, f], as in PDF
const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const boxOf = (m, x0, y0, x1, y1) => {
  const points = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x0, y1), apply(m, x1, y1)];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

// Walks a page's drawing operators for what text content doesn't give: the colour of every
// glyph, filled shapes (sidebars, header bands) and images (a photo). Coordinates are PDF
// points with y measured from the top of the page.
function readOperators(ops, pageHeight) {
  const NAME = Object.fromEntries(Object.entries(pdfjs.OPS).map(([name, id]) => [id, name]));
  const FILLS = new Set(["fill", "eoFill", "fillStroke", "eoFillStroke", "closeFillStroke", "closeEOFillStroke"]);
  let state = { ctm: [1, 0, 0, 1, 0, 0], fill: "#000000" };
  const stack = [];
  const glyphsByColor = new Map(); // colour -> glyph count
  const textByColor = new Map(); // colour -> the text drawn in it (no spaces), to find the name's colour
  const shapes = [];
  const images = [];
  const toTop = (box) => ({ x0: box.x0, x1: box.x1, top: pageHeight - box.y1, bottom: pageHeight - box.y0 });

  for (let i = 0; i < ops.fnArray.length; i++) {
    const name = NAME[ops.fnArray[i]];
    const args = ops.argsArray[i];
    if (name === "save") stack.push({ ...state });
    else if (name === "restore") state = stack.pop() ?? state;
    else if (name === "transform") state = { ...state, ctm: multiply(state.ctm, args) };
    else if (name === "setFillRGBColor" && typeof args?.[0] === "string") state = { ...state, fill: args[0].toLowerCase() };
    else if (name === "showText" || name === "showSpacedText") {
      const text = (args?.[0] ?? []).map((glyph) => (typeof glyph === "object" && glyph ? (glyph.unicode ?? "") : "")).join("").replace(/\s+/g, "");
      if (text) {
        glyphsByColor.set(state.fill, (glyphsByColor.get(state.fill) ?? 0) + text.length);
        textByColor.set(state.fill, (textByColor.get(state.fill) ?? "") + text);
      }
    } else if (name === "constructPath") {
      // pdf.js 5: [paint operator, path data, bounding box] (the box in the current user space)
      const paint = NAME[args?.[0]];
      const bounds = args?.[2];
      if (FILLS.has(paint) && bounds && bounds[0] !== undefined) {
        shapes.push({ color: state.fill, ...toTop(boxOf(state.ctm, bounds[0], bounds[1], bounds[2], bounds[3])) });
      }
    } else if (name === "paintImageXObject" || name === "paintInlineImageXObject" || name === "paintImageMaskXObject") {
      images.push(toTop(boxOf(state.ctm, 0, 0, 1, 1))); // Images are drawn into the unit square
    }
  }
  return { glyphsByColor, textByColor, shapes, images };
}

// Text items -> lines (same height on the page), each with its size, font, position and text.
// A wide gap splits a line, so two columns (or a right-aligned date) become separate lines.
function toLines(items, pageWidth) {
  const rows = [];
  for (const item of [...items].sort((a, b) => a.top - b.top || a.x - b.x)) {
    const row = rows.find((r) => r.page === item.page && Math.abs(r.top - item.top) < Math.max(2, item.size * 0.4));
    if (row) row.items.push(item);
    else rows.push({ page: item.page, top: item.top, items: [item] });
  }
  const lines = [];
  for (const row of rows) {
    let current = null;
    for (const item of row.items.sort((a, b) => a.x - b.x)) {
      const charWidth = item.w / Math.max(item.str.length, 1);
      const end = current ? Math.max(...current.items.map((other) => other.x + other.w)) : 0;
      if (current && item.x - end < Math.max(pageWidth * 0.03, charWidth * 3)) current.items.push(item);
      else lines.push((current = { page: row.page, top: row.top, items: [item] }));
    }
  }
  return lines.map((line) => {
    const sorted = line.items;
    const largest = sorted.reduce((best, item) => (item.size > best.size ? item : best));
    let text = "";
    let endX = -Infinity;
    for (const item of sorted) {
      if (text && item.x - endX > item.size * 0.15 && !text.endsWith(" ") && !item.str.startsWith(" ")) text += " ";
      text += item.str;
      endX = item.x + item.w;
    }
    return { page: line.page, top: line.top, x0: sorted[0].x, x1: endX, size: largest.size, font: largest.font, text: text.replace(/\s+/g, " ").trim(), items: sorted };
  });
}

// A heading: a short title-like line that is larger, bold or in capitals compared to the body
function isHeadingLine(line, bodySize) {
  const text = line.text.replace(/[:\s]+$/, "");
  const words = text.split(/\s+/).length;
  if (!text || words > 5 || text.length > 40 || /[.,;]$|@|\d{3}|https?:/.test(text) || bulletOf(text)) return false;
  const larger = line.size >= bodySize * 1.12;
  const bold = line.items.every((item) => isBoldFont(item.font.raw));
  const caps = text === text.toUpperCase() && /[A-Z]{3}/.test(text);
  const known = sectionIdOf(text) !== null;
  return known ? larger || bold || caps : (larger && (bold || caps)) || (bold && caps);
}

async function detectPdf(buffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise;
  const items = [];
  const glyphsByColor = new Map();
  const textByColor = new Map();
  let first = null; // Page 1: size, shapes, images, segments
  try {
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const ops = await page.getOperatorList(); // Also loads the fonts, so their names are known
      const content = await page.getTextContent();
      const fonts = new Map();
      const fontOf = (id) => {
        if (!fonts.has(id)) {
          let raw = null;
          let fallback = null;
          try {
            const font = page.commonObjs.get(id);
            raw = font?.name ?? null;
            fallback = font?.fallbackName ?? null;
          } catch {
            // A font pdf.js didn't load: its name is unknown
          }
          const name = cleanFontName(raw);
          fonts.set(id, { raw, name, category: fontCategory(name, fallback) });
        }
        return fonts.get(id);
      };
      const pageItems = content.items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          page: n,
          str: item.str,
          x: item.transform[4],
          top: height - item.transform[5],
          w: item.width,
          size: item.height || Math.abs(item.transform[3]),
          font: fontOf(item.fontName),
        }));
      items.push(...pageItems);

      const drawn = readOperators(ops, height);
      for (const [color, count] of drawn.glyphsByColor) glyphsByColor.set(color, (glyphsByColor.get(color) ?? 0) + count);
      for (const [color, text] of drawn.textByColor) textByColor.set(color, (textByColor.get(color) ?? "") + text);
      if (n === 1) {
        const { segments } = toSegments(pageItems.map((item) => ({ str: item.str, x: item.x, y: item.top, w: item.w, h: item.size })), width);
        first = { width, height, shapes: drawn.shapes, images: drawn.images, segments };
      }
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  if (!items.length || !first) return null;
  const { width, height } = first;

  // Sizes and fonts, weighted by how much text uses them
  const charsBySize = new Map();
  const charsByFont = new Map();
  for (const item of items) {
    const chars = item.str.replace(/\s/g, "").length;
    charsBySize.set(round(item.size), (charsBySize.get(round(item.size)) ?? 0) + chars);
    if (item.font.name) charsByFont.set(item.font.name, (charsByFont.get(item.font.name) ?? 0) + chars);
  }
  const bodySize = topKey(charsBySize);
  const fontInfo = (name) => (name ? { name, category: items.find((item) => item.font.name === name)?.font.category ?? "sans" } : null);
  const bodyFont = fontInfo(topKey(new Map([...charsByFont].filter(([name]) => items.some((item) => item.font.name === name && Math.abs(round(item.size) - bodySize) <= 0.5)))) ?? topKey(charsByFont));

  const lines = toLines(items, width);
  const firstPage = lines.filter((line) => line.page === 1);
  // The name: the largest text in the top part of page 1
  const nameLine = firstPage.filter((line) => line.top < height * 0.4).reduce((best, line) => (!best || line.size > best.size ? line : best), null);

  // Columns: a filled side panel (a sidebar), or text that starts at a second position across the page
  const sidebarShape = first.shapes.find((shape) => {
    const w = shape.x1 - shape.x0;
    const h = shape.bottom - shape.top;
    return !(luminance(shape.color) > 0.97) && h > height * 0.6 && w > width * 0.18 && w < width * 0.5 && (shape.x0 < width * 0.03 || shape.x1 > width * 0.97);
  });
  const textColumns = detectColumns(first.segments, width);
  let columns = 1;
  let sidebar = null;
  let split = null; // x where the side column ends (left side) or starts (right side)
  let sideIsLeft = false;
  if (sidebarShape) {
    columns = 2;
    sideIsLeft = sidebarShape.x0 < width * 0.03;
    sidebar = sideIsLeft ? "left" : "right";
    split = sideIsLeft ? sidebarShape.x1 : sidebarShape.x0;
  } else if (textColumns) {
    columns = 2;
    split = (textColumns.starts[1] / 100) * width - 4;
    // The narrower column is the side column
    const leftChars = firstPage.filter((line) => line.x0 < split).reduce((sum, line) => sum + line.text.length, 0);
    const rightChars = firstPage.filter((line) => line.x0 >= split).reduce((sum, line) => sum + line.text.length, 0);
    sideIsLeft = leftChars < rightChars;
  }
  const isSide = (line) => columns === 2 && (sideIsLeft ? line.x0 < split : line.x0 >= split);
  const sideRatio = columns === 2 ? sideRatioOf(((sideIsLeft ? split : width - split) / width) * 100) : null;

  // Header alignment: where the name sits in its column (or the page)
  let headerAlign = null;
  if (nameLine) {
    // Measured against the longer lines in the name's own column
    const block = firstPage.filter((line) => line !== nameLine && line.text.length > 30 && isSide(line) === isSide(nameLine));
    const left = block.length ? Math.min(...block.map((line) => line.x0)) : width * 0.08;
    const right = block.length ? Math.max(...block.map((line) => line.x1)) : width * 0.92;
    const centre = (nameLine.x0 + nameLine.x1) / 2;
    if (Math.abs(centre - (left + right) / 2) < (right - left) * 0.06 && nameLine.x0 > left + (right - left) * 0.05) headerAlign = "center";
    else if (Math.abs(nameLine.x1 - right) < (right - left) * 0.04 && nameLine.x0 > left + (right - left) * 0.3) headerAlign = "right";
    else headerAlign = "left";
  }

  // Section headings, in reading order: the main column first, then the side column
  const headingLines = lines.filter((line) => line !== nameLine && isHeadingLine(line, bodySize) && !isContactHeading(line.text));
  const order = (line) => [isSide(line) ? 1 : 0, line.page, line.top];
  const sortedHeadings = headingLines.sort((a, b) => {
    const [sa, pa, ta] = order(a);
    const [sb, pb, tb] = order(b);
    return sa - sb || pa - pb || ta - tb;
  });
  const sections = [];
  for (const line of sortedHeadings) {
    const id = sectionIdOf(line.text) ?? "additional";
    if (id !== "additional" && sections.some((section) => section.id === id)) continue;
    if (id === "additional" && sections.some((section) => section.id === "additional")) continue; // One entry: additional sections keep their own headings
    sections.push({ id, heading: tidyHeading(line.text), side: isSide(line) });
  }

  // Fonts of the headings and the name
  const headingFontName = topKey(new Map(headingLines.map((line) => [line.font.name, headingLines.filter((other) => other.font.name === line.font.name).length]).filter(([name]) => name)));
  const headingSizes = headingLines.map((line) => line.size).sort((a, b) => a - b);

  // Colours: the text colour (most glyphs) and the accent (the most used colour that isn't a gray)
  const textColor = topKey(glyphsByColor);
  const coloured = new Map([...glyphsByColor].filter(([color]) => !isNeutral(color)));
  let accent = topKey(coloured);
  if (!accent && sidebarShape && !isNeutral(sidebarShape.color)) accent = sidebarShape.color;
  // A coloured band across the top of page 1 (behind the name)
  const band = first.shapes.find((shape) => shape.top < height * 0.05 && shape.x1 - shape.x0 > width * 0.8 && shape.bottom - shape.top > height * 0.06 && shape.bottom - shape.top < height * 0.35 && luminance(shape.color) < 0.97);
  if (!accent && band && !isNeutral(band.color)) accent = band.color;

  // Bullets: the most common bullet character at the start of a line (or of a line's first item)
  const bulletCounts = new Map();
  for (const line of lines) {
    const style = bulletOf(line.text) ?? bulletOf(line.items[0]?.str ?? "");
    if (style) bulletCounts.set(style, (bulletCounts.get(style) ?? 0) + 1);
  }
  const bulletStyle = (bulletCounts.size && [...bulletCounts.values()].reduce((a, b) => a + b, 0) >= 2 && topKey(bulletCounts)) || null;

  // A photo: a roughly square picture near the top of page 1
  const hasPhoto = first.images.some((image) => {
    const w = image.x1 - image.x0;
    const h = image.bottom - image.top;
    return image.top < height * 0.4 && w > 35 && w < width * 0.4 && h / w > 0.6 && h / w < 1.7;
  });

  return {
    source: "pdf",
    pageSize: Math.abs(width - 612) < 6 ? "Letter" : Math.abs(width - 595) < 6 ? "A4" : null,
    fonts: {
      body: bodyFont,
      heading: fontInfo(headingFontName),
      name: nameLine ? fontInfo(nameLine.font.name) : null,
    },
    sizes: {
      body: bodySize ? round(bodySize) : null,
      heading: headingSizes.length ? round(headingSizes[Math.floor(headingSizes.length / 2)]) : null,
      name: nameLine ? round(nameLine.size) : null,
    },
    colors: {
      accent,
      text: textColor,
      sidebar: sidebarShape?.color ?? null,
      headerBand: band?.color ?? null,
    },
    layout: { columns, sidebar, sideRatio, headerAlign },
    sections,
    bulletStyle,
    hasPhoto,
  };
}

// ---------- DOCX ----------

const attr = (xml, name) => xml.match(new RegExp(`w:${name}="([^"]*)"`))?.[1] ?? null;
const decode = (text) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

async function detectDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name) => (zip.file(name) ? zip.file(name).async("string") : "");
  const document = await read("word/document.xml");
  const styles = await read("word/styles.xml");
  const theme = await read("word/theme/theme1.xml");
  const numbering = await read("word/numbering.xml");
  if (!document) return null;

  // Fonts: the document defaults and the heading style, falling back to the theme's fonts
  const themeFont = (kind) => theme.match(new RegExp(`<a:${kind}Font>[\\s\\S]*?<a:latin typeface="([^"]+)"`))?.[1] ?? null;
  const defaults = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? "";
  const styleXml = (id) => styles.match(new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`))?.[0] ?? "";
  const fontIn = (xml, fallback) => attr(xml.match(/<w:rFonts\b[^>]*>/)?.[0] ?? "", "ascii") ?? fallback;
  const normal = styleXml("Normal");
  const heading1 = styleXml("Heading1") || styleXml("Heading2");
  const title = styleXml("Title");

  // The font used for most text in the body runs (direct formatting wins over the styles)
  const runFonts = new Map();
  for (const run of document.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
    const font = attr(run[1].match(/<w:rFonts\b[^>]*>/)?.[0] ?? "", "ascii");
    const text = (run[1].match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) ?? []).join("").replace(/<[^>]+>/g, "");
    if (font && text.trim()) runFonts.set(font, (runFonts.get(font) ?? 0) + text.length);
  }
  const bodyName = topKey(runFonts) ?? fontIn(normal, fontIn(defaults, themeFont("minor")));
  const headingName = fontIn(heading1, themeFont("major") ?? bodyName);
  const nameFontName = fontIn(title, headingName);
  const info = (name) => (name ? { name, category: fontCategory(name) } : null);

  const halfPoints = (xml) => Number(attr(xml.match(/<w:sz\b[^>]*>/)?.[0] ?? "", "val")) || null;
  const bodyHalf = halfPoints(normal) ?? halfPoints(defaults);
  const headingHalf = halfPoints(heading1);

  // Paragraphs: their text, style, alignment, size and whether every run is bold
  const paragraphs = [...document.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((match) => {
    const xml = match[1];
    const text = decode((xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")).trim();
    const runs = [...xml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)].filter((run) => /<w:t[\s>]/.test(run[1]));
    return {
      text,
      style: attr(xml.match(/<w:pStyle\b[^>]*>/)?.[0] ?? "", "val") ?? "",
      align: attr(xml.match(/<w:jc\b[^>]*>/)?.[0] ?? "", "val"),
      bold: runs.length > 0 && runs.every((run) => /<w:b(\s*\/>|\s+w:val="(1|true)")/.test(run[1])),
      size: halfPoints(xml),
      numbered: /<w:numPr>/.test(xml),
    };
  }).filter((paragraph) => paragraph.text);

  const bodyPt = bodyHalf ? bodyHalf / 2 : 11;
  const isHeading = (p) => {
    if (/^(Heading|Title|Subtitle)/i.test(p.style)) return !/^Title|^Subtitle/i.test(p.style);
    if (p.numbered || p.text.length > 40 || p.text.split(/\s+/).length > 5 || /[.,;]$|@|\d{3}/.test(p.text)) return false;
    const caps = p.text === p.text.toUpperCase() && /[A-Z]{3}/.test(p.text);
    const larger = p.size && p.size / 2 >= bodyPt * 1.12;
    return sectionIdOf(p.text) !== null ? p.bold || caps || larger : (p.bold && caps) || (larger && (p.bold || caps));
  };
  const sections = [];
  const headings = paragraphs.slice(1).filter((p) => isHeading(p) && !isContactHeading(p.text)); // The first paragraph is the name
  for (const paragraph of headings) {
    const id = sectionIdOf(paragraph.text) ?? "additional";
    if (sections.some((section) => section.id === id)) continue;
    sections.push({ id, heading: tidyHeading(paragraph.text), side: false });
  }

  // Colours: the most used non-gray run colour is the accent
  const colorCounts = new Map();
  for (const run of document.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
    const value = attr(run[1].match(/<w:color\b[^>]*>/)?.[0] ?? "", "val");
    const text = (run[1].match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) ?? []).join("").replace(/<[^>]+>/g, "");
    if (value && /^[0-9a-f]{6}$/i.test(value) && text.trim()) colorCounts.set(`#${value.toLowerCase()}`, (colorCounts.get(`#${value.toLowerCase()}`) ?? 0) + text.length);
  }
  for (const id of ["Heading1", "Heading2", "Title"]) {
    const value = attr(styleXml(id).match(/<w:color\b[^>]*>/)?.[0] ?? "", "val");
    if (value && /^[0-9a-f]{6}$/i.test(value)) colorCounts.set(`#${value.toLowerCase()}`, (colorCounts.get(`#${value.toLowerCase()}`) ?? 0) + 50 * headings.length);
  }
  const accent = topKey(new Map([...colorCounts].filter(([color]) => !isNeutral(color))));

  // Bullets: the bullet characters in the numbering definitions
  const bulletCounts = new Map();
  for (const level of numbering.matchAll(/<w:lvl\b[\s\S]*?<\/w:lvl>/g)) {
    if (!/<w:numFmt w:val="bullet"/.test(level[0])) continue;
    const symbol = decode(attr(level[0].match(/<w:lvlText\b[^>]*>/)?.[0] ?? "", "val") ?? "");
    // Symbol-font bullets ("" in Symbol / Wingdings) are dots
    const style = bulletOfSymbol(symbol.trim()) ?? (/[\uF0B7\uF0A7\uF0FC]/.test(symbol) ? "disc" : null);
    if (style) bulletCounts.set(style, (bulletCounts.get(style) ?? 0) + 1);
  }

  const namePara = paragraphs[0];
  const pageWidth = Number(attr(document.match(/<w:pgSz\b[^>]*>/)?.[0] ?? "", "w")); // Twentieths of a point
  return {
    source: "docx",
    pageSize: pageWidth ? (Math.abs(pageWidth / 20 - 612) < 6 ? "Letter" : Math.abs(pageWidth / 20 - 595) < 6 ? "A4" : null) : null,
    fonts: { body: info(bodyName), heading: info(headingName), name: info(nameFontName) },
    sizes: {
      body: bodyHalf ? bodyHalf / 2 : null,
      heading: headingHalf ? headingHalf / 2 : (headings.find((p) => p.size)?.size ?? 0) / 2 || null,
      name: namePara?.size ? namePara.size / 2 : halfPoints(title) ? halfPoints(title) / 2 : null,
    },
    colors: { accent, text: null, sidebar: null, headerBand: null },
    // Word columns and text boxes don't translate reliably: DOCX files get a single column
    layout: { columns: 1, sidebar: null, sideRatio: null, headerAlign: namePara?.align === "center" ? "center" : namePara?.align === "right" ? "right" : "left" },
    sections,
    bulletStyle: topKey(bulletCounts),
    hasPhoto: Object.keys(zip.files).some((name) => /^word\/media\/.+\.(png|jpe?g|gif|bmp|webp)$/i.test(name)),
  };
}

// The design of an uploaded file ({ buffer, mimetype }), or null if it can't be read.
// Never throws: a file whose design can't be read still imports.
export default async function detectDesign(file) {
  try {
    return file.mimetype === "application/pdf" ? await detectPdf(file.buffer) : await detectDocx(file.buffer);
  } catch (error) {
    console.error("Reading the file's design failed:", error.message);
    return null;
  }
}
