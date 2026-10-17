// Colour, font and spacing options that can be combined with any layout.
// Fonts are standard system fonts so the PDF always matches the preview
// and ATS systems can read the text reliably.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const HUMANIST = 'Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

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

// Scales a gap by the theme's spacing, e.g. space(theme, 12) -> "13.2pt" for Forest
export const space = (theme, pt) => `${pt * theme.spacing}pt`;
