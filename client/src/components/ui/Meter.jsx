// "Quiet professional" meters.
// tone: "accent" (a job match), or "auto" to colour by the ATS scale (70+ success, 50-69
// warning, else danger). Colour is never the only signal: the number and label are always shown.
const toneFor = (value, tone) => (tone !== "auto" ? tone : value >= 70 ? "success" : value >= 50 ? "warning" : "danger");
const STROKE = { accent: "stroke-accent", success: "stroke-success", warning: "stroke-warning", danger: "stroke-danger", neutral: "stroke-fg-muted" };
const FILL = { accent: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-fg-muted" };

// A thin bar: label on the left, the value on the right
export function ProgressBar({ label, value, max = 100, tone = "accent", display }) {
  const shown = toneFor(Math.round((value / max) * 100), tone);
  return (
    <div>
      <div className="flex items-baseline justify-between type-small">
        <span className="text-fg-muted">{label}</span>
        <span className="font-medium text-fg tabular-nums">{display ?? `${value} / ${max}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full rounded-full ${FILL[shown]}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

// A thin ring with the number in the serif, and a label under it (e.g. "Good fit")
export function ScoreRing({ value, label, caption = "out of 100", tone = "auto", size = 132 }) {
  const shown = toneFor(value, tone);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <figure className="flex flex-col items-center" aria-label={`${value} ${caption}${label ? `, ${label}` : ""}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="5" className="stroke-surface-2" />
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} className={STROKE[shown]} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="font-title text-4xl leading-none text-fg tabular-nums">{value}</span>
          <span className="mt-1 text-[11px] text-fg-muted">{caption}</span>
        </div>
      </div>
      {label && (
        <figcaption className="mt-2 type-label text-fg" aria-hidden="true">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
