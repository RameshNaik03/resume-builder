// The design foundation every redesigned template is built on: type scale, spacing, colours
// and fonts. Layouts never pick raw sizes or gaps; they pick values from these scales, and
// the checks below report any layout that steps outside them (see "Checks").
//
// All sizes are print points. They still follow the Design tab: text sizes are multiplied by
// --fs-scale (font size) and, for the name and headings, --hs-scale (heading size); gaps by
// --section-space / --para-space / --bullet-space (spacing). See design.js.

// ---------- Typography ----------

// Allowed range and default (pt) for each text role
export const TYPE_SCALE = {
  name: { min: 24, max: 30, default: 26 },
  headline: { min: 11, max: 12, default: 11.5 }, // Title under the name
  heading: { min: 10.5, max: 11.5, default: 11 }, // Section headings
  jobTitle: { min: 10.5, max: 11, default: 10.5 },
  meta: { min: 9.5, max: 10, default: 9.5 }, // Company, school, dates, contact line
  body: { min: 9.5, max: 10.5, default: 10 }, // The layout's baseFontSize
};
export const SMALL_TEXT = 8.5; // Tags, captions

export const LINE_HEIGHTS = {
  body: { min: 1.35, max: 1.45 },
  name: { min: 1.1, max: 1.2, default: 1.15 },
};

// Font pairings (ids from FONT_OPTIONS in design.js). Serif fonts are for headings only.
export const BODY_FONTS = ["inter", "source-sans-3", "ibm-plex-sans", "lato"];
export const SERIF_HEADING_FONTS = ["source-serif-4", "merriweather", "playfair-display", "fraunces"];

// ---------- Spacing ----------

// The only gaps a layout may use (pt)
export const SPACE = [4, 8, 12, 16, 24, 32];

// Default vertical rhythm, the same in every section:
//   section - above every section heading
//   heading - between a heading and its content
//   item    - between jobs, schools, projects
//   bullet  - between bullet points
export const RHYTHM = { section: 16, heading: 8, item: 12, bullet: 4 };

export const PAGE_MARGIN_MM = { min: 14, max: 18 };

// ---------- Colour ----------

// Corporate accent palettes. Text is near-black (never pure black), muted text is a mid gray
// that still prints clearly, and the accent goes on one thing only: the name, the section
// headings or the rules (each layout's `accentOn`, see registry.js).
//   line - hairline rules; soft - light tint for tags
export const PALETTES = [
  { id: "navy", name: "Navy", accent: "#1f3a5f", text: "#1c2129", muted: "#5c6370", line: "#d3d9e1", soft: "#edf1f6" },
  { id: "teal", name: "Deep Teal", accent: "#0f5257", text: "#1a2224", muted: "#5a6466", line: "#d0dcdb", soft: "#ebf3f2" },
  { id: "forest", name: "Forest", accent: "#2d5a3d", text: "#1b211d", muted: "#5d6560", line: "#d3dcd5", soft: "#edf3ef" },
  { id: "burgundy", name: "Burgundy", accent: "#7a2335", text: "#231c1e", muted: "#655c5e", line: "#e0d4d6", soft: "#f6edef" },
  { id: "graphite", name: "Graphite", accent: "#373e47", text: "#1d2025", muted: "#60656c", line: "#d8dadd", soft: "#f0f1f3" },
  { id: "slate-blue", name: "Slate Blue", accent: "#3d5a80", text: "#1c2028", muted: "#5d6470", line: "#d4dbe5", soft: "#edf1f7" },
];

// The palettes in the theme shape the registry and design.js expect (see themes.js).
// Fonts come from the layout (fontFamily / headingFontFamily), so fontFamily here is only
// the fallback while web fonts load.
export const FOUNDATION_THEMES = PALETTES.map((palette) => ({
  ...palette,
  deep: palette.accent,
  gradient: palette.accent,
  onAccent: "#ffffff",
  fontFamily: "Arial, sans-serif",
  headingStyle: "caps",
  spacing: 1,
}));

