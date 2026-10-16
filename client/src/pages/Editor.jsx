import { Link, useParams } from "react-router-dom";

// Placeholder: the resume editor will be built in a later phase
export default function Editor() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Resume editor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Editing resume <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{id}</code>
      </p>

      <div className="card mt-8 border-dashed p-12 text-center">
        <p className="font-medium text-slate-700">Editor coming soon</p>
        <p className="mt-1 text-sm text-slate-500">The form and live preview will be built in a later phase.</p>
      </div>
    </div>
  );
}
