import { useEffect, useState } from "react";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";

// "Quiet professional" meters.
// tone: "accent" (a job match), "neutral", or "auto" to colour by the ATS scale (70+ success,
// 50-69 warning, else danger). Colour is never the only signal: the number and label are always shown.
const toneFor = (value, tone) => (tone !== "auto" ? tone : value >= 70 ? "success" : value >= 50 ? "warning" : "danger");
const STROKE = { accent: "stroke-accent", success: "stroke-success", warning: "stroke-warning", danger: "stroke-danger", neutral: "stroke-fg-subtle" };
const FILL = { accent: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-fg-subtle" };
const LABEL = { accent: "text-fg", neutral: "text-fg", success: "text-success", warning: "text-warning", danger: "text-danger" };

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

const COUNT_MS = 1200;
// The number counting up to `value` (eases out); the value itself when off or with reduced motion
function useCountUp(value, on) {
  const reducedMotion = usePrefersReducedMotion();
  const [current, setCurrent] = useState(0);
  const animate = on && !reducedMotion;
  useEffect(() => {
    if (!animate) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      setCurrent(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);
  return animate ? current : value;
}

// size: "md" (the style guide, cards), "lg" (a page's main score), "compact" (two side by side on phones)
const RING_SIZES = { md: "size-32", lg: "size-44", compact: "size-28 sm:size-40" };
const NUMBER_SIZES = { md: "text-4xl", lg: "text-5xl", compact: "text-4xl sm:text-5xl" };

// A thin ring with the number in the serif, and a label under it (e.g. "Good fit").
//   name    - what the number is, for screen readers ("ATS score", "Match")
//   animate - the ring fills and the number counts up (not with reduced motion)
export function ScoreRing({ value, label, name = "Score", caption = "out of 100", tone = "auto", size = "md", animate = false }) {
  const shown = toneFor(value, tone);
  const current = useCountUp(value, animate);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${RING_SIZES[size]}`} role="img" aria-label={`${name} ${value} ${caption}${label ? `: ${label}` : ""}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" className="stroke-surface-2" />
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - current / 100)} className={STROKE[shown]} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className={`font-title leading-none text-fg tabular-nums ${NUMBER_SIZES[size]}`}>{current}</span>
          <span className="mt-1 text-xs text-fg-muted">{caption}</span>
        </div>
      </div>
      {label && (
        <p className={`mt-3 type-label ${LABEL[shown]}`} aria-hidden="true">
          {label}
        </p>
      )}
    </div>
  );
}
