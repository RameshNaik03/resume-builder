// An on/off switch (the visible label is up to the caller; label is its accessible name)
export default function Switch({ checked, onChange, label, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        checked ? "bg-accent" : "bg-line-strong"
      } ${className}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-soft transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
