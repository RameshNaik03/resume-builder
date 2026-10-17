// Colour, font and spacing options that can be combined with any layout.
// Fonts are standard system fonts so the PDF always matches the preview
// and ATS systems can read the text reliably.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const HUMANIST = 'Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

// Exported so a layout can use a specific font for parts of the page (e.g. serif headings)
export const FONTS = { SANS, HUMANIST, SERIF };

// Each theme:
//   accent       - the one highlight colour (headings, name, rules)
//   text / muted - main and secondary text colours
//   line         - thin divider lines
//   fontFamily   - font stack for the whole resume
//   headingStyle - "caps" (small uppercase headings) or "title" (larger normal-case headings)
//   spacing      - multiplier for vertical gaps (1 = normal, 0.9 = tighter, 1.1 = roomier)
export const THEMES = [
  {
    id: "navy",
    name: "Navy",
    accent: "#1e3a8a",
    text: "#1e293b",
    muted: "#475569",
    line: "#cbd5e1",
    fontFamily: SANS,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "charcoal",
    name: "Charcoal",
    accent: "#262626",
    text: "#171717",
    muted: "#525252",
    line: "#d4d4d4",
    fontFamily: HUMANIST,
    headingStyle: "title",
    spacing: 1,
  },
  {
    id: "forest",
    name: "Forest",
    accent: "#166534",
    text: "#1f2937",
    muted: "#4b5563",
    line: "#d1d5db",
    fontFamily: SERIF,
    headingStyle: "title",
    spacing: 1.1,
  },
  {
    id: "burgundy",
    name: "Burgundy",
    accent: "#881337",
    text: "#1c1917",
    muted: "#57534e",
    line: "#d6d3d1",
    fontFamily: SERIF,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "slate",
    name: "Slate",
    accent: "#334155",
    text: "#0f172a",
    muted: "#64748b",
    line: "#e2e8f0",
    fontFamily: SANS,
    headingStyle: "caps",
    spacing: 0.9,
  },
];

// Richer themes for the Advanced tier. Two extra colours for layouts with coloured areas:
//   soft     - a light tint of the accent (backgrounds, chips)
//   onAccent - text colour used on top of the accent colour
export const ADVANCED_THEMES = [
  {
    id: "ocean",
    name: "Ocean",
    accent: "#0c4a6e",
    soft: "#e0f2fe",
    onAccent: "#ffffff",
    text: "#0f172a",
    muted: "#475569",
    line: "#cbd5e1",
    fontFamily: SANS,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "plum",
    name: "Plum",
    accent: "#5b2163",
    soft: "#f6ecf5",
    onAccent: "#ffffff",
    text: "#1f1724",
    muted: "#5f5466",
    line: "#ddd3df",
    fontFamily: SERIF,
    headingStyle: "title",
    spacing: 1,
  },
  {
    id: "teal",
    name: "Teal",
    accent: "#0f766e",
    soft: "#e6f4f1",
    onAccent: "#ffffff",
    text: "#132522",
    muted: "#4b5f5b",
    line: "#cfe0dc",
    fontFamily: HUMANIST,
    headingStyle: "caps",
    spacing: 1,
  },
  {
    id: "sunset",
    name: "Sunset",
    accent: "#c2410c",
    soft: "#fff1e8",
    onAccent: "#ffffff",
    text: "#1c1917",
    muted: "#57534e",
    line: "#e7d8cf",
    fontFamily: SANS,
    headingStyle: "title",
    spacing: 1,
  },
  {
    id: "graphite",
    name: "Graphite",
    accent: "#374151",
    soft: "#f3f4f6",
    onAccent: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    line: "#d1d5db",
    fontFamily: HUMANIST,
    headingStyle: "caps",
    spacing: 0.95,
  },
];

// Premium themes add two more options for decorative layouts:
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

// Scales a gap by the theme's spacing, e.g. space(theme, 12) -> "13.2pt" for Forest
export const space = (theme, pt) => `${pt * theme.spacing}pt`;