// ---------- Checks ----------
// Development only (production builds leave them out and never stop the app):
// each problem is logged with console.error and kept in FOUNDATION_PROBLEMS, which the
// round-trip test reads, so a layout outside the foundation fails the tests.

export const FOUNDATION_PROBLEMS = [];
const CHECKS_ON = Boolean(import.meta.env?.DEV);

function report(message) {
  const text = `Template foundation: ${message}`;
  FOUNDATION_PROBLEMS.push(text);
  console.error(text);
}

function checkRange(label, value, { min, max }) {
  if (typeof value !== "number" || value < min || value > max) report(`${label} must be ${min}–${max}, got ${value}`);
}

function checkSpace(label, value) {
  if (!SPACE.includes(value)) report(`${label} must be one of ${SPACE.join(", ")}pt, got ${value}`);
}

// Checks a foundation layout's registry defaults (see registry.js)
export function checkLayoutDefaults(id, defaults) {
  if (!CHECKS_ON) return defaults;
  checkRange(`${id} baseFontSize`, defaults.baseFontSize, TYPE_SCALE.body);
  checkRange(`${id} lineHeight`, defaults.lineHeight, LINE_HEIGHTS.body);
  defaults.margins.forEach((margin, index) => checkRange(`${id} margin ${index + 1}`, margin, PAGE_MARGIN_MM));
  if (!BODY_FONTS.includes(defaults.fontFamily)) report(`${id} body font must be one of ${BODY_FONTS.join(", ")}`);
  const heading = defaults.headingFontFamily;
  if (heading && !SERIF_HEADING_FONTS.includes(heading) && !BODY_FONTS.includes(heading)) {
    report(`${id} heading font must be one of ${[...SERIF_HEADING_FONTS, ...BODY_FONTS].join(", ")}`);
  }
  if (!["name", "headings", "rules"].includes(defaults.accentOn)) report(`${id} accentOn must be name, headings or rules`);
  return defaults;
}

// ---------- CSS variables ----------

const textSize = (pt) => `calc(${pt}pt * var(--fs-scale, 1))`;
const headingSize = (pt) => `calc(${pt}pt * var(--fs-scale, 1) * var(--hs-scale, 1))`;

// The CSS variables foundation.css reads, for a layout's chosen sizes and rhythm.
//   type   - { name, headline, heading, jobTitle, meta, nameLineHeight } (defaults above)
//   rhythm - { section, heading, item, bullet } from SPACE
export function foundationVars(type = {}, rhythm = {}) {
  const t = Object.fromEntries(
    ["name", "headline", "heading", "jobTitle", "meta"].map((key) => {
      const value = type[key] ?? TYPE_SCALE[key].default;
      if (CHECKS_ON) checkRange(`type.${key}`, value, TYPE_SCALE[key]);
      return [key, value];
    })
  );
  const nameLineHeight = type.nameLineHeight ?? LINE_HEIGHTS.name.default;
  const r = { ...RHYTHM, ...rhythm };
  if (CHECKS_ON) {
    checkRange("type.nameLineHeight", nameLineHeight, LINE_HEIGHTS.name);
    for (const key of Object.keys(RHYTHM)) checkSpace(`rhythm.${key}`, r[key]);
  }

  return {
    "--f-name": headingSize(t.name),
    "--f-name-lh": nameLineHeight,
    "--f-headline": textSize(t.headline),
    "--f-heading": headingSize(t.heading),
    "--f-job": textSize(t.jobTitle),
    "--f-meta": textSize(t.meta),
    "--f-small": textSize(SMALL_TEXT),
    "--f-section-gap": `calc(${r.section}pt * var(--section-space, 1))`,
    "--f-heading-gap": `calc(${r.heading}pt * var(--para-space, 1))`,
    "--f-item-gap": `calc(${r.item}pt * var(--para-space, 1))`,
    "--f-bullet-gap": `calc(${r.bullet}pt * var(--bullet-space, 1))`,
    "--f-tight-gap": `calc(${SPACE[0]}pt * var(--para-space, 1))`,
  };
}
