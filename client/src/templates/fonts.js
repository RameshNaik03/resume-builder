import { FONT_OPTIONS, getFont } from "./design";

// Loads the Google Fonts used by resume designs.
//
// On screen: one <link> stylesheet per font, added to <head> the first time it's needed.
// In the PDF: react-to-print copies those stylesheets into its print frame, but the
// browser may print before the font files arrive there. So for printing we also hand
// react-to-print the actual font files (getPrintFonts), and it waits for them to load.

const cssUrl = (font) => `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;

// Adds the stylesheet for each font id (safe to call repeatedly)
export function loadFonts(ids) {
  for (const id of ids) {
    const font = getFont(id);
    if (!font || document.getElementById(`resume-font-${id}`)) continue;
    const link = document.createElement("link");
    link.id = `resume-font-${id}`;
    link.rel = "stylesheet";
    link.href = cssUrl(font);
    document.head.appendChild(link);
  }
}

// Every font in the picker (so each option can preview itself)
export const loadAllFonts = () => loadFonts(FONT_OPTIONS.map((font) => font.id));

const printFontCache = new Map(); // font id -> Promise of react-to-print font entries

// The Latin font files of a font, as { family, source, weight, style } for react-to-print.
// (Google splits fonts by alphabet; resumes only need the Latin set.)
async function fetchPrintFont(font) {
  const css = await (await fetch(cssUrl(font))).text();
  const faces = [];
  for (const [, block] of css.matchAll(/\/\* latin \*\/\s*@font-face\s*{([^}]*)}/g)) {
    const style = block.match(/font-style:\s*([^;]+);/)?.[1];
    const weight = block.match(/font-weight:\s*([^;]+);/)?.[1];
    const url = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (url) faces.push({ family: font.name, source: `url(${url})`, weight, style });
  }
  return faces;
}

export async function getPrintFonts(ids) {
  const lists = await Promise.all(
    ids.map((id) => {
      const font = getFont(id);
      if (!font) return [];
      if (!printFontCache.has(id)) {
        // If it fails (e.g. offline), forget it so the next print tries again
        printFontCache.set(id, fetchPrintFont(font).catch(() => (printFontCache.delete(id), [])));
      }
      return printFontCache.get(id);
    })
  );
  return lists.flat();
}
