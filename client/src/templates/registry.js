import { ADVANCED_THEMES, PREMIUM_THEMES } from "./themes";
import { FOUNDATION_THEMES, checkLayoutDefaults } from "./foundation/tokens";

// The three tiers shown as tabs in the template picker
export const TIERS = [
  { id: "basic", name: "Basic", description: "Clean single-column layouts that every ATS can read." },
  {
    id: "advanced",
    name: "Advanced",
    description:
      "Bolder designs with colour and two-column layouts. Templates without the ATS-friendly badge look great but can be harder for applicant tracking systems to read.",
  },
  {
    id: "premium",
    name: "Premium",
    description:
      "Our most polished, design-forward templates, free for everyone. Executive is ATS-friendly; Creative and Split Modern are best when a person, not software, reads your resume first.",
  },
];

// Each layout's default design settings (a resume's own design overrides them, see design.js):
//   baseFontSize - body text size in pt (all other text sizes scale with it)
//   lineHeight   - body line height
//   margins      - page margins in mm: [top, right, bottom, left]
//   headingTone  - section headings use the "accent" or the darker "deep" colour
//   dividerStyle - "none" | "line" | "thick" | "dotted"
//   sectionOrder - the order sections appear in (per column when there are two)
//   sectionTitles - the layout's own section headings (users can rename them)
//   columns / sideSections / sideRatio - one or two columns, what goes in the side column, its width in %
//   headerAlign  - "left" | "center" | "right"
//   photoSize / photoPosition - profile photo size in mm, and "left" | "right" of the name
//                  (or "sidebar" for the Sidebar layout's coloured column)
const STANDARD_ORDER = ["summary", "experience", "education", "skills", "projects", "additional"];
const STANDARD_TITLES = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects" };
const layoutDefaults = ({ sectionTitles, ...overrides } = {}) => ({
  baseFontSize: 10,
  lineHeight: 1.4,
  margins: [14, 16, 14, 16],
  headingTone: "accent",
  dividerStyle: "none",
  sectionOrder: STANDARD_ORDER,
  sectionTitles: { ...STANDARD_TITLES, ...sectionTitles },
  columns: 1,
  sideSections: ["skills", "education"], // Used when the user switches to two columns
  sideRatio: 35,
  headerAlign: "left",
  photoSize: 28,
  photoPosition: "left",
  ...overrides,
});
// Defaults for a layout built on the design foundation (templates/foundation), checked
// against its type scale, line heights, margins and fonts. Extra settings:
//   fontFamily / headingFontFamily - font ids (body and headings; headings default to the body font)
//   accentOn - where the one accent colour goes: "name", "headings" or "rules"
const foundationDefaults = (id, overrides) =>
  checkLayoutDefaults(id, layoutDefaults({ margins: [16, 16, 16, 16], headingFontFamily: null, ...overrides }));

// Sidebar and Split Modern list side-column sections first, as they always appeared
const SIDE_FIRST_ORDER = ["summary", "experience", "skills", "education", "projects", "additional"];

