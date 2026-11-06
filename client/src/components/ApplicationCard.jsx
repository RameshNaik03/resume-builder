import { FileText, Mail, PenLine, Target, Trash2 } from "lucide-react";
import timeAgo from "../utils/timeAgo";
import { Badge } from "./ui/Display";
import DocumentCard from "./DocumentCard";
import { fitTone } from "./ats/atsHelpers";

// An application on the dashboard: a tailored resume grouped with its job and cover letter, in
// the same card as a resume. The card opens the match report; the menu has the resume, the
// cover letter (or "Write cover letter"), the job description and Delete.
//   job    - a saved job from GET /api/jobs ({ title, company, score, tailoredResumeId, coverLetterId, createdAt })
//   resume - its tailored resume (for the thumbnail)
export default function ApplicationCard({ job, resume, selected = false, onSelect, onDelete }) {
  const name = job.title || "Untitled job";
  return (
    <DocumentCard
      resume={resume}
      to={`/tailor/jobs/${job._id}`}
      title={name}
      meta={`${job.company || "Company not stated"} · tailored ${timeAgo(job.createdAt)}`}
      badge={
        <Badge tone={fitTone(job.score).tone}>
          {job.score}% · {fitTone(job.score).label}
        </Badge>
      }
      selected={selected}
      onSelect={onSelect}
      data-testid="application-card"
      menuItems={[
        { label: "Match report", icon: Target, to: `/tailor/jobs/${job._id}` },
        { label: "Resume", icon: PenLine, to: `/editor/${job.tailoredResumeId}` },
        job.coverLetterId
          ? { label: "Cover letter", icon: Mail, to: `/cover-letters/${job.coverLetterId}` }
          : { label: "Write cover letter", icon: Mail, to: `/cover-letters/new?job=${job._id}` },
        { label: "Job description", icon: FileText, to: `/tailor/jobs/${job._id}#job-description` },
        "divider",
        { label: "Delete", icon: Trash2, tone: "danger", onClick: onDelete },
      ]}
    />
  );
}
