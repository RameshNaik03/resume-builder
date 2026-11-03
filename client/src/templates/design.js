// Per-resume design settings.
//
// Every template has default settings (from its theme and layout, see getDesignDefaults).
// A resume's `design` object only stores the settings the user changed, so an empty
// design looks exactly like the template. resolveDesign() combines the two, and
// designCssVars() turns the result into the CSS variables every layout reads:
//   --font-body / --font-heading     fonts
//   --fs-scale / --hs-scale          text and heading size (used by the fs-* / hfs-* utilities)
//   --lh                             line height
//   --para-space / --section-space   spacing multipliers (see itemGap / sectionGap in themes.js)
//   --bullet-space                   bullet gaps, relative to the template default
//   --m-top / --m-right / ...        page margins
//   --divider-w / -style / -pad      divider lines (divider-b, divider-l, divider-rule utilities)
//   --bullet / --header-align        bullet marker and header alignment
//   --bm-w / -h / -r / -clip / -indent  drawn bullet marker (foundation layouts)
//   --base-size                      body text size (foundation layouts)
// Section order, visibility, headings, columns, skills style and date format don't need CSS:
// prepareResume() applies them to the data the layouts render.
//   --accent, --text, --muted, --heading, --line, --bg, --soft, --deep, --gradient, --on-accent,
//   --name-color (foundation layouts: the accent when the layout puts it on the name)

export const MM_TO_PX = 96 / 25.4; // CSS pixels per millimetre

export const PAGE_SIZES = {
  A4: { label: "A4", detail: "210 × 297 mm", widthMm: 210, heightMm: 297, css: "A4" },
  Letter: { label: "US Letter", detail: "8.5 × 11 in", widthMm: 215.9, heightMm: 279.4, css: "letter" },
};

