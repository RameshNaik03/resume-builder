import Dialog from "./ui/Dialog";
import Button from "./ui/Button";

// "Delete this application?" for a tailored resume: delete only the resume (the job, its match
// report and cover letters stay; a letter then uses the base resume), or the whole application
// (resume, cover letters and job). Also used for several items at once (count).
//   onChoose("resume" | "application"); Cancel has focus first
export default function DeleteApplicationModal({ open, name, count = 1, onChoose, onCancel, loading = false }) {
  if (!open) return null;

  const several = count > 1;
  const choice = "w-full rounded-xl border p-3.5 text-left transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return (
    <Dialog
      title={several ? `Delete ${count} selected items?` : "Delete this application?"}
      description={`${several ? "Choose what to delete for each application (other selected resumes are deleted too)." : `"${name}": choose what to delete.`} This can't be undone.`}
      onClose={() => !loading && onCancel()}
      footer={
        <Button onClick={onCancel} disabled={loading} data-autofocus>
          {loading ? "Please wait..." : "Cancel"}
        </Button>
      }
    >
      <div className="space-y-3">
        <button type="button" onClick={() => onChoose("resume")} disabled={loading} className={`${choice} border-line hover:border-danger/40 hover:bg-danger-soft`}>
          <span className="block type-label text-danger">Delete resume only</span>
          <span className="mt-0.5 block type-small text-fg-muted">The job, its match report and any cover letter stay (the letter then uses your base resume).</span>
        </button>
        <button type="button" onClick={() => onChoose("application")} disabled={loading} className={`${choice} border-danger/30 bg-danger-soft hover:border-danger/60`}>
          <span className="block type-label text-danger">Delete the whole application (resume, cover letter and job)</span>
          <span className="mt-0.5 block type-small text-fg-muted">Everything for this job is removed. Your base resume stays.</span>
        </button>
      </div>
    </Dialog>
  );
}
