import { useEffect, useRef, useState } from "react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import ResumeSheet from "../ResumeSheet";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI

const TIER_BADGE_STYLES = {
  basic: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  advanced: "bg-sky-50 text-sky-700",
  premium: "bg-linear-to-r from-amber-100 to-yellow-50 text-amber-800 ring-1 ring-amber-200",
};

// One card in the template picker per layout: a small live preview using the user's own
// data, and a swatch for each of the layout's palettes. A swatch previews that palette on
// the card; clicking the card applies the layout in the palette shown (the template id,
// e.g. "classic-teal", saves both with the resume).
// To stay fast the preview only renders once it scrolls into view, and it's a scaled-down
// copy of the real A4 page (so it looks exactly like the final resume).
//   selectedId - the resume's current template id (null if none)
//   paletteId  - the resume's current palette, shown first when this layout has it
//   savingId   - a template being saved: shows a spinner on its card
export default function LayoutCard({ layout, resume, selectedId, paletteId, onSelect, disabled = false, savingId = null }) {
  const boxRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(0);

  const selected = layout.templates.find((template) => template.id === selectedId);
  const [shownId, setShownId] = useState(
    () => (selected ?? layout.templates.find((template) => template.theme.id === paletteId) ?? layout.templates[0]).id
  );
  const shown = layout.templates.find((template) => template.id === shownId);
  const saving = layout.templates.some((template) => template.id === savingId);

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
    <div
      className={`rounded-xl p-2 transition ${
        selected ? "bg-indigo-50 ring-2 ring-indigo-600 dark:bg-indigo-950/60" : "ring-1 ring-slate-200 hover:ring-indigo-300 dark:ring-slate-700"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(shown)}
        disabled={disabled}
        aria-label={`Use ${layout.name} in ${shown.theme.name}${selected?.id === shown.id ? " (selected)" : ""}`}
        className="group block w-full text-left disabled:cursor-wait"
      >
        <div ref={boxRef} className="relative aspect-[210/297] overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-200">
          {isVisible && scale > 0 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none"
              style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
              <ResumeSheet>
                <TemplateRenderer resume={resume} templateId={shown.id} withLinks={false} />
              </ResumeSheet>
            </div>
          ) : (
            <div className="absolute inset-0 animate-pulse bg-slate-100 dark:bg-slate-800" />
          )}

          {saving && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <div className="size-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900" />
            </div>
          )}

          {selected && (
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-indigo-600 text-white shadow">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          )}
        </div>
      </button>

      <div className="mt-2 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{layout.name}</p>
          <p className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{shown.theme.name}</p>
        </div>

        {/* Palettes */}
        {layout.templates.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${layout.name} colours`}>
            {layout.templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setShownId(template.id)}
                disabled={disabled}
                aria-label={`Preview ${template.theme.name}`}
                aria-pressed={template.id === shownId}
                title={template.theme.name}
                className={`size-5 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900 ${
                  template.id === shownId ? "ring-2 ring-slate-900 dark:ring-white" : "ring-1 ring-black/10 hover:scale-110"
                }`}
                style={{ backgroundColor: template.theme.accent }}
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {/* Tier badge (all templates are free; the badge only shows the tier) */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${TIER_BADGE_STYLES[layout.tier]}`}
          >
            {layout.tier === "premium" && (
              <svg className="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
              </svg>
            )}
            {layout.tier}
          </span>
          {layout.atsFriendly && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              ATS-friendly
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
