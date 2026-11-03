// Colour, font and spacing options that can be combined with any layout.
// Fonts are standard system fonts so the PDF always matches the preview
// and ATS systems can read the text reliably.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const HUMANIST = 'Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

// Exported so a layout can use a specific font for parts of the page (e.g. serif headings)
export const FONTS = { SANS, HUMANIST, SERIF };

// Every theme has (the Basic tier uses the foundation palettes, see foundation/tokens.js):
//   accent       - the one highlight colour (headings, name, rules)
//   text / muted - main and secondary text colours
//   line         - thin divider lines
//   fontFamily   - font stack for the whole resume
//   headingStyle - "caps" (small uppercase headings) or "title" (larger normal-case headings)
//   spacing      - default multiplier for vertical gaps (1 = normal, 0.9 = tighter, 1.1 = roomier)
// These are only defaults: a resume's design settings can override fonts, colours and spacing.

// Premium themes (Creative, Split Modern) also have:
//   soft     - a light tint of the accent (backgrounds, chips)
//   onAccent - text colour used on top of the accent colour
// and two more options for decorative layouts:
//   deep     - a dark colour for bands and shapes
//   gradient - a CSS gradient for shapes and highlights
export const PREMIUM_THEMES = [
  {
    id: "royal-gold",
    name: "Royal Gold",
    accent: "#8a6a1f",
    deep: "#1c2541",
    gradient: "linear-gradient(135deg, #1c2541 0%, #34406b 60%, #b8913a 100%)",
    soft: "#f7f1e3",
    onAccent: "#ffffff",
    text: "#1c1f2b",
    muted: "#5b5e6b",
    line: "#e2d8bf",
    fontFamily: SERIF,
    headingStyle: "title",
    spacing: 1.05,
  },
  {
    id: "emerald",
    name: "Emerald",
    accent: "#047857",
    deep: "#064e3b",
    gradient: "linear-gradient(135deg, #064e3b 0%, #047857 55%, #34d399 100%)",
    soft: "#e7f6f0",
    onAccent: "#ffffff",
    text: "#10231c",
    muted: "#4b6159",
    line: "#cfe5dc",
    fontFamily: HUMANIST,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "midnight",
    name: "Midnight",
    accent: "#1d4ed8",
    deep: "#0b1120",
    gradient: "linear-gradient(135deg, #0b1120 0%, #1e293b 55%, #1d4ed8 100%)",
    soft: "#e8edf9",
    onAccent: "#ffffff",
    text: "#0f172a",
    muted: "#55607a",
    line: "#d5dbe8",
    fontFamily: SANS,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "rose",
    name: "Rose",
    accent: "#be123c",
    deep: "#4c0519",
    gradient: "linear-gradient(135deg, #4c0519 0%, #9f1239 55%, #fb7185 100%)",
    soft: "#fdecef",
    onAccent: "#ffffff",
    text: "#1f1418",
    muted: "#6b5359",
    line: "#f0d3da",
    fontFamily: SERIF,
    headingStyle: "title",
    spacing: 1,
  },
  {
    id: "indigo-gradient",
    name: "Indigo Gradient",
    accent: "#4f46e5",
    deep: "#312e81",
    gradient: "linear-gradient(135deg, #312e81 0%, #6d28d9 55%, #c026d3 100%)",
    soft: "#eef0fe",
    onAccent: "#ffffff",
    text: "#111127",
    muted: "#5a5b75",
    line: "#dcdcf3",
    fontFamily: SANS,
    headingStyle: "caps",
    spacing: 1,
  },
];

// Vertical gaps, scaled by the design's spacing settings (CSS variables from design.js,
// which default to the theme's `spacing`):
//   sectionGap - space above each section
//   itemGap    - space between entries, and between a heading and its content
export const sectionGap = (pt) => `calc(${pt}pt * var(--section-space, 1))`;
export const itemGap = (pt) => `calc(${pt}pt * var(--para-space, 1))`;
