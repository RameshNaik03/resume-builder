// One width and one padding for every page's content (see Page.jsx).
//   "default" - 72rem: dashboards, results, flows (every content page)
//   "narrow"  - 28rem, centred: sign-in forms, error and "not found" states
// Workspace pages (the editor, the cover letter) lay out their own full-width toolbar and
// columns and use neither.
const WIDTHS = {
  default: "max-w-6xl py-8 sm:py-10",
  narrow: "max-w-md py-12 sm:py-16",
};

export const pageClass = (width = "default", extra = "") => `mx-auto w-full px-4 sm:px-8 ${WIDTHS[width]} ${extra}`.trim();
