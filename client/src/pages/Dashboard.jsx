import { useAuth } from "../context/AuthContext";

// Placeholder: the resume list will be built in a later phase
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My resumes</h1>
      <p className="mt-1 text-sm text-slate-500">Welcome, {user.name}. Your resumes will appear here.</p>

      <div className="card mt-8 border-dashed p-12 text-center">
        <p className="font-medium text-slate-700">No resumes yet</p>
        <p className="mt-1 text-sm text-slate-500">The resume list is coming in the next phase.</p>
      </div>
    </div>
  );
}
