import { FOUNDATION_THEMES, checkLayoutDefaults } from "./foundation/tokens";

// The three tiers shown as tabs in the template picker
export const TIERS = [
  { id: "basic", name: "Basic", description: "Clean single-column layouts that every ATS can read." },
  {
    id: "advanced",
    name: "Advanced",
    description:
      "More designed layouts with colour blocks, icons, cards and a timeline. Sidebar Pro and Timeline Plus look great but can be harder for applicant tracking systems to read.",
  },
  {
    id: "premium",
    name: "Premium",
    description:
      "Our most polished, design-forward templates, free for everyone. Editorial's two columns are best when a person, not software, reads your resume first.",
  },
];

// Each layout's default design settings (a resume's own design overrides them, see design.js):
//   baseFontSize - body text size in pt (all other text sizes scale with it)
//   lineHeight   - body line height
//   margins      - page margins in mm: [top, right, bottom, left]
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
// Defaults for a layout built on the design foundation (templates/foundation). They're checked
// against its type scale, line heights, margins and fonts, for the layout's tier (see TEMPLATES).
// Extra settings:
//   nameSize - the name's size in pt (24-30; Premium layouts may go up to 40)
//   fontFamily / headingFontFamily - font ids (body and headings; headings default to the body font)
//   accentOn - where the one accent colour goes: "name", "headings" or "rules"
const foundationDefaults = (overrides) => layoutDefaults({ margins: [16, 16, 16, 16], headingFontFamily: null, ...overrides });


