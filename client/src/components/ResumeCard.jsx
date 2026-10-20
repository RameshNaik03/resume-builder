import { Link } from "react-router-dom";
import timeAgo from "../utils/timeAgo";

export default function ResumeCard({ resume, onDuplicate, onDelete, isDuplicating }) {
  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-800">
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
