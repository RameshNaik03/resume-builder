import { useRef } from "react";

// One choice from a few options, drawn as a segmented control (the same look as segmented
// Tabs): columns, alignment, date format, paper size, tone... A radio group for screen readers;
// arrow keys move the choice.
//   options - [{ value, label, hint?, ariaLabel? }] (hint: a short note after the label, e.g.
//             "210 × 297 mm"; ariaLabel: the name when the label is a symbol, e.g. "•" -> "Disc")
//   value / onChange(value); label - the group's accessible name (or labelledBy: an element id)
//   size    - "sm" (dense panels) or "md"; fullWidth - the segments share the row equally
export default function SegmentedControl({ options, value, onChange, label, labelledBy, size = "md", fullWidth = false }) {
  const refs = useRef([]);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const move = (event, from) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (from + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  const pad = size === "sm" ? "px-2.5 py-1 type-small" : "px-3 py-1.5 type-label";

  return (
    <div role="radiogroup" aria-label={label} aria-labelledby={labelledBy} className={`${fullWidth ? "flex" : "inline-flex"} max-w-full flex-wrap gap-0.5 rounded-lg bg-surface-2 p-1`}>
      {options.map((option, position) => {
        const selected = position === index && option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(element) => (refs.current[position] = element)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            tabIndex={position === index ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, position)}
            className={`rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-accent ${pad} ${fullWidth ? "flex-1" : ""} ${
              selected ? "bg-surface text-fg shadow-soft" : "text-fg-muted hover:text-fg"
            }`}
          >
            {option.label}
            {option.hint && <span className="ml-1.5 font-normal text-fg-subtle">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
