import { TEMPLATES, getTemplate } from "./registry";
import { FONT_OPTIONS, LIMITS, SECTIONS, getFont } from "./design";

// Matches an uploaded resume's design (read by the server, see server/services/import/
// detectDesign.js) to the closest template and design settings, so "Edit with a matching
// template" starts from something that looks like the user's own file.
//
// matchDesign(detected) -> { templateId, design, notes }
//   templateId - the closest layout, in the palette nearest the file's accent colour
//   design     - the resume's design overrides: fonts, text size, accent, columns, header
//                alignment, the user's section order and heading names, bullets, page size
//   notes      - what was matched, in plain words, for the side-by-side screen
// Anything the file didn't show (null in `detected`) keeps the template's default.

const SECTION_IDS = SECTIONS.map((section) => section.id);
const STANDARD_HEADINGS = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects" };

// Common resume fonts -> the closest font we offer (by look: proportions, x-height, style)
const FONT_MATCHES = [
  ["inter", /^(inter|helvetica|arial|arimo|liberation sans|helvetica neue|sf pro|segoe ui|nimbus sans)/i],
  ["roboto", /^roboto/i],
  ["open-sans", /^(open sans|verdana|tahoma|noto sans|dejavu sans|droid sans)/i],
  ["lato", /^(lato|calibri|carlito|candara|corbel|gill sans|myriad)/i],
  ["source-sans-3", /^(source sans|aptos|franklin gothic|pt sans|trebuchet|nunito|work sans|fira sans)/i],
  ["ibm-plex-sans", /^ibm plex sans/i],
  ["montserrat", /^(montserrat|century gothic|poppins|raleway|futura|avenir|questrial|tw cen)/i],
  ["merriweather", /^(merriweather|georgia|cambria|caladea|pt serif|noto serif|dejavu serif|droid serif)/i],
  ["lora", /^(lora|book antiqua|palatino|constantia|crimson|sitka|charter)/i],
  ["playfair-display", /^(playfair|didot|bodoni|abril)/i],
  ["source-serif-4", /^(source serif|times|tinos|liberation serif|nimbus roman|minion|libre baskerville|literata)/i],
  ["fraunces", /^(fraunces|newsreader|recoleta)/i],
  ["eb-garamond", /^(eb garamond|garamond|adobe garamond|baskerville|caslon|cormorant|sabon)/i],
];

// The font we offer closest to a detected one ({ name, category }), or null
export function matchFont(font) {
  if (!font) return null;
  const known = FONT_OPTIONS.find((option) => option.name.toLowerCase() === font.name?.toLowerCase());
  if (known) return known.id;
  const match = FONT_MATCHES.find(([, pattern]) => pattern.test(font.name ?? ""));
  if (match) return match[0];
  return font.category === "serif" ? "source-serif-4" : "inter";
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const isLight = (hex) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.8;
};

// The layout that looks most like the file (see registry.js for what each one is)
function pickLayout(detected) {
  const { layout = {}, colors = {}, fonts = {}, sizes = {} } = detected;
  const serifHeadings = (fonts.heading ?? fonts.name ?? fonts.body)?.category === "serif";
  if (layout.columns === 2) return layout.sidebar ? "sidebar-pro" : "editorial";
  if (colors.headerBand) return isLight(colors.headerBand) ? "soft-header" : "bold-header";
  if (layout.headerAlign === "center") return serifHeadings ? "elegant-serif" : "classic";
  if (sizes.body && sizes.body <= 9.5) return "compact-pro";
  return "modern-line";
}

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

