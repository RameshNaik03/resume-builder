import { Copy, FileText, Gauge, PenLine, Target, Trash2 } from "lucide-react";
import timeAgo from "../utils/timeAgo";
import { Badge } from "./ui/Display";
import DocumentCard, { DocumentCardSkeleton } from "./DocumentCard";
import OriginalDocument from "./original/OriginalDocument";

// A resume on the dashboard: its first page, title, when it was last updated, its ATS score (if
// checked) and a menu: open, tailor to a job, ATS check, duplicate, delete.
// An imported resume also offers "View original". One kept in its original design (no template
// chosen yet) shows the uploaded file's first page and opens the original's page; its menu
// offers "Edit with a matching template", and its ATS check runs on the file itself.
//   busyLabel - shown instead of "Updated …" while something runs ("Duplicating…")
const atsTone = (score) => (score >= 70 ? "success" : score >= 50 ? "warning" : "danger");

export default function ResumeCard({ resume, onDuplicate, onDelete, onRecheck, busyLabel, selected = false, onSelect }) {
  const ats = resume.atsScore;
  const original = resume.original;
  const keptOriginal = Boolean(original) && !resume.template;
  const originalPage = `/resumes/${resume._id}/original`;
  return (
    <DocumentCard
      resume={resume}
      to={keptOriginal ? originalPage : `/editor/${resume._id}`}
      title={resume.title}
      linkProps={{ title: resume.title }}
      meta={busyLabel ?? `${keptOriginal ? `Your original ${original.kind.toUpperCase()} · ` : ""}Updated ${timeAgo(resume.updatedAt)}`}
      thumbnail={keptOriginal ? <OriginalDocument resume={resume} pages="first" width={196} /> : undefined}
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
      data-original={keptOriginal ? "kept" : original ? "available" : undefined}
      menuItems={[
        keptOriginal
          ? { label: "Edit with a matching template", icon: PenLine, to: `${originalPage}?match=1` }
          : { label: "Open in editor", icon: PenLine, to: `/editor/${resume._id}` },
        ...(original ? [{ label: "View original", icon: FileText, to: originalPage }] : []),
        { label: "Tailor to a job", icon: Target, to: `/tailor?resume=${resume._id}` },
        keptOriginal
          ? { label: ats ? "Re-check ATS score" : "Check ATS score", icon: Gauge, to: `/ats-checker?original=${resume._id}` }
          : { label: ats ? "Re-check ATS score" : "Check ATS score", icon: Gauge, onClick: () => onRecheck(resume) },
        { label: "Duplicate", icon: Copy, onClick: () => onDuplicate(resume) },
        "divider",
        { label: "Delete", icon: Trash2, tone: "danger", onClick: () => onDelete(resume) },
      ]}
    />
  );
}

export { DocumentCardSkeleton as ResumeCardSkeleton };
