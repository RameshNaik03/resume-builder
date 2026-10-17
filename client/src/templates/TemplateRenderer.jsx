import { useMemo } from "react";
import { getTemplate } from "./registry";
import prepareResume from "./prepareResume";
import ClassicLayout from "./layouts/ClassicLayout";
import MinimalLayout from "./layouts/MinimalLayout";
import CompactLayout from "./layouts/CompactLayout";
import ModernHeaderLayout from "./layouts/ModernHeaderLayout";
import SidebarLayout from "./layouts/SidebarLayout";
import TimelineLayout from "./layouts/TimelineLayout";

// Maps a template's "layout" id to the component that draws it
const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  minimal: MinimalLayout,
  compact: CompactLayout,
  "modern-header": ModernHeaderLayout,
  sidebar: SidebarLayout,
  timeline: TimelineLayout,
};

// Renders a resume with any template.
//   templateId - optional; defaults to the resume's own template
//   withLinks  - false for thumbnails (no clickable links)
export default function TemplateRenderer({ resume, templateId, withLinks = true }) {
  const template = getTemplate(templateId ?? resume.template);
  const Layout = LAYOUT_COMPONENTS[template.layout];
  const { theme } = template;

  // Only re-clean the data when the resume actually changes
  const data = useMemo(() => prepareResume(resume, withLinks), [resume, withLinks]);

  return (
    <div
      // Theme colours as CSS variables, used by the layouts as text-(--accent) etc.
      style={{
        "--accent": theme.accent,
        "--soft": theme.soft ?? "#f1f5f9",
        "--on-accent": theme.onAccent ?? "#ffffff",
        "--text": theme.text,
        "--muted": theme.muted,
        "--line": theme.line,
        color: theme.text,
        fontFamily: theme.fontFamily,
      }}
    >
      {template.fullBleed ? (
        <Layout data={data} theme={theme} />
      ) : (
        // Standard page margins. box-decoration-clone repeats them on every printed page.
        <div className="box-decoration-clone px-[16mm] py-[14mm]">
          <Layout data={data} theme={theme} />
        </div>
      )}
    </div>
  );
}
