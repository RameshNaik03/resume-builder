import { Check } from "lucide-react";
import { ANALYZE_STEPS } from "./atsHelpers";

// step = index of the step in progress; ANALYZE_STEPS.length means all done
export default function AnalyzeProgress({ step, fileName }) {
  return (
    <section className="card mx-auto max-w-lg p-8" role="status" aria-live="polite">
      <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-white">Analyzing your resume</h1>
      {fileName && <p className="mt-1 truncate text-center text-sm text-slate-500 dark:text-slate-400">{fileName}</p>}

      <ol className="mt-8 space-y-5">
        {ANALYZE_STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : active ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </span>
              <span
                className={`text-sm font-medium ${
                  done || active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {label}
                <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        Usually a few seconds; up to a minute when AI feedback is on.
      </p>
    </section>
  );
}