// Google Fonts offered in the Design tab. `google` is the css2 "family=" value
// (the weights and italic the layouts use; checked against the Google Fonts API).
export const FONT_OPTIONS = [
  { id: "inter", name: "Inter", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Inter:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "roboto", name: "Roboto", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Roboto:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "open-sans", name: "Open Sans", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Open+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "lato", name: "Lato", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Lato:ital,wght@0,400;0,700;0,900;1,400" },
  { id: "source-sans-3", name: "Source Sans 3", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Source+Sans+3:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", category: "Sans-serif", fallback: "Arial, sans-serif", google: "IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400" },
  { id: "montserrat", name: "Montserrat", category: "Sans-serif", fallback: "Arial, sans-serif", google: "Montserrat:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "merriweather", name: "Merriweather", category: "Serif", fallback: "Georgia, serif", google: "Merriweather:ital,wght@0,400;0,700;0,900;1,400" },
  { id: "lora", name: "Lora", category: "Serif", fallback: "Georgia, serif", google: "Lora:ital,wght@0,400;0,600;0,700;1,400" },
  { id: "playfair-display", name: "Playfair Display", category: "Serif", fallback: "Georgia, serif", google: "Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400" },
  { id: "source-serif-4", name: "Source Serif 4", category: "Serif", fallback: "Georgia, serif", google: "Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400" },
  { id: "fraunces", name: "Fraunces", category: "Serif", fallback: "Georgia, serif", google: "Fraunces:ital,wght@0,400;0,600;0,700;1,400" },
  { id: "eb-garamond", name: "EB Garamond", category: "Serif", fallback: "Garamond, Georgia, serif", google: "EB+Garamond:ital,wght@0,400;0,600;0,700;0,800;1,400" },
];

export const getFont = (id) => FONT_OPTIONS.find((font) => font.id === id);
export const fontStack = (font) => `"${font.name}", ${font.fallback}`;

// Divider lines under headings and between columns
export const DIVIDER_STYLES = {
  none: { label: "None", width: "0", style: "solid", pad: "0pt" },
  line: { label: "Line", width: "0.75pt", style: "solid", pad: "2pt" },
  thick: { label: "Thick", width: "1.75pt", style: "solid", pad: "3pt" },
  dotted: { label: "Dotted", width: "1.5pt", style: "dotted", pad: "3pt" },
};

// Slider ranges (the server validates the same ranges)
export const LIMITS = {
  baseFontSize: { min: 8, max: 14, step: 0.5 }, // pt
  headingSize: { min: 70, max: 160, step: 5 }, // % of the template's heading size
  lineHeight: { min: 1, max: 2, step: 0.05 },
  paragraphSpacing: { min: 0.5, max: 2, step: 0.05 }, // multiplier
  sectionSpacing: { min: 0.5, max: 2, step: 0.05 },
  margin: { min: 5, max: 40, step: 1 }, // mm
  photoSize: { min: 15, max: 45, step: 1 }, // mm
};

// "Normal" margins are the template's own, so they aren't listed here
export const MARGIN_PRESETS = {
  narrow: { marginTop: 10, marginRight: 12, marginBottom: 10, marginLeft: 12 },
  wide: { marginTop: 20, marginRight: 22, marginBottom: 20, marginLeft: 22 },
};

// Ready-made colour combinations for the Colors group
export const COLOR_PALETTES = [
  { id: "navy", name: "Navy", accentColor: "#1e3a8a", textColor: "#1e293b", headingColor: "#1e3a8a", backgroundColor: "#ffffff", dividerColor: "#cbd5e1" },
  { id: "charcoal", name: "Charcoal", accentColor: "#262626", textColor: "#171717", headingColor: "#262626", backgroundColor: "#ffffff", dividerColor: "#d4d4d4" },
  { id: "forest", name: "Forest", accentColor: "#166534", textColor: "#1f2937", headingColor: "#14532d", backgroundColor: "#ffffff", dividerColor: "#cfe3d5" },
  { id: "burgundy", name: "Burgundy", accentColor: "#881337", textColor: "#1c1917", headingColor: "#881337", backgroundColor: "#fffdfb", dividerColor: "#e7d3d8" },
  { id: "teal", name: "Teal", accentColor: "#0f766e", textColor: "#132522", headingColor: "#0f766e", backgroundColor: "#ffffff", dividerColor: "#cfe0dc" },
  { id: "plum", name: "Plum", accentColor: "#6b21a8", textColor: "#1f1724", headingColor: "#581c87", backgroundColor: "#ffffff", dividerColor: "#e2d6ec" },
  { id: "sunset", name: "Sunset", accentColor: "#c2410c", textColor: "#1c1917", headingColor: "#9a3412", backgroundColor: "#fffaf5", dividerColor: "#f0dccd" },
  { id: "ivory", name: "Ivory & Ink", accentColor: "#8a6a1f", textColor: "#1c1f2b", headingColor: "#1c2541", backgroundColor: "#fffdf6", dividerColor: "#e2d8bf" },
];

// ---------- Layout and section settings ----------

// The reorderable sections (contact details are part of the header, so they aren't listed)
export const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "additional", label: "Additional sections" }, // Each one keeps its own heading
];
const SECTION_IDS = SECTIONS.map((section) => section.id);
export const RENAMABLE_SECTIONS = SECTION_IDS.filter((id) => id !== "additional");
export const MAX_HEADING_LENGTH = 40;

export const SIDE_RATIOS = [30, 35, 40]; // Side column width in %; the main column gets the rest
export const HEADER_ALIGNS = ["left", "center", "right"];
export const SKILLS_DISPLAYS = { comma: "Comma list", tags: "Tags", bullets: "Bullet list" };
export const DATE_FORMATS = { short: "Jan 2024", numeric: "01/2024", year: "2024" };
// css = the list-style-type value (older layouts).
// shape = the drawn marker of foundation layouts (no character, so nothing stray reaches an ATS):
//   w / h - size, r - border radius, clip - clip-path, indent - marker + gap before the text
export const BULLET_STYLES = {
  disc: { label: "•", name: "Dot", css: "disc", shape: { w: "3.5pt", h: "3.5pt", r: "50%", clip: "none", indent: "12pt" } },
  dash: { label: "–", name: "Dash", css: '"–  "', shape: { w: "6pt", h: "0.9pt", r: "0", clip: "none", indent: "12pt" } },
  arrow: {
    label: "▸",
    name: "Arrow",
    css: '"▸  "',
    shape: { w: "4.5pt", h: "5.5pt", r: "0", clip: "polygon(0 0, 100% 50%, 0 100%)", indent: "12pt" },
  },
  none: { label: "None", name: "No bullets", css: "none", shape: { w: "0pt", h: "0pt", r: "0", clip: "none", indent: "0pt" } },
};

// Profile photo. radius = the CSS border-radius for each shape.
export const PHOTO_SHAPES = {
  circle: { label: "Circle", radius: "50%" },
  rounded: { label: "Rounded", radius: "16%" },
  square: { label: "Square", radius: "0" },
};
// "sidebar" only applies to the Sidebar layout; other layouts treat it as "left"
export const PHOTO_POSITIONS = { left: "Left of name", right: "Right of name", sidebar: "In the sidebar" };

// Which design keys each group of controls owns (used by the "Reset" buttons)
export const DESIGN_GROUPS = {
  typography: ["fontFamily", "headingFontFamily", "baseFontSize", "headingSize", "lineHeight"],
  spacing: ["paragraphSpacing", "sectionSpacing", "marginTop", "marginRight", "marginBottom", "marginLeft"],
  page: ["pageSize"],
  colors: ["accentColor", "textColor", "headingColor", "backgroundColor", "dividerColor", "dividerStyle"],
  sections: ["sectionOrder", "hiddenSections", "sectionHeadings"],
  layout: ["columns", "sideSections", "sideRatio", "headerAlign", "skillsDisplay", "dateFormat", "bulletStyle"],
  photo: ["showPhoto", "photoShape", "photoSize", "photoBorder", "photoBorderColor", "photoPosition"],
};

const HEX = /^#[0-9a-f]{6}$/i;

// ---------- Colour helpers (plain JS, so every value is a real hex colour) ----------

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

// mix("#000000", "#ffffff", 0.25) -> 25% of the way from the first colour to the second
export const mix = (from, to, amount) => {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex(a.map((value, i) => value + (b[i] - value) * amount));
};

// Relative luminance (0 = black, 1 = white)
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.04045) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// ---------- Defaults and overrides ----------

