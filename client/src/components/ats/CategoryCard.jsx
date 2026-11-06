import { CheckCircle2, ChevronDown, CircleMinus, XCircle } from "lucide-react";
import { Badge } from "../ui/Display";
import { scoreTone, TONE_FILL, TONE_TEXT } from "./atsHelpers";

// A check's result: passed, partly passed (some points) or failed; the icon differs as well as
// the colour, so the colour is never the only signal
function CheckItem({ check }) {
  const partial = !check.passed && check.points > 0;
  const [Icon, color] = check.passed ? [CheckCircle2, "text-success"] : partial ? [CircleMinus, "text-warning"] : [XCircle, "text-danger"];

  return (
    <li className="flex gap-3 py-4">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="flex flex-wrap items-center gap-2 type-label text-fg">
            <span className="sr-only">{check.passed ? "Passed: " : "Not passed: "}</span>
            {check.label}
            {check.judgedBy === "ai" && <Badge tone="accent">AI-judged</Badge>}
          </p>
          <span className="shrink-0 type-small font-medium text-fg-muted tabular-nums">
            {check.points}/{check.maxPoints}
            <span className="sr-only"> points</span>
          </span>
        </div>
        <p className="mt-1 type-small text-fg-muted">{check.reason}</p>
        {check.fix && (
          <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 type-small text-fg">
            <span className="font-medium">How to fix: </span>
            {check.fix}
          </p>
        )}
      </div>
    </li>
  );
}

// One scoring category: its name, score and a thin bar; it expands to show its checks
export default function CategoryCard({ category, open, onToggle }) {
  const percent = Math.round((category.score / category.maxScore) * 100);
  const tone = scoreTone(percent);
  const panelId = `category-${category.id}`;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="type-label text-fg">{category.label}</span>
            <span className={`type-small font-medium tabular-nums ${TONE_TEXT[tone]}`}>
              {category.score}
              <span className="text-fg-subtle"> / {category.maxScore}</span>
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span className={`block h-full rounded-full ${TONE_FILL[tone]}`} style={{ width: `${percent}%` }} />
          </span>
          <span className="mt-1.5 block type-small text-fg-muted">
            {category.passed} of {category.total} checks passed
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <ul id={panelId} className="divide-y divide-line border-t border-line px-5">
          {category.checks.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </ul>
      )}
    </section>
  );
}
