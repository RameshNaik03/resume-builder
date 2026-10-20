import { useId, useState } from "react";

// A card with a clickable header that shows or hides its content
export default function CollapsibleSection({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <svg
          className={`size-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={contentId} className="border-t border-slate-100 dark:border-slate-800 px-5 py-5">
          {children}
        </div>
      )}
    </section>
  );
}
