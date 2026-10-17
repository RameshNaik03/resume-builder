// Shown on the dashboard when the user has no resumes yet
export default function EmptyState({ onCreate, creating }) {
  return (
    <div className="card flex flex-col items-center border-dashed px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M12 18v-6M9 15h6" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">No resumes yet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Create your first resume. You can make as many versions as you like and tailor each one to a job.
      </p>
      <button type="button" onClick={onCreate} disabled={creating} className="btn-primary mt-6">
        {creating ? "Creating..." : "Create your first resume"}
      </button>
    </div>
  );
}
