import { useEffect, useRef, useState } from "react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import ResumeSheet from "../ResumeSheet";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI

const TIER_BADGE_STYLES = {
  basic: "bg-slate-100 text-slate-600",
  advanced: "bg-sky-50 text-sky-700",
  premium: "bg-amber-50 text-amber-700",
};

// One card in the template picker: a small live preview using the user's own data.
// To stay fast it only renders once it scrolls into view, and it's a scaled-down
// copy of the real A4 page (so it looks exactly like the final resume).
export default function TemplateThumbnail({ template, resume, selected, onSelect }) {
  const boxRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(0);

  // Lazy-load: start rendering when the card is near the visible area, then keep it
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start a little before it scrolls into view
    );
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  // Shrink the A4 page to the card's width
  useEffect(() => {
    const box = boxRef.current;
    const observer = new ResizeObserver(() => setScale(box.clientWidth / A4_WIDTH_PX));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      aria-pressed={selected}
      aria-label={`${template.name} template${selected ? " (selected)" : ""}`}
      className={`group rounded-xl p-2 text-left transition ${
        selected ? "bg-indigo-50 ring-2 ring-indigo-600" : "ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-indigo-300"
      }`}
    >
      <div
        ref={boxRef}
        className="relative aspect-[210/297] overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-200"
      >
        {isVisible && scale > 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none"
            style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <ResumeSheet>
              <TemplateRenderer resume={resume} templateId={template.id} withLinks={false} />
            </ResumeSheet>
          </div>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-slate-100" />
        )}

        {selected && (
          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-indigo-600 text-white shadow">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        )}
      </div>

      <div className="mt-2 px-1">
        <p className="truncate text-sm font-medium text-slate-900">{template.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${TIER_BADGE_STYLES[template.tier]}`}>
            {template.tier}
          </span>
          {template.atsFriendly && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              ATS-friendly
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
