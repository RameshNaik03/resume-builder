import { Link } from "react-router-dom";
import timeAgo from "../utils/timeAgo";
import { scoreTone } from "./ats/atsHelpers";

// ATS score badge colours, matching the score ring (green 70+, orange 50-69, red below)
const BADGE_STYLES = {
  "bg-emerald-500": "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-900",
  "bg-orange-500": "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-orange-900",
  "bg-rose-500": "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-900",
};

export default function ResumeCard({ resume, onDuplicate, onDelete, onRecheck, isDuplicating, isRechecking }) {
  const ats = resume.atsScore;
  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-800">
      {ats && (
        <span
          className={`absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${BADGE_STYLES[scoreTone(ats.score).bar]}`}
          title={`ATS score ${ats.score} (${ats.grade}), checked ${timeAgo(ats.checkedAt)}`}
          data-testid="ats-badge"
        >
          ATS {ats.score}
        </span>
      )}
      {/* Decorative "page" preview */}
      <div className="flex h-36 items-center justify-center bg-linear-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/60 dark:to-slate-800">
        <div className="h-28 w-20 space-y-1.5 rounded bg-white p-2.5 shadow-sm transition group-hover:scale-105">
          <div className="h-1.5 w-3/4 rounded bg-indigo-300" />
          <div className="h-1 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* The ::after layer stretches this link over the whole card, so the
            whole card is clickable without nesting buttons inside a link */}
        <Link
          to={`/editor/${resume._id}`}
          className="truncate font-semibold text-slate-900 dark:text-white after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          title={resume.title}
        >
          {resume.title}
        </Link>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Last updated {timeAgo(resume.updatedAt)}</p>

        {/* relative z-10 puts the buttons above the stretched link */}
        <div className="relative z-10 mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(resume)}
            disabled={isDuplicating}
            className="btn-secondary flex-1 px-3 py-1.5"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {isDuplicating ? "Copying..." : "Duplicate"}
          </button>
          <button
            type="button"
            onClick={() => onRecheck(resume)}
            disabled={isRechecking}
            className="btn-secondary px-3 py-1.5"
            aria-label={`${ats ? "Re-check" : "Check"} the ATS score of ${resume.title}`}
          >
            <svg className={`size-4 ${isRechecking ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
            </svg>
            {isRechecking ? "Checking..." : ats ? "Re-check" : "ATS check"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(resume)}
            className="btn-secondary px-3 py-1.5 text-red-600 hover:border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/50"
            aria-label={`Delete ${resume.title}`}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Grey placeholder with the same shape as a card, shown while loading
export function ResumeCardSkeleton() {
  return (
    <div className="card animate-pulse overflow-hidden" aria-hidden="true">
      <div className="h-36 bg-slate-100 dark:bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
