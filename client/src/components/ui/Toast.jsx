import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

// "Quiet professional" toast card.
// react-hot-toast positions and times it: toast.custom((t) => <Toast t={t} tone="success" message="..." />)
// (or `t` left out for a static preview). One line, an icon in the tone's colour, a close button.
const TONES = {
  success: { icon: CheckCircle2, color: "text-success" },
  error: { icon: XCircle, color: "text-danger" },
  warning: { icon: AlertTriangle, color: "text-warning" },
  info: { icon: Info, color: "text-fg-muted" },
};

export default function Toast({ t, tone = "info", message, onDismiss }) {
  const { icon: Icon, color } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 type-body text-fg shadow-raised transition-opacity ${t && !t.visible ? "opacity-0" : "opacity-100"}`}
    >
      <Icon className={`size-4 shrink-0 ${color}`} aria-hidden="true" />
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-6 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
