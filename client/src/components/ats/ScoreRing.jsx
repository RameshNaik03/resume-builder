import { useEffect, useState } from "react";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { scoreTone } from "./atsHelpers";

const ANIMATION_MS = 1200;

// Large ring that fills up to the score while the number counts up.
// compact: smaller on phones (for two rings side by side)
// label / unit: what the number is, for screen readers and under the number (an ATS score by default)
export default function ScoreRing({ score, grade, compact = false, label = "ATS score", unit = "out of 100" }) {
  const reducedMotion = usePrefersReducedMotion();
  const [animated, setAnimated] = useState(0);
  const shown = reducedMotion ? score : animated;

  useEffect(() => {
    if (reducedMotion) return;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / ANIMATION_MS);
      setAnimated(Math.round(score * (1 - (1 - progress) ** 3))); // Ease out: fast, then settles
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, reducedMotion]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${compact ? "size-28 sm:size-48" : "size-48"}`} role="img" aria-label={`${label} ${score} ${unit}: ${grade}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
            className={tone.stroke}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className={`font-display ${compact ? "text-4xl sm:text-6xl" : "text-6xl"} font-extrabold tabular-nums text-slate-900 dark:text-white`}>{shown}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
        </div>
      </div>
      <p className={`mt-3 text-lg font-semibold ${tone.text}`}>{grade}</p>
    </div>
  );
}