// Which layouts and themes make up each tier.
// To add a tier later, add an entry here (and the layout components in TemplateRenderer).
// Optional per-layout settings:
//   atsFriendly - overrides the tier's value for this layout
//   fullBleed   - the layout draws its own page margins (for colour that runs to the page edge)
//   themes      - overrides the tier's themes (foundation layouts use the foundation palettes)
const TIER_CONFIG = [
  {
    tier: "basic",
    atsFriendly: true,
    layouts: [
      // Centred header, accent headings with a hairline underneath
      {
        id: "classic",
        name: "Classic",
        defaults: foundationDefaults("classic", {
          dividerStyle: "line",
          headerAlign: "center",
          fontFamily: "inter",
          accentOn: "headings",
          margins: [16, 18, 16, 18],
        }),
      },
      // Left-aligned header, an accent bar beside each heading
      {
        id: "modern-line",
        name: "Modern Line",
        defaults: foundationDefaults("modern-line", {
          dividerStyle: "line",
          fontFamily: "ibm-plex-sans",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
        }),
      },
      // Pale tinted band behind the name and contact details
      {
        id: "soft-header",
        name: "Soft Header",
        fullBleed: true,
        defaults: foundationDefaults("soft-header", {
          dividerStyle: "line",
          fontFamily: "lato",
          accentOn: "name",
          margins: [16, 18, 16, 18],
        }),
      },
      // Dense but readable, for long experience
      {
        id: "compact-pro",
        name: "Compact Pro",
        defaults: foundationDefaults("compact-pro", {
          baseFontSize: 9.5,
          lineHeight: 1.35,
          dividerStyle: "line",
          fontFamily: "source-sans-3",
          accentOn: "rules",
          margins: [14, 15, 14, 15],
          photoSize: 22,
        }),
      },
      // Serif headings, centred header, generous spacing
      {
        id: "elegant-serif",
        name: "Elegant Serif",
        defaults: foundationDefaults("elegant-serif", {
          lineHeight: 1.45,
          dividerStyle: "line",
          headerAlign: "center",
          fontFamily: "source-sans-3",
          headingFontFamily: "playfair-display",
          accentOn: "headings",
          margins: [18, 18, 18, 18],
        }),
      },
    ],
    themes: FOUNDATION_THEMES,
  },
  {
    tier: "advanced",
    atsFriendly: true,
    layouts: [
      { id: "modern-header", name: "Modern Header", fullBleed: true, defaults: layoutDefaults({ margins: [13, 16, 14, 16] }) },
      // Two columns
      {
        id: "sidebar",
        name: "Sidebar",
        fullBleed: true,
        atsFriendly: false,
        defaults: layoutDefaults({
          baseFontSize: 9.5,
          margins: [14, 10, 14, 8],
          dividerStyle: "line",
          sectionOrder: SIDE_FIRST_ORDER,
          sectionTitles: { summary: "Profile" },
          columns: 2,
          sideRatio: 30,
          photoSize: 34,
          photoPosition: "sidebar", // At the top of the coloured column
        }),
      },
      { id: "timeline", name: "Timeline", atsFriendly: false, defaults: layoutDefaults() }, // Graphic timeline
    ],
    themes: ADVANCED_THEMES,
  },
  {
    tier: "premium",
    atsFriendly: true,
    layouts: [
      {
        id: "executive",
        name: "Executive",
        themes: FOUNDATION_THEMES,
        defaults: foundationDefaults("executive", {
          lineHeight: 1.4,
          dividerStyle: "line",
          headerAlign: "center",
          fontFamily: "source-sans-3",
          headingFontFamily: "source-serif-4",
          accentOn: "name",
          margins: [18, 18, 16, 18],
          // Headings ATS recognise ("Expertise" often isn't)
          sectionTitles: { summary: "Profile", projects: "Selected Projects" },
        }),
      },
      // Decorative shapes
      {
        id: "creative",
        name: "Creative",
        fullBleed: true,
        atsFriendly: false,
        defaults: layoutDefaults({
          margins: [15, 16, 15, 16],
          headingTone: "deep",
          sectionOrder: ["summary", "experience", "projects", "skills", "education", "additional"],
          sectionTitles: { summary: "About Me" },
          photoSize: 30,
          photoPosition: "right", // Next to the decorative circles
        }),
      },
      // Two columns
      {
        id: "split-modern",
        name: "Split Modern",
        fullBleed: true,
        atsFriendly: false,
        defaults: layoutDefaults({
          baseFontSize: 9.75,
          margins: [10, 14, 14, 14],
          headingTone: "deep",
          dividerStyle: "line",
          sectionOrder: SIDE_FIRST_ORDER,
          columns: 2,
          sideSections: ["skills", "education", "additional"],
          sideRatio: 30,
        }),
      },
    ],
    themes: PREMIUM_THEMES,
  },
];

// Every layout × theme combination becomes a template,
// e.g. { id: "classic-navy", name: "Classic Navy", tier: "basic", layout: "classic", theme: {...}, atsFriendly: true }
export const TEMPLATES = TIER_CONFIG.flatMap(({ tier, atsFriendly, layouts, themes }) =>
  layouts.flatMap((layout) =>
    (layout.themes ?? themes).map((theme) => ({
      id: `${layout.id}-${theme.id}`,
      name: `${layout.name} ${theme.name}`,
      tier,
      layout: layout.id,
      theme,
      layoutName: layout.name,
      atsFriendly: layout.atsFriendly ?? atsFriendly,
      fullBleed: layout.fullBleed ?? false,
      layoutDefaults: layout.defaults,
    }))
  )
);

// One entry per layout, with its templates (one per palette), for the template picker:
// { id: "classic", name: "Classic", tier: "basic", atsFriendly: true, templates: [...] }
export const LAYOUTS = TIER_CONFIG.flatMap(({ tier, layouts }) =>
  layouts.map((layout) => {
    const templates = TEMPLATES.filter((template) => template.layout === layout.id);
    return { id: layout.id, name: layout.name, tier, atsFriendly: templates[0].atsFriendly, templates };
  })
);

export const DEFAULT_TEMPLATE_ID = "classic-navy";

// Template ids saved by older versions of the app
// Old Basic layouts -> the closest new one, and old Basic themes -> the closest foundation palette
const RETIRED_BASIC_LAYOUTS = { classic: "classic", minimal: "modern-line", compact: "compact-pro" };
const RETIRED_BASIC_THEMES = { navy: "navy", charcoal: "graphite", forest: "forest", burgundy: "burgundy", slate: "slate-blue" };
const RETIRED_BASIC_IDS = Object.fromEntries(
  Object.entries(RETIRED_BASIC_LAYOUTS).flatMap(([oldLayout, newLayout]) =>
    Object.entries(RETIRED_BASIC_THEMES).map(([oldTheme, newTheme]) => [`${oldLayout}-${oldTheme}`, `${newLayout}-${newTheme}`])
  )
);

const LEGACY_IDS = {
  classic: "classic-navy",
  ...RETIRED_BASIC_IDS,
  // Executive moved to the foundation palettes
  "executive-royal-gold": "executive-navy",
  "executive-emerald": "executive-forest",
  "executive-midnight": "executive-navy",
  "executive-rose": "executive-burgundy",
  "executive-indigo-gradient": "executive-slate-blue",
};

// Finds a template by id. Old or unknown ids fall back to the default,
// so a resume always renders even if a template is renamed or removed.
export function getTemplate(id) {
  const resolvedId = LEGACY_IDS[id] ?? id;
  return (
    TEMPLATES.find((template) => template.id === resolvedId) ??
    TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)
  );
}
