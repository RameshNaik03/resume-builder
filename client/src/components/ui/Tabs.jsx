import { useRef } from "react";

// "Quiet professional" tabs (Phase UI-0: shown at /dev/ui, not used by pages yet).
//   variant "underline" - page-level views (Report / What the ATS sees)
//   variant "segmented" - a compact switch inside a card (Content / Design, Upload / My resumes)
// tabs: [{ id, label, count? }]; value / onChange: the selected id. Arrow keys move between tabs.
export default function Tabs({ tabs, value, onChange, variant = "underline", label }) {
  const refs = useRef([]);
  const move = (event, index) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };
  const segmented = variant === "segmented";

  return (
    <div role="tablist" aria-label={label} className={segmented ? "inline-flex rounded-lg bg-surface-2 p-1" : "flex gap-6 border-b border-line"}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => (refs.current[index] = element)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className={
              segmented
                ? `rounded-md px-3 py-1.5 type-label transition-colors focus-visible:outline-2 focus-visible:outline-accent ${selected ? "bg-surface text-fg shadow-soft" : "text-fg-muted hover:text-fg"}`
                : `-mb-px border-b-2 pb-2.5 type-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${selected ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg"}`
            }
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 text-fg-subtle tabular-nums">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
