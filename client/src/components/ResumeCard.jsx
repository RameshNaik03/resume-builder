import { Copy, Gauge, PenLine, Target, Trash2 } from "lucide-react";
import timeAgo from "../utils/timeAgo";
import { Badge } from "./ui/Display";
import DocumentCard, { DocumentCardSkeleton } from "./DocumentCard";

// A resume on the dashboard: its first page, title, when it was last updated, its ATS score (if
// checked) and a menu: open, tailor to a job, ATS check, duplicate, delete.
//   busyLabel - shown instead of "Updated …" while something runs ("Duplicating…")
const atsTone = (score) => (score >= 70 ? "success" : score >= 50 ? "warning" : "danger");

export default function ResumeCard({ resume, onDuplicate, onDelete, onRecheck, busyLabel, selected = false, onSelect }) {
  const ats = resume.atsScore;
  return (
    <DocumentCard
      resume={resume}
      to={`/editor/${resume._id}`}
      title={resume.title}
      linkProps={{ title: resume.title }}
      meta={busyLabel ?? `Updated ${timeAgo(resume.updatedAt)}`}
      badge={
        ats?.score != null && (
          <span data-testid="ats-badge" title={`ATS score ${ats.score} (${ats.grade}), checked ${timeAgo(ats.checkedAt)}`}>
            <Badge tone={atsTone(ats.score)}>ATS {ats.score}</Badge>
          </span>
        )
      }
      selected={selected}
      onSelect={onSelect}
      data-testid="resume-card"
      menuItems={[
        { label: "Open in editor", icon: PenLine, to: `/editor/${resume._id}` },
        { label: "Tailor to a job", icon: Target, to: `/tailor?resume=${resume._id}` },
        { label: ats ? "Re-check ATS score" : "Check ATS score", icon: Gauge, onClick: () => onRecheck(resume) },
        { label: "Duplicate", icon: Copy, onClick: () => onDuplicate(resume) },
        "divider",
        { label: "Delete", icon: Trash2, tone: "danger", onClick: () => onDelete(resume) },
      ]}
    />
  );
}

export { DocumentCardSkeleton as ResumeCardSkeleton };
