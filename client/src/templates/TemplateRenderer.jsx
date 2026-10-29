import { useMemo } from "react";
import { getTemplate } from "./registry";
import prepareResume from "./prepareResume";
import { designCssVars, resolveDesign } from "./design";
import ClassicLayout from "./layouts/ClassicLayout";
import MinimalLayout from "./layouts/MinimalLayout";
import CompactLayout from "./layouts/CompactLayout";
import ModernHeaderLayout from "./layouts/ModernHeaderLayout";
import SidebarLayout from "./layouts/SidebarLayout";
import TimelineLayout from "./layouts/TimelineLayout";
import ExecutiveLayout from "./layouts/ExecutiveLayout";
import CreativeLayout from "./layouts/CreativeLayout";
import SplitModernLayout from "./layouts/SplitModernLayout";

// Maps a template's "layout" id to the component that draws it
const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  minimal: MinimalLayout,
  compact: CompactLayout,
  "modern-header": ModernHeaderLayout,
  sidebar: SidebarLayout,
  timeline: TimelineLayout,
  executive: ExecutiveLayout,
  creative: CreativeLayout,
  "split-modern": SplitModernLayout,
};

// Renders a resume with any template.
//   templateId - optional; defaults to the resume's own template
//   withLinks  - false for thumbnails (no clickable links)
//   design     - the resume's design overrides (fonts, sizes, colours...). Leave it out to
//                show the template as designed (thumbnails, landing page).
//   highlightPlaceholders - mark "[X%]"-style placeholders in yellow (on-screen previews only,
//                never the printed sheet)
export default function TemplateRenderer({ resume, templateId, withLinks = true, design, highlightPlaceholders = false }) {
  const template = getTemplate(templateId ?? resume.template);
  const Layout = LAYOUT_COMPONENTS[template.layout];
  const { theme } = template;

  // Template defaults + design overrides (see design.js): the visual settings become
  // CSS variables the layouts read; the layout settings (section order, columns,
  // date format...) are applied to the data by prepareResume
  const resolvedDesign = useMemo(() => resolveDesign(template, design), [template, design]);
  const style = useMemo(() => designCssVars(template, resolvedDesign), [template, resolvedDesign]);

  // Only re-clean the data when the resume or its design actually changes
  const data = useMemo(
    () => prepareResume(resume, withLinks, resolvedDesign.resolved, resolvedDesign.overrides, { highlightPlaceholders }),
    [resume, withLinks, resolvedDesign, highlightPlaceholders]
  );

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