// Which layouts and themes make up each tier.
// To add a tier later, add an entry here (and the layout components in TemplateRenderer).
// Optional per-layout settings:
//   atsFriendly - overrides the tier's value for this layout
//   fullBleed   - the layout draws its own page margins (for colour that runs to the page edge)
const TIER_CONFIG = [
  {
    tier: "basic",
    atsFriendly: true,
    layouts: [
      // Centred header, accent headings with a hairline underneath
      {
        id: "classic",
        name: "Classic",
        defaults: foundationDefaults({
          nameSize: 26,
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
        defaults: foundationDefaults({
          nameSize: 28,
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
        defaults: foundationDefaults({
          nameSize: 28,
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
        defaults: foundationDefaults({
          nameSize: 24,
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
        defaults: foundationDefaults({
          nameSize: 30,
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
      // Full-height accent sidebar (photo, contact, skills, languages) beside a white main
      // column. Two columns, so not ATS-friendly (the text still reads in order).
      {
        id: "sidebar-pro",
        name: "Sidebar Pro",
        fullBleed: true,
        atsFriendly: false,
        defaults: foundationDefaults({
          nameSize: 28,
          dividerStyle: "line",
          fontFamily: "lato",
          accentOn: "rules",
          margins: [16, 16, 16, 16],
          sectionTitles: { summary: "Profile" },
          columns: 2,
          sideSections: ["skills", "additional"],
          sideRatio: 35,
          photoSize: 34,
          photoPosition: "sidebar", // At the top of the coloured column
        }),
      },
      // Full-width accent header block with white text
      {
        id: "bold-header",
        name: "Bold Header",
        fullBleed: true,
        defaults: foundationDefaults({
          nameSize: 30,
          dividerStyle: "line",
          fontFamily: "inter",
          accentOn: "name",
          margins: [16, 18, 16, 18],
        }),
      },
      // Slim accent strip down the left edge, drawn icons in the headings
      {
        id: "split-accent",
        name: "Split Accent",
        fullBleed: true,
        defaults: foundationDefaults({
          nameSize: 28,
          dividerStyle: "line",
          fontFamily: "ibm-plex-sans",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
        }),
      },
      // Each section in a softly tinted rounded card
      {
        id: "card-sections",
        name: "Card Sections",
        defaults: foundationDefaults({
          nameSize: 28,
          dividerStyle: "line",
          fontFamily: "source-sans-3",
          accentOn: "headings",
          margins: [16, 16, 16, 16],
        }),
      },
      // Experience on a timeline with dates in a left column. The date column reads as a
      // separate column to some ATS, so it's not marked ATS-friendly (the text reads in order).
      {
        id: "timeline-plus",
        name: "Timeline Plus",
        atsFriendly: false,
        defaults: foundationDefaults({
          nameSize: 28,
          dividerStyle: "line",
          fontFamily: "source-sans-3",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
        }),
      },
    ],
    themes: FOUNDATION_THEMES,
  },
  {
    tier: "premium",
    atsFriendly: true,
    layouts: [
      {
        id: "executive",
        name: "Executive",
        defaults: foundationDefaults({
          nameSize: 28,
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
      // Magazine-style: large serif name, pull-quote summary, two columns with a column rule
      {
        id: "editorial",
        name: "Editorial",
        atsFriendly: false, // Two columns
        defaults: foundationDefaults({
          nameSize: 38,
          dividerStyle: "line",
          fontFamily: "source-sans-3",
          headingFontFamily: "fraunces",
          accentOn: "rules",
          margins: [18, 18, 16, 18],
          columns: 2,
          sideSections: ["skills", "education", "additional"],
          sideRatio: 35,
        }),
      },
      // Icon-led headings, drawn skill levels and a drawn career strip
      {
        id: "infographic",
        name: "Infographic",
        defaults: foundationDefaults({
          nameSize: 28,
          dividerStyle: "line",
          fontFamily: "inter",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
        }),
      },
      // Drawn initials badge, two-tone header, refined serif headings
      {
        id: "monogram",
        name: "Monogram",
        fullBleed: true,
        defaults: foundationDefaults({
          nameSize: 34,
          lineHeight: 1.45,
          dividerStyle: "line",
          headerAlign: "center",
          fontFamily: "lato",
          headingFontFamily: "playfair-display",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
          photoSize: 22, // The size of the badge it replaces
        }),
      },
      // Geometric colour blocks framing the page, high-contrast headings
      {
        id: "color-block",
        name: "Color Block",
        fullBleed: true,
        defaults: foundationDefaults({
          nameSize: 30,
          dividerStyle: "line",
          fontFamily: "ibm-plex-sans",
          accentOn: "rules",
          margins: [16, 18, 16, 18],
        }),
      },
      // Swiss grid with oversized drawn section numbers and lots of white space
      {
        id: "minimal-grid",
        name: "Minimal Grid",
        defaults: foundationDefaults({
          nameSize: 30,
          dividerStyle: "line",
          fontFamily: "inter",
          accentOn: "rules",
          margins: [18, 18, 18, 18],
        }),
      },
    ],
    themes: FOUNDATION_THEMES,
  },
];

// Every layout × theme combination becomes a template,
// e.g. { id: "classic-navy", name: "Classic Navy", tier: "basic", layout: "classic", theme: {...}, atsFriendly: true }
export const TEMPLATES = TIER_CONFIG.flatMap(({ tier, atsFriendly, layouts, themes }) =>
  layouts.flatMap((layout) => {
    checkLayoutDefaults(layout.id, layout.defaults, tier);
    return themes.map((theme) => ({
      id: `${layout.id}-${theme.id}`,
      name: `${layout.name} ${theme.name}`,
      tier,
      layout: layout.id,
      theme,
      layoutName: layout.name,
      atsFriendly: layout.atsFriendly ?? atsFriendly,
      fullBleed: layout.fullBleed ?? false,
      layoutDefaults: layout.defaults,
    }));
  })
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

// Old Advanced layouts and themes -> the closest new ones
const RETIRED_ADVANCED_LAYOUTS = { "modern-header": "bold-header", sidebar: "sidebar-pro", timeline: "timeline-plus" };
const RETIRED_ADVANCED_THEMES = { ocean: "navy", plum: "burgundy", teal: "teal", sunset: "burgundy", graphite: "graphite" };
const RETIRED_ADVANCED_IDS = Object.fromEntries(
  Object.entries(RETIRED_ADVANCED_LAYOUTS).flatMap(([oldLayout, newLayout]) =>
    Object.entries(RETIRED_ADVANCED_THEMES).map(([oldTheme, newTheme]) => [`${oldLayout}-${oldTheme}`, `${newLayout}-${newTheme}`])
  )
);

// Old Premium layouts and themes -> the closest new ones (Executive kept its layout)
const RETIRED_PREMIUM_LAYOUTS = { executive: "executive", creative: "color-block", "split-modern": "editorial" };
const RETIRED_PREMIUM_THEMES = { "royal-gold": "navy", emerald: "forest", midnight: "navy", rose: "burgundy", "indigo-gradient": "slate-blue" };
const RETIRED_PREMIUM_IDS = Object.fromEntries(
  Object.entries(RETIRED_PREMIUM_LAYOUTS).flatMap(([oldLayout, newLayout]) =>
    Object.entries(RETIRED_PREMIUM_THEMES).map(([oldTheme, newTheme]) => [`${oldLayout}-${oldTheme}`, `${newLayout}-${newTheme}`])
  )
);

const LEGACY_IDS = {
  classic: "classic-navy",
  ...RETIRED_BASIC_IDS,
  ...RETIRED_ADVANCED_IDS,
  ...RETIRED_PREMIUM_IDS,
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
