// Non-component helpers for placing sections (kept out of shared.jsx so React Fast Refresh works)

// Header alignment from the design (left / center / right)
export const HEADER_ALIGN = { textAlign: "var(--header-align)" };

// Splits data.sections (already ordered and filtered by prepareResume) into columns.
// Two columns only when both columns have something in them; otherwise everything is "main".
// lead: with two columns, a Summary at the very top spans both columns above them.
export function splitSections(data, { leadSummary = true } = {}) {
  const side = data.sections.filter((section) => section.column === "side");
  const main = data.sections.filter((section) => section.column === "main");
  if (data.columns !== 2 || side.length === 0 || main.length === 0) {
    return { twoColumns: false, lead: null, main: data.sections, side: [] };
  }
  const first = data.sections[0];
  const lead = leadSummary && first.id === "summary" && first.column === "main" ? first : null;
  return { twoColumns: true, lead, main: lead ? main.slice(1) : main, side };
}
