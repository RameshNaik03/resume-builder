// A saved resume has no file to inspect, so its layout facts come from its template and
// design instead. Our templates export real text with standard structure (no tables, text
// boxes, images of text or header/footer content); the one real risk is a two-column layout.
// Returns the same shape as inspectFile().

// Layouts with two columns by default (see client/src/templates/registry.js), matched by id
// prefix: "sidebar" covers Sidebar Pro ("sidebar-pro-navy") and old ids like "sidebar-ocean";
// "split-modern" is the old id of what is now Editorial
const TWO_COLUMN_LAYOUTS = ["sidebar", "editorial", "split-modern"];
const WORDS_PER_PAGE = 550; // Roughly one full page in our templates

export default function savedResumeLayout(resume, text) {
  const layout = TWO_COLUMN_LAYOUTS.find((id) => resume.template === id || resume.template?.startsWith(`${id}-`));
  const columns = resume.design?.columns ?? (layout ? 2 : 1); // The Design tab can change it
  const words = text.split(/\s+/).filter(Boolean).length;

  return {
    pages: Math.max(1, Math.ceil(words / WORDS_PER_PAGE)),
    pagesEstimated: true,
    charsPerPage: [],
    columns: { detected: columns === 2, pages: [], fromTemplate: true },
    tables: 0,
    textBoxes: 0,
    imagePages: [],
    headerFooter: { detected: false, texts: [], hasContact: false },
    fonts: { all: [], unusual: [], icon: [] },
    iconSymbols: 0,
  };
}
