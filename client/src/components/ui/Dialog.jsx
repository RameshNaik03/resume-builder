import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

// "Quiet professional" dialog: a plain panel over a dimmed page (no blur).
//   Dialog      - title, optional description, content and a footer of actions (cancel first,
//                 the main action last)
//   DialogShell - just the backdrop and the panel, for dialogs with their own layout
// Both close on Escape and on a click on the backdrop, stop the page behind from scrolling,
// move focus into the panel ([data-autofocus], else the first footer button, else the panel)
// and give it back to where it was when they close.
//   size: "sm" (confirmations), "md" (forms), "lg" (pickers: scrolls inside), "full" (the whole
//         window, e.g. choosing a template after an import)
// Render it only while open: {open && <Dialog ...>}

const SIZES = {
  sm: "max-w-md rounded-2xl border",
  md: "max-w-xl rounded-2xl border",
  lg: "flex max-h-[90vh] max-w-5xl flex-col rounded-2xl border",
  full: "flex h-full flex-col",
  custom: "rounded-2xl border", // The caller's className sets the width (and padding)
};

export function DialogShell({ onClose, labelledBy, size = "sm", className = "", children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Once, on open (not on every render: a new onClose each render mustn't move the focus)
  useEffect(() => {
    const returnFocus = document.activeElement;
    const onKey = (event) => event.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    (panel?.querySelector("[data-autofocus], footer button:not(:disabled)") ?? panel)?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) returnFocus.focus();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-fg/30 sm:items-center dark:bg-black/60 ${size === "full" ? "" : "p-4"}`} onClick={() => onCloseRef.current()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`w-full border-line bg-surface shadow-overlay outline-none ${SIZES[size]} ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// headerAction - replaces the close button (e.g. a "Skip for now" button)
export default function Dialog({ title, description, onClose, footer, size = "sm", headerAction, children }) {
  const titleId = useId();
  return (
    <DialogShell onClose={onClose} labelledBy={titleId} size={size}>
      <DialogPanel titleId={titleId} title={title} description={description} onClose={onClose} footer={footer} headerAction={headerAction} scroll={size === "lg" || size === "full"}>
        {children}
      </DialogPanel>
    </DialogShell>
  );
}

// The panel's contents, also used by the style guide to show a dialog in place.
//   scroll - the content scrolls between a fixed header and footer (large dialogs)
export function DialogPanel({ titleId, title, description, onClose, footer, headerAction, scroll = false, children }) {
  return (
    <>
      <div className={`flex items-start justify-between gap-4 px-6 pt-5 ${scroll ? "border-b border-line pb-4" : ""}`}>
        <div className="min-w-0">
          <h2 id={titleId} className="type-h3 text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 type-body text-fg-muted">{description}</p>}
        </div>
        {headerAction ??
          (onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg">
              <X className="size-4" aria-hidden="true" />
            </button>
          ))}
      </div>
      {children && <div className={scroll ? "min-h-0 flex-1 overflow-y-auto px-6 py-5 type-body text-fg" : `px-6 pt-4 type-body text-fg ${footer ? "" : "pb-6"}`}>{children}</div>}
      {footer && <footer className={`flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end ${scroll ? "" : "mt-5"}`}>{footer}</footer>}
    </>
  );
}
