import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import ResumeSheet from "../../templates/ResumeSheet";
import { Badge } from "../ui/Display";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI

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
  const [shownId, setShownId] = useState(() => (selected ?? layout.templates.find((template) => template.theme.id === paletteId) ?? layout.templates[0]).id);
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
    <div className={`rounded-xl bg-surface p-2 transition-shadow ${selected ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-line-strong"}`}>
      <button
        type="button"
        onClick={() => onSelect(shown)}
        disabled={disabled}
        aria-label={`Use ${layout.name} in ${shown.theme.name}${selected?.id === shown.id ? " (selected)" : ""}`}
        className="group block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait"
      >
        <div ref={boxRef} className="relative aspect-page overflow-hidden rounded-md bg-surface shadow-soft ring-1 ring-line">
          {isVisible && scale > 0 ? (
            <div aria-hidden="true" className="pointer-events-none" style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <ResumeSheet>
                <TemplateRenderer resume={resume} templateId={shown.id} withLinks={false} />
              </ResumeSheet>
            </div>
          ) : (
            <div className="absolute inset-0 bg-surface-2 motion-safe:animate-pulse" />
          )}

          {saving && (
            <div className="absolute inset-0 grid place-items-center bg-surface/70">
              <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
            </div>
          )}

          {selected && (
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent text-on-accent shadow-soft">
              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
          )}
        </div>
      </button>

      <div className="mt-2 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate type-label text-fg">{layout.name}</p>
          <p className="shrink-0 type-small text-fg-muted">{shown.theme.name}</p>
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
                className={`size-5 rounded-full ring-offset-2 ring-offset-surface transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  template.id === shownId ? "ring-2 ring-fg" : "ring-1 ring-fg/10 motion-safe:hover:scale-110"
                }`}
                style={{ backgroundColor: template.theme.accent }}
              />
            ))}
          </div>
        )}

        {/* Tier (every template is free; this only shows the tier) and ATS-friendliness */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>
            <span className="capitalize">{layout.tier}</span>
          </Badge>
          {layout.atsFriendly && <Badge tone="success">ATS-friendly</Badge>}
        </div>
      </div>
    </div>
  );
}
