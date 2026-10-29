import { CheckCircle2, ChevronDown, FileSearch, LayoutList, PenLine, Sparkles, Tags, XCircle } from "lucide-react";
import { scoreTone } from "./atsHelpers";

const ICONS = { parseability: FileSearch, structure: LayoutList, content: PenLine, keywords: Tags, polish: Sparkles };

function CheckItem({ check }) {
  const partial = !check.passed && check.points > 0;
  const Icon = check.passed ? CheckCircle2 : XCircle;
  const iconColor = check.passed
    ? "text-emerald-600 dark:text-emerald-400"
    : partial
      ? "text-orange-500 dark:text-orange-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <li className="flex gap-3 py-4">
      <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-slate-900 dark:text-white">
            <span className="sr-only">{check.passed ? "Passed: " : "Not passed: "}</span>
            {check.label}
            {check.judgedBy === "ai" && (
              <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                AI-judged
              </span>
            )}
          </p>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {check.points}/{check.maxPoints}
            <span className="sr-only"> points</span>
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{check.reason}</p>
        {check.fix && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">How to fix: </span>
            {check.fix}
          </p>
        )}
      </div>
    </li>
  );
}

// One scoring category: a header with a mini progress bar that expands to show its checks
export default function CategoryCard({ category, open, onToggle }) {
  const Icon = ICONS[category.id] ?? FileSearch;
  const percent = Math.round((category.score / category.maxScore) * 100);
  const tone = scoreTone(percent);
  const panelId = `category-${category.id}`;

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-slate-900 dark:text-white">{category.label}</span>
            <span className={`text-sm font-bold tabular-nums ${tone.text}`}>
              {category.score}
              <span className="font-medium text-slate-400 dark:text-slate-500"> / {category.maxScore}</span>
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <span className={`block h-full rounded-full ${tone.bar} transition-[width] duration-700`} style={{ width: `${percent}%` }} />
          </span>
          <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">
            {category.passed} of {category.total} checks passed
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul id={panelId} className="divide-y divide-slate-100 border-t border-slate-100 px-5 dark:divide-slate-800 dark:border-slate-800">
          {category.checks.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </ul>
      )}
    </section>
  );
}
