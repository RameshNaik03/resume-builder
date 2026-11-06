import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

// A card with a clickable header that shows or hides its content
export default function CollapsibleSection({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-xl border border-line bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${open ? "rounded-t-xl" : "rounded-xl"}`}
      >
        <div className="min-w-0">
          <h2 className="type-h3 text-fg">{title}</h2>
          {description && <p className="mt-0.5 type-small text-fg-muted">{description}</p>}
        </div>
        <ChevronDown className={`size-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={contentId} className="border-t border-line px-5 py-5">
          {children}
        </div>
      )}
    </section>
  );
}