export function matchDesign(detected) {
  if (!detected) return null;
  const notes = [];
  const layoutId = pickLayout(detected);
  const accent = isHex(detected.colors?.accent) ? detected.colors.accent.toLowerCase() : null;
  // The palette nearest the accent (the accent itself is set exactly below)
  const candidates = TEMPLATES.filter((template) => template.layout === layoutId);
  const template = accent ? candidates.reduce((best, entry) => (distance(entry.theme.accent, accent) < distance(best.theme.accent, accent) ? entry : best)) : candidates[0];
  const defaults = template.layoutDefaults;
  const design = {};

  // Fonts: the body font, and the heading font when it's a different one
  const body = matchFont(detected.fonts?.body);
  const heading = matchFont(detected.fonts?.heading);
  if (body) {
    design.fontFamily = body;
    notes.push(`${detected.fonts.body.category === "serif" ? "Serif" : "Sans-serif"} font: ${detected.fonts.body.name} → ${getFont(body).name}`);
  }
  if (heading && heading !== body) {
    design.headingFontFamily = heading;
    notes.push(`Headings: ${detected.fonts.heading.name} → ${getFont(heading).name}`);
  } else if (body && defaults.headingFontFamily) {
    design.headingFontFamily = body; // The file uses one font: not the layout's own heading font
  }

  // Text size (the template scales its headings and name from it)
  if (typeof detected.sizes?.body === "number") {
    design.baseFontSize = Math.round(clamp(detected.sizes.body, LIMITS.baseFontSize) * 2) / 2;
    notes.push(`Text size ${design.baseFontSize} pt`);
  }

  if (accent) {
    design.accentColor = accent;
    notes.push(`Accent colour ${accent}`);
  }

  // Columns: two only when the file has two (a sidebar layout keeps its coloured column)
  const sections = Array.isArray(detected.sections) ? detected.sections.filter((section) => SECTION_IDS.includes(section.id)) : [];
  if (detected.layout?.columns === 2) {
    design.columns = 2;
    const side = sections.filter((section) => section.side).map((section) => section.id);
    if (side.length) design.sideSections = side;
    if ([30, 35, 40].includes(detected.layout.sideRatio)) design.sideRatio = detected.layout.sideRatio;
    notes.push(detected.layout.sidebar ? `Two columns with a ${detected.layout.sidebar} sidebar` : "Two columns");
  } else if (defaults.columns === 2) {
    design.columns = 1;
  }

  if (detected.layout?.headerAlign && detected.layout.headerAlign !== defaults.headerAlign) design.headerAlign = detected.layout.headerAlign;
  if (detected.layout?.headerAlign) notes.push(`${detected.layout.headerAlign === "center" ? "Centred" : detected.layout.headerAlign === "right" ? "Right-aligned" : "Left-aligned"} header`);

  // The user's section order (sections the file didn't have keep their usual place after them)
  if (sections.length) {
    const found = [...new Set(sections.map((section) => section.id))];
    design.sectionOrder = [...found, ...defaults.sectionOrder.filter((id) => !found.includes(id))];
    // Their own heading names (additional sections already keep theirs)
    const headings = {};
    for (const section of sections) {
      if (section.id !== "additional" && section.heading && !headings[section.id]) headings[section.id] = section.heading.slice(0, 40);
    }
    if (Object.keys(headings).length) design.sectionHeadings = headings;
    const renamed = Object.entries(headings).filter(([id, name]) => name.toLowerCase() !== STANDARD_HEADINGS[id].toLowerCase());
    notes.push(renamed.length ? `Your section order and headings (${renamed.map(([, name]) => `“${name}”`).join(", ")})` : "Your section order");
  }

  if (detected.bulletStyle) design.bulletStyle = detected.bulletStyle;
  if (detected.pageSize) design.pageSize = detected.pageSize;
  if (detected.hasPhoto) notes.push("Your file has a photo: add it under Personal info");

  return { templateId: template.id, design, notes, templateName: getTemplate(template.id).name };
}

// For "Choose a different template": keep what belongs to the user's content (section order,
// heading names, side column sections, page size) and let the chosen template set the look
export function contentSettings(design = {}) {
  const keep = ["sectionOrder", "sectionHeadings", "pageSize"];
  return Object.fromEntries(keep.filter((key) => design[key] !== undefined).map((key) => [key, design[key]]));
}
