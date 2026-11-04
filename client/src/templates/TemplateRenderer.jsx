import { useEffect, useMemo } from "react";
import { getTemplate } from "./registry";
import prepareResume from "./prepareResume";
import prepareLetter from "./prepareLetter";
import { designCssVars, resolveDesign, usedFontIds } from "./design";
import { loadFonts } from "./fonts";
import ClassicLayout from "./layouts/ClassicLayout";
import ModernLineLayout from "./layouts/ModernLineLayout";
import SoftHeaderLayout from "./layouts/SoftHeaderLayout";
import CompactProLayout from "./layouts/CompactProLayout";
import ElegantSerifLayout from "./layouts/ElegantSerifLayout";
import SidebarProLayout from "./layouts/SidebarProLayout";
import BoldHeaderLayout from "./layouts/BoldHeaderLayout";
import SplitAccentLayout from "./layouts/SplitAccentLayout";
import CardSectionsLayout from "./layouts/CardSectionsLayout";
import TimelinePlusLayout from "./layouts/TimelinePlusLayout";
import ExecutiveLayout from "./layouts/ExecutiveLayout";
import EditorialLayout from "./layouts/EditorialLayout";
import InfographicLayout from "./layouts/InfographicLayout";
import MonogramLayout from "./layouts/MonogramLayout";
import ColorBlockLayout from "./layouts/ColorBlockLayout";
import MinimalGridLayout from "./layouts/MinimalGridLayout";

// Maps a template's "layout" id to the component that draws it
const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  "modern-line": ModernLineLayout,
  "soft-header": SoftHeaderLayout,
  "compact-pro": CompactProLayout,
  "elegant-serif": ElegantSerifLayout,
  "sidebar-pro": SidebarProLayout,
  "bold-header": BoldHeaderLayout,
  "split-accent": SplitAccentLayout,
  "card-sections": CardSectionsLayout,
  "timeline-plus": TimelinePlusLayout,
  executive: ExecutiveLayout,
  editorial: EditorialLayout,
  infographic: InfographicLayout,
  monogram: MonogramLayout,
  "color-block": ColorBlockLayout,
  "minimal-grid": MinimalGridLayout,
};

// Renders a resume with any template.
//   templateId - optional; defaults to the resume's own template
//   withLinks  - false for thumbnails (no clickable links)
//   design     - the resume's design overrides (fonts, sizes, colours...). Leave it out to
//                show the template as designed (thumbnails, landing page).
//   highlightPlaceholders - mark "[X%]"-style placeholders in yellow (on-screen previews only,
//                never the printed sheet)
//   letter     - a cover letter to draw instead of the resume's sections: the layout's own header
//                (name, contact, photo, colours) with the letter below it (see prepareLetter.js)
export default function TemplateRenderer({ resume, templateId, withLinks = true, design, highlightPlaceholders = false, letter }) {
  const template = getTemplate(templateId ?? resume.template);
  const Layout = LAYOUT_COMPONENTS[template.layout];
  const { theme } = template;

  // Template defaults + design overrides (see design.js): the visual settings become
  // CSS variables the layouts read; the layout settings (section order, columns,
  // date format...) are applied to the data by prepareResume
  const resolvedDesign = useMemo(() => resolveDesign(template, design), [template, design]);
  const style = useMemo(() => designCssVars(template, resolvedDesign), [template, resolvedDesign]);

  // Load the web fonts this template and design use (thumbnails and galleries too, not just
  // the editor's preview). loadFonts skips fonts that are already loaded.
  const fontIds = usedFontIds(resolvedDesign.resolved).join(",");
  useEffect(() => {
    if (fontIds) loadFonts(fontIds.split(","));
  }, [fontIds]);

  // Only re-clean the data when the resume or its design actually changes
  const data = useMemo(() => {
    const prepared = prepareResume(resume, withLinks, resolvedDesign.resolved, resolvedDesign.overrides, { highlightPlaceholders });
    if (!letter) return prepared;
    // A letter: one "letter" section in the main column (FoundationSection draws it)
    return { ...prepared, columns: 1, sections: [{ id: "letter", key: "letter", title: "", column: "main" }], letter: prepareLetter(letter, { highlightPlaceholders }) };
  }, [resume, withLinks, resolvedDesign, highlightPlaceholders, letter]);

  return (
    <div style={style}>
      {template.fullBleed ? (
        <Layout data={data} theme={theme} />
      ) : (
        // Standard page margins (pages 2, 3... get their top margin from templates/pagination.js)
        <div className="pt-(--m-top) pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
          <Layout data={data} theme={theme} />
        </div>
      )}
    </div>
  );
}