// Default heading colour. Foundation layouts (with `accentOn`) colour headings with the
// accent only when the accent goes on the headings; otherwise headings use the text colour.
const defaultHeadingColor = (layout, accent, deep, text) => {
  if (layout.accentOn) return layout.accentOn === "headings" ? accent : text;
  return layout.headingTone === "deep" ? deep : accent;
};

// The settings a template uses when the resume hasn't changed anything
export function getDesignDefaults(template) {
  const { theme, layoutDefaults: layout } = template;
  const [marginTop, marginRight, marginBottom, marginLeft] = layout.margins;
  return {
    // null = the theme's own (system) font; foundation layouts name their web fonts
    fontFamily: layout.fontFamily ?? null,
    headingFontFamily: layout.headingFontFamily ?? null, // null = same as the body / the layout's heading font
    baseFontSize: layout.baseFontSize,
    headingSize: 100,
    lineHeight: layout.lineHeight,
    paragraphSpacing: theme.spacing,
    sectionSpacing: theme.spacing,
    pageSize: "A4",
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    accentColor: theme.accent,
    textColor: theme.text,
    headingColor: defaultHeadingColor(layout, theme.accent, theme.deep ?? theme.accent, theme.text),
    backgroundColor: "#ffffff",
    dividerStyle: layout.dividerStyle,
    dividerColor: layout.accentOn === "rules" ? theme.accent : theme.line,

    sectionOrder: layout.sectionOrder,
    hiddenSections: [],
    sectionHeadings: layout.sectionTitles, // The layout's own headings, e.g. "Profile"
    columns: layout.columns,
    sideSections: layout.sideSections,
    sideRatio: layout.sideRatio,
    headerAlign: layout.headerAlign,
    skillsDisplay: null, // null = the layout's own style (a list or tags)
    dateFormat: null, // null = dates exactly as the user typed them
    bulletStyle: "disc",

    showPhoto: true, // Only matters once a photo has been uploaded
    photoShape: "circle",
    photoSize: layout.photoSize,
    photoBorder: false,
    photoBorderColor: null, // null = the layout's own choice (accent, or white on coloured areas)
    photoPosition: layout.photoPosition,
  };
}

// Setting values that are lists or objects are compared by content
export const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const isSectionList = (value) =>
  Array.isArray(value) && value.every((id) => SECTION_IDS.includes(id)) && new Set(value).size === value.length;

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

