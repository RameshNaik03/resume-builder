import { ADVANCED_THEMES, THEMES } from "./themes";

// The three tiers shown as tabs in the template picker
export const TIERS = [
  { id: "basic", name: "Basic", description: "Clean single-column layouts that every ATS can read." },
  {
    id: "advanced",
    name: "Advanced",
    description:
      "Bolder designs with colour and two-column layouts. Templates without the ATS-friendly badge look great but can be harder for applicant tracking systems to read.",
  },
  { id: "premium", name: "Premium", description: "Our most polished, design-forward templates." },
];

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
      { id: "classic", name: "Classic" },
      { id: "minimal", name: "Minimal" },
      { id: "compact", name: "Compact" },
    ],
    themes: THEMES,
  },
  {
    tier: "advanced",
    atsFriendly: true,
    layouts: [
      { id: "modern-header", name: "Modern Header", fullBleed: true },
      { id: "sidebar", name: "Sidebar", fullBleed: true, atsFriendly: false }, // Two columns
      { id: "timeline", name: "Timeline", atsFriendly: false }, // Graphic timeline
    ],
    themes: ADVANCED_THEMES,
  },
];

// Every layout × theme combination becomes a template,
// e.g. { id: "classic-navy", name: "Classic Navy", tier: "basic", layout: "classic", theme: {...}, atsFriendly: true }
export const TEMPLATES = TIER_CONFIG.flatMap(({ tier, atsFriendly, layouts, themes }) =>
  layouts.flatMap((layout) =>
    themes.map((theme) => ({
      id: `${layout.id}-${theme.id}`,
      name: `${layout.name} ${theme.name}`,
      tier,
      layout: layout.id,
      theme,
      atsFriendly: layout.atsFriendly ?? atsFriendly,
      fullBleed: layout.fullBleed ?? false,
    }))
  )
);

export const DEFAULT_TEMPLATE_ID = "classic-navy";

// Template ids saved by older versions of the app
const LEGACY_IDS = {
  classic: "classic-navy",
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
