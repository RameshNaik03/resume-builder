import { Link } from "react-router-dom";
import { FileText, Mail, Target } from "lucide-react";
import timeAgo from "../utils/timeAgo";
import { fitTone } from "./ats/atsHelpers";

// One application on the dashboard: a tailored resume grouped with its job and cover letter.
//   job - a saved job from GET /api/jobs ({ title, company, score, tailoredResumeId, coverLetterId, createdAt })
export default function ApplicationCard({ job }) {
  const fit = fitTone(job.score);
  const links = [
    { to: `/editor/${job.tailoredResumeId}`, label: "Resume", icon: FileText },
    job.coverLetterId
      ? { to: `/cover-letters/${job.coverLetterId}`, label: "Cover letter", icon: Mail }
      : { to: `/cover-letters/new?job=${job._id}`, label: "Write cover letter", icon: Mail },
    { to: `/tailor/jobs/${job._id}#job-description`, label: "Job description", icon: Target },
  ];

  return (
    <article className="card flex flex-col p-4" data-testid="application-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/tailor/jobs/${job._id}`} className="block truncate font-semibold text-slate-900 hover:text-indigo-700 dark:text-white dark:hover:text-indigo-300">
            {job.title || "Untitled job"}
          </Link>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{job.company || "Company not stated"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${fit.badge}`}>
          {job.score}% · {fit.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Tailored {timeAgo(job.createdAt)}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <Link to={to} className="btn-secondary gap-1.5 px-2.5 py-1.5 text-sm">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
