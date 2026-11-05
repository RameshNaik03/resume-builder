import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

// "Quiet professional" dialog (Phase UI-0: shown at /dev/ui, not used by pages yet).
// A plain panel over a dimmed page (no blur): title, optional description, content and a
// footer of actions (cancel first, the main action last). Closes on Escape, the backdrop or
// the close button, focuses the first action, and stops the page behind from scrolling.
//   size: "sm" (confirmations), "md" (forms), "lg" (pickers)
// Render it only while open: {open && <Dialog ...>}
export default function Dialog({ title, description, onClose, footer, size = "sm", children }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("[data-autofocus], footer button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 p-4 sm:items-center dark:bg-black/60" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`w-full ${width} rounded-2xl border border-line bg-surface shadow-overlay`} onClick={(event) => event.stopPropagation()}>
        <DialogPanel titleId={titleId} title={title} description={description} onClose={onClose} footer={footer}>
          {children}
        </DialogPanel>
      </div>
    </div>
  );
}

// The panel's contents, also used by the style guide to show a dialog in place
export function DialogPanel({ titleId, title, description, onClose, footer, children }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <h2 id={titleId} className="type-h3 text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 type-body text-fg-muted">{description}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {children && <div className="px-6 pt-4 type-body text-fg">{children}</div>}
      {footer && <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
    </>
  );
}
