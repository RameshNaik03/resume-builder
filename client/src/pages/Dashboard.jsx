import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import ResumeCard, { ResumeCardSkeleton } from "../components/ResumeCard";
import ConfirmModal from "../components/ConfirmModal";
import EmptyState from "../components/EmptyState";

// "Good morning" / "Good afternoon" / "Good evening" based on the current hour
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [resumeToDelete, setResumeToDelete] = useState(null); // The resume shown in the modal
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // Increase it to fetch the list again

  usePageTitle("Dashboard");

  // Load the user's resumes when the page opens (and again on "Try again")
  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await api.get("/resumes");
        setResumes(data);
      } catch (error) {
        setLoadError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [reloadKey]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/resumes");
      toast.success("New resume created");
      navigate(`/editor/${data._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setCreating(false);
    }
  };

  const handleDuplicate = async (resume) => {
    setDuplicatingId(resume._id);
    try {
      const { data } = await api.post(`/resumes/${resume._id}/duplicate`);
      // Newest first, so the copy goes at the top of the list
      setResumes((current) => [{ _id: data._id, title: data.title, updatedAt: data.updatedAt }, ...current]);
      toast.success(`Created "${data.title}"`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/resumes/${resumeToDelete._id}`);
      setResumes((current) => current.filter((r) => r._id !== resumeToDelete._id));
      toast.success("Resume deleted");
      setResumeToDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {getGreeting()}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading your resumes..."
              : loadError
                ? "Your resumes couldn't be loaded."
                : `You have ${resumes.length} ${resumes.length === 1 ? "resume" : "resumes"}.`}
          </p>
        </div>

        <button type="button" onClick={handleCreate} disabled={creating} className="btn-primary self-start sm:self-auto">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {creating ? "Creating..." : "Create new resume"}
        </button>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <ResumeCardSkeleton key={n} />
            ))}
          </div>
        ) : loadError ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center" role="alert">
            <h2 className="text-lg font-semibold text-slate-900">Couldn't load your resumes</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{loadError}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState onCreate={handleCreate} creating={creating} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume._id}
                resume={resume}
                onDuplicate={handleDuplicate}
                onDelete={setResumeToDelete}
                isDuplicating={duplicatingId === resume._id}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={resumeToDelete !== null}
        title="Delete resume?"
        message={`"${resumeToDelete?.title}" will be permanently deleted. This can't be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setResumeToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
