import { useId } from "react";
import { ChevronDown } from "lucide-react";

// "Quiet professional" form controls.
// Field wraps any control with its label, help text and error, and links them for screen
// readers; the controls share one look: 36px tall, a thin border, the accent focus ring.

const CONTROL =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.9375rem] text-fg placeholder:text-fg-subtle transition-colors outline-none hover:border-fg-subtle focus:border-accent focus:ring-3 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle aria-invalid:border-danger aria-invalid:focus:ring-danger/15";

// label, help, error, optional ("(optional)" after the label); children(id, describedBy)
export function Field({ label, help, error, optional = false, children }) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block type-label text-fg">
        {label}
        {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
      </label>
      {children({ id, "aria-describedby": [helpId, errorId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined })}
      {help && !error && (
        <p id={helpId} className="mt-1.5 type-small text-fg-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 type-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={`${CONTROL} h-9 ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${CONTROL} py-2 leading-relaxed ${className}`} {...props} />;
}

// A native select (keyboard and screen reader behaviour for free) with the shared look
export function Select({ className = "", children, ...props }) {
  return (
    <div className="relative">
      <select className={`${CONTROL} h-9 appearance-none pr-9 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
    </div>
  );
}

// Checkbox and radio: native inputs drawn in the accent, with their label beside them
export function Checkbox({ label, description, className = "", ...props }) {
  return <Choice type="checkbox" label={label} description={description} className={className} {...props} />;
}
export function Radio({ label, description, className = "", ...props }) {
  return <Choice type="radio" label={label} description={description} className={className} {...props} />;
}
function Choice({ type, label, description, className, ...props }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${className}`}>
      <input type={type} className="mt-0.5 size-4 shrink-0 accent-(--color-accent)" {...props} />
      <span>
        <span className="block type-label text-fg">{label}</span>
        {description && <span className="block type-small text-fg-muted">{description}</span>}
      </span>
    </label>
  );
}

// An on/off switch with its visible label (the label is also its accessible name)
export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${checked ? "bg-accent" : "bg-line-strong"}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-soft transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      <span className="type-label text-fg">{label}</span>
    </label>
  );
}
