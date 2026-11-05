import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

// A dropdown menu: a trigger button and a list of actions (the user menu, "more" menus).
//   label   - the trigger's accessible name; trigger - what the button shows
//   header  - optional content at the top (e.g. the user's name and email), not focusable
//   items   - [{ label, to | onClick, icon, tone: "danger", className }], or a divider: "divider"
//             or { divider: true, className } (className e.g. hides it at some widths)
//   align   - "end" (default: the right edges line up) or "start"
// Keyboard: Enter / Space / ArrowDown open it on the first item, arrows move, Escape closes and
// returns focus to the trigger. A click outside or on an item closes it.
const isDivider = (item) => item === "divider" || item.divider === true;

export default function Menu({ label, trigger, header, items, align = "end", triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const actions = items.filter((item) => !isDivider(item));

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    itemRefs.current.find((element) => element && element.offsetParent !== null)?.focus(); // The first visible item
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const onKeyDown = (event) => {
    const focusable = itemRefs.current.filter((element) => element && element.offsetParent !== null); // Visible items only
    const index = focusable.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      focusable[(index + step + focusable.length) % focusable.length]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  // Each action's position among the actions (dividers don't count), for its ref
  const positions = items.map((item, index) => items.slice(0, index).filter((other) => !isDivider(other)).length);
  const itemClass = (item) =>
    `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left type-label outline-none focus-visible:bg-surface-2 hover:bg-surface-2 ${item.tone === "danger" ? "text-danger" : "text-fg"} ${item.className ?? ""}`;

  return (
    <div ref={rootRef} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => event.key === "ArrowDown" && (event.preventDefault(), setOpen(true))}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div id={id} role="menu" aria-label={label} className={`absolute top-full z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-overlay ${align === "end" ? "right-0" : "left-0"}`}>
          {header && <div className="border-b border-line px-2.5 pt-1.5 pb-2.5 mb-1.5">{header}</div>}
          {items.map((item, index) => {
            if (isDivider(item)) return <div key={`divider-${index}`} role="separator" className={`my-1.5 border-t border-line ${item.className ?? ""}`} />;
            const position = positions[index];
            const Icon = item.icon;
            const content = (
              <>
                {Icon && <Icon className={`size-4 shrink-0 ${item.tone === "danger" ? "" : "text-fg-muted"}`} aria-hidden="true" />}
                {item.label}
              </>
            );
            const common = { role: "menuitem", tabIndex: -1, ref: (element) => (itemRefs.current[position] = element), className: itemClass(item) };
            return item.to ? (
              <Link key={item.label} to={item.to} {...common} onClick={() => close(false)}>
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                {...common}
                onClick={() => {
                  close(false);
                  item.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
          {actions.length === 0 && <p className="px-2.5 py-2 type-small text-fg-muted">Nothing here</p>}
        </div>
      )}
    </div>
  );
}
