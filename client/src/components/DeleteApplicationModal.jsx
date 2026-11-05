import { useEffect, useRef } from "react";
import Modal from "./Modal";

// "Delete this application?" for a tailored resume: delete only the resume (the job, its match
// report and cover letters stay; a letter then uses the base resume), or the whole application
// (resume, cover letters and job). Also used for several applications at once (count).
//   onChoose("resume" | "application")
export default function DeleteApplicationModal({ open, name, count = 1, onChoose, onCancel, loading = false }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (open) cancelRef.current?.focus(); // So Enter by accident doesn't delete anything
  }, [open]);
  if (!open) return null;

  const several = count > 1;
  return (
    <Modal onClose={() => !loading && onCancel()} labelledBy="delete-application-title" className="max-w-md p-6">
      <h2 id="delete-application-title" className="text-lg font-semibold text-slate-900 dark:text-white">
        {several ? `Delete ${count} selected items?` : "Delete this application?"}
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {several ? "Choose what to delete for each application (other selected resumes are deleted too)." : `"${name}": choose what to delete.`} This can't be undone.
      </p>
      <div className="mt-5 space-y-3">
        <button type="button" onClick={() => onChoose("resume")} disabled={loading} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-red-300 hover:bg-red-50 disabled:opacity-60 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/40">
          <span className="block font-medium text-red-700 dark:text-red-400">Delete resume only</span>
          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">The job, its match report and any cover letter stay (the letter then uses your base resume).</span>
        </button>
        <button type="button" onClick={() => onChoose("application")} disabled={loading} className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:hover:bg-red-950/70">
          <span className="block font-medium text-red-700 dark:text-red-400">Delete the whole application (resume, cover letter and job)</span>
          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">Everything for this job is removed. Your base resume stays.</span>
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <button ref={cancelRef} type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          {loading ? "Please wait..." : "Cancel"}
        </button>
      </div>
    </Modal>
  );
}
