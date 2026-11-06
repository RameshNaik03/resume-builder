import { FONT_OPTIONS, getFont } from "./design";

// Loads the Google Fonts used by resume designs.
//
// One <link> stylesheet per font, added to <head> the first time it's needed. For the PDF,
// react-to-print copies these stylesheets into its print frame, and printing waits until the
// fonts the page uses have loaded there (utils/printPageStyle.js, printWhenFontsReady).

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