// Keeps only valid overrides (bad or out-of-range values are ignored, never crash the preview)
export function cleanDesign(design = {}) {
  const clean = {};
  const number = (key, limits) => {
    if (typeof design[key] === "number" && Number.isFinite(design[key])) clean[key] = clamp(design[key], limits);
  };

  if (getFont(design.fontFamily)) clean.fontFamily = design.fontFamily;
  if (getFont(design.headingFontFamily)) clean.headingFontFamily = design.headingFontFamily;
  number("baseFontSize", LIMITS.baseFontSize);
  number("headingSize", LIMITS.headingSize);
  number("lineHeight", LIMITS.lineHeight);
  number("paragraphSpacing", LIMITS.paragraphSpacing);
  number("sectionSpacing", LIMITS.sectionSpacing);
  for (const key of ["marginTop", "marginRight", "marginBottom", "marginLeft"]) number(key, LIMITS.margin);
  if (design.pageSize in PAGE_SIZES) clean.pageSize = design.pageSize;
  if (design.dividerStyle in DIVIDER_STYLES) clean.dividerStyle = design.dividerStyle;
  for (const key of ["accentColor", "textColor", "headingColor", "backgroundColor", "dividerColor"]) {
    if (HEX.test(design[key] ?? "")) clean[key] = design[key].toLowerCase();
  }

  if (isSectionList(design.sectionOrder) && design.sectionOrder.length === SECTION_IDS.length) clean.sectionOrder = design.sectionOrder;
  if (isSectionList(design.hiddenSections) && design.hiddenSections.length > 0) clean.hiddenSections = design.hiddenSections;
  if (isSectionList(design.sideSections)) clean.sideSections = design.sideSections;
  const headings = {};
  for (const id of RENAMABLE_SECTIONS) {
    const heading = design.sectionHeadings?.[id];
    if (typeof heading === "string" && heading.trim()) headings[id] = heading.trim().slice(0, MAX_HEADING_LENGTH);
  }
  if (Object.keys(headings).length > 0) clean.sectionHeadings = headings;
  if (design.columns === 1 || design.columns === 2) clean.columns = design.columns;
  if (SIDE_RATIOS.includes(design.sideRatio)) clean.sideRatio = design.sideRatio;
  if (HEADER_ALIGNS.includes(design.headerAlign)) clean.headerAlign = design.headerAlign;
  if (design.skillsDisplay in SKILLS_DISPLAYS) clean.skillsDisplay = design.skillsDisplay;
  if (design.dateFormat in DATE_FORMATS) clean.dateFormat = design.dateFormat;
  if (design.bulletStyle in BULLET_STYLES) clean.bulletStyle = design.bulletStyle;

  if (typeof design.showPhoto === "boolean") clean.showPhoto = design.showPhoto;
  if (design.photoShape in PHOTO_SHAPES) clean.photoShape = design.photoShape;
  number("photoSize", LIMITS.photoSize);
  if (typeof design.photoBorder === "boolean") clean.photoBorder = design.photoBorder;
  if (HEX.test(design.photoBorderColor ?? "")) clean.photoBorderColor = design.photoBorderColor.toLowerCase();
  if (design.photoPosition in PHOTO_POSITIONS) clean.photoPosition = design.photoPosition;
  return clean;
}

// Template defaults + the resume's overrides = the settings actually used.
// Colours that weren't changed follow the ones that were (e.g. a new accent
// also recolours headings unless a heading colour was picked).
export function resolveDesign(template, design) {
  const overrides = cleanDesign(design);
  const defaults = getDesignDefaults(template);
  const resolved = { ...defaults, ...overrides };
  // Renamed headings replace only the sections that were renamed
  resolved.sectionHeadings = { ...defaults.sectionHeadings, ...overrides.sectionHeadings };

  const layout = template.layoutDefaults;
  // Headings in the text colour (foundation layouts without accent headings) follow a new text colour
  const headingIsText = layout.accentOn && layout.accentOn !== "headings";
  if ((overrides.accentColor || (headingIsText && overrides.textColor)) && !overrides.headingColor) {
    resolved.headingColor = defaultHeadingColor(layout, resolved.accentColor, mix(resolved.accentColor, "#000000", 0.45), resolved.textColor);
  }
  if (overrides.accentColor && !overrides.dividerColor && layout.accentOn === "rules") resolved.dividerColor = overrides.accentColor;
  return { resolved, overrides };
}

