import { useId, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

// "Quiet professional" form controls.
// Field wraps any control with its label, help text and error, and links them for screen
// readers; the controls share one look: 36px tall, a thin border, the accent focus ring.

const CONTROL =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.9375rem] text-fg placeholder:text-fg-subtle transition-colors outline-none hover:border-fg-subtle focus:border-accent focus:ring-3 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle aria-invalid:border-danger aria-invalid:focus:ring-danger/15";

// label, help, error, optional ("(optional)" after the label), aside (e.g. a "Forgot password?"
// link at the end of the label row); children({ id, aria-describedby, aria-invalid }) renders
// the control, e.g. {(props) => <Input {...props} {...register("email")} />}
export function Field({ label, help, error, optional = false, aside, children }) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label text-fg">
          {label}
          {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
        </label>
        {aside}
      </div>
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

// controlSize: "md" (36px) or "lg" (40px: short forms such as sign-in)
const HEIGHTS = { md: "h-9", lg: "h-10" };
export function Input({ controlSize = "md", className = "", ...props }) {
  return <input className={`${CONTROL} ${HEIGHTS[controlSize]} ${className}`} {...props} />;
}

// A password input with a button to show or hide what was typed (the same props as Input)
export function PasswordInput({ controlSize = "md", className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} controlSize={controlSize} type={visible ? "text" : "password"} className={`pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
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
