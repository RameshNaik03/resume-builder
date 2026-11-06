import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

// "Quiet professional" display components:
// Card, Badge, Alert, Tooltip, EmptyState, PageHeader and StatCard.

// A surface with a thin border. interactive: lifts slightly on hover (a whole-card link).
// padding: "none" for media (a resume thumbnail), else 16px or 20px / 24px.
// tone "quiet": a flat surface-2 card for asides and help (instead of overriding classes,
// which would conflict with the card's own background and shadow)
export function Card({ as: Element = "div", interactive = false, padding = "md", tone = "default", className = "", children, ...props }) {
  const pad = { none: "", sm: "p-4", md: "p-5 sm:p-6" }[padding];
  const surface = tone === "quiet" ? "bg-surface-2" : "bg-surface shadow-soft";
  return (
    <Element
      className={`rounded-xl border border-line ${surface} ${interactive ? "transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-raised" : ""} ${pad} ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
}

// A card's title row: title (Inter, not the serif), an optional description and actions
export function CardHeader({ title, description, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="type-h3 text-fg">{title}</h3>
        {description && <p className="mt-0.5 type-small text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

// tone: "neutral" | "accent" | "success" | "warning" | "danger"
const BADGE_TONES = {
  neutral: "border-line bg-surface-2 text-fg-muted",
  accent: "border-transparent bg-accent-soft text-accent",
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-warning",
  danger: "border-transparent bg-danger-soft text-danger",
};
export function Badge({ tone = "neutral", children }) {
  return <span className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap ${BADGE_TONES[tone]}`}>{children}</span>;
}

// A message in the page's flow. tone: "info" | "success" | "warning" | "danger"
const ALERT_TONES = {
  info: { box: "border-line bg-surface-2 text-fg", icon: Info, iconColor: "text-fg-muted" },
  success: { box: "border-success/25 bg-success-soft text-fg", icon: CheckCircle2, iconColor: "text-success" },
  warning: { box: "border-warning/25 bg-warning-soft text-fg", icon: AlertTriangle, iconColor: "text-warning" },
  danger: { box: "border-danger/25 bg-danger-soft text-fg", icon: XCircle, iconColor: "text-danger" },
};
//   onDismiss - shows a close button; role - "alert" (danger, warning) or "status" by default
//   (pass role="status" for a warning that's a standing reminder, not news)
export function Alert({ tone = "info", title, children, action, onDismiss, role, ...props }) {
  const { box, icon: Icon, iconColor } = ALERT_TONES[tone];
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 ${box}`} role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")} {...props}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 type-body">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-fg-muted" : ""}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-mt-1 -mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// A short explanation on hover and keyboard focus (the trigger must be focusable)
export function Tooltip({ content, children }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-60 -translate-x-1/2 rounded-md bg-fg px-2.5 py-1.5 text-xs leading-snug text-canvas shadow-raised group-focus-within:block group-hover:block"
      >
        {content}
      </span>
    </span>
  );
}

// Nothing here yet: a quiet icon, one sentence of what goes here, and the action that adds it
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      {Icon && (
        <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-fg-muted">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <h3 className="mt-4 type-h3 text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm type-body text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// The top of every page: an optional back link and eyebrow, the serif title, one line of
// description, and the page's actions (at most one primary)
export function PageHeader({ back, eyebrow, title, description, actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        {eyebrow && <p className="mb-2 type-eyebrow text-fg-muted">{eyebrow}</p>}
        <h1 className="type-h1 text-fg">{title}</h1>
        {description && <p className="mt-2 max-w-2xl type-body text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

// One number with its label and an optional note (a change, a comparison)
export function StatCard({ label, value, unit, note, tone = "neutral" }) {
  const noteColor = { neutral: "text-fg-muted", success: "text-success", warning: "text-warning", danger: "text-danger" }[tone];
  return (
    <Card padding="sm">
      <p className="type-small text-fg-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="font-title text-3xl leading-none text-fg tabular-nums">{value}</span>
        {unit && <span className="type-small text-fg-muted">{unit}</span>}
      </p>
      {note && <p className={`mt-2 type-small ${noteColor}`}>{note}</p>}
    </Card>
  );
}