// The CSS variables for a resolved design (set on the template's root element)
export function designCssVars(template, { resolved: d, overrides }) {
  const { theme, layoutDefaults: layout } = template;
  const bodyFont = getFont(d.fontFamily);
  const headingFont = getFont(d.headingFontFamily);
  const divider = DIVIDER_STYLES[d.dividerStyle];
  const marker = BULLET_STYLES[d.bulletStyle].shape;

  // Colours derived from the accent / text / background when those were changed
  const accentChanged = Boolean(overrides.accentColor);
  const deep = accentChanged ? mix(d.accentColor, "#000000", 0.45) : (theme.deep ?? theme.accent);

  return {
    "--font-body": bodyFont ? fontStack(bodyFont) : theme.fontFamily,
    ...(headingFont && { "--font-heading": fontStack(headingFont) }),
    "--base-size": `${d.baseFontSize}pt`,
    "--fs-scale": d.baseFontSize / layout.baseFontSize,
    "--hs-scale": d.headingSize / 100,
    "--lh": d.lineHeight,
    "--para-space": d.paragraphSpacing,
    // Bullet gaps were never scaled by the theme, so they follow the change from the default
    "--bullet-space": d.paragraphSpacing / theme.spacing,
    "--section-space": d.sectionSpacing,
    "--m-top": `${d.marginTop}mm`,
    "--m-right": `${d.marginRight}mm`,
    "--m-bottom": `${d.marginBottom}mm`,
    "--m-left": `${d.marginLeft}mm`,
    "--divider-w": divider.width,
    "--divider-style": divider.style,
    "--divider-pad": divider.pad,
    "--bullet": BULLET_STYLES[d.bulletStyle].css,
    "--bm-w": marker.w,
    "--bm-h": marker.h,
    "--bm-r": marker.r,
    "--bm-clip": marker.clip,
    "--bm-indent": marker.indent,
    "--header-align": d.headerAlign,
    // Margins that line up fixed-width header pieces (e.g. a short rule) with the text
    "--header-ml": d.headerAlign === "left" ? "0" : "auto",
    "--header-mr": d.headerAlign === "right" ? "0" : "auto",
    // Rules beside a heading (foundation "ruled" headings): 1 = a rule on that side, 0 = none
    "--rule-start": d.headerAlign === "left" ? 0 : 1,
    "--rule-end": d.headerAlign === "right" ? 0 : 1,

    "--accent": d.accentColor,
    "--soft": accentChanged ? mix(d.accentColor, d.backgroundColor, 0.88) : (theme.soft ?? "#f1f5f9"),
    "--on-accent": accentChanged ? (luminance(d.accentColor) > 0.45 ? "#111827" : "#ffffff") : (theme.onAccent ?? "#ffffff"),
    "--deep": deep,
    "--gradient": accentChanged
      ? `linear-gradient(135deg, ${deep} 0%, ${d.accentColor} 60%, ${mix(d.accentColor, "#ffffff", 0.35)} 100%)`
      : (theme.gradient ?? theme.accent),
    "--text": d.textColor,
    "--muted": overrides.textColor || overrides.backgroundColor ? mix(d.textColor, d.backgroundColor, 0.35) : theme.muted,
    "--heading": d.headingColor,
    // Foundation layouts: the name takes the accent only when the accent goes on the name
    "--name-color": layout.accentOn === "name" ? d.accentColor : d.textColor,
    "--line": d.dividerColor,
    "--bg": d.backgroundColor,
    color: d.textColor,
    fontFamily: "var(--font-body)",
    backgroundColor: d.backgroundColor,
  };
}

// Page size in CSS pixels plus the top/bottom margins pagination needs
export function pageMetrics(resolved) {
  const page = PAGE_SIZES[resolved.pageSize];
  return {
    widthPx: page.widthMm * MM_TO_PX,
    heightPx: page.heightMm * MM_TO_PX,
    marginTopPx: resolved.marginTop * MM_TO_PX,
    marginBottomPx: resolved.marginBottom * MM_TO_PX,
  };
}

// The Google Fonts a design uses (for loading on screen and in the PDF)
export const usedFontIds = (resolved) => [...new Set([resolved.fontFamily, resolved.headingFontFamily].filter(Boolean))];
