import TemplateRenderer from "../../templates/TemplateRenderer";
import ResumeSheet from "../ResumeSheet";

// A real, scaled-down first page of a resume (Phase UI-0: shown at /dev/ui, not used by
// pages yet). Resume previews are the visual focus of the redesign: cards show the actual
// page rather than a drawing of one.
//   resume - resume data (as TemplateRenderer takes it); templateId - its template
//   width  - thumbnail width in px (the page keeps its A4 shape)
const A4_WIDTH_PX = 794;

export default function ResumeThumbnail({ resume, templateId, width = 220, className = "" }) {
  const scale = width / A4_WIDTH_PX;
  return (
    <div className={`overflow-hidden rounded-sm bg-white shadow-raised ring-1 ring-black/5 ${className}`} style={{ width, height: width * (297 / 210) }} aria-hidden="true">
      <div className="pointer-events-none" style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ResumeSheet>
          <TemplateRenderer resume={resume} templateId={templateId} withLinks={false} />
        </ResumeSheet>
      </div>
    </div>
  );
}
