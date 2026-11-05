import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import ResumeCard, { ResumeCardSkeleton } from "../components/ResumeCard";
import ApplicationCard from "../components/ApplicationCard";
import ConfirmModal from "../components/ConfirmModal";
import DeleteApplicationModal from "../components/DeleteApplicationModal";
import EmptyState from "../components/EmptyState";
import ImportResumeModal from "../components/ImportResumeModal";
import { clearPendingImport, getPendingImport } from "../utils/resumeFile";

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
  const [jobs, setJobs] = useState([]); // Tailored jobs: shown as applications (resume + job + cover letter)
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [recheckingId, setRecheckingId] = useState(null);
  const [resumeToDelete, setResumeToDelete] = useState(null); // The resume shown in the modal
  const [applicationToDelete, setApplicationToDelete] = useState(null); // The job shown in "Delete this application?"
  const [selected, setSelected] = useState({ resumes: [], jobs: [] }); // Bulk delete: resume ids, job ids
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // Increase it to fetch the list again
  // A resume a guest checked on the ATS page before signing up: import it right away
  const [pendingFile, setPendingFile] = useState(getPendingImport);
  const [isImportOpen, setIsImportOpen] = useState(() => Boolean(getPendingImport()));

  usePageTitle("Dashboard");

  useEffect(() => {
    if (pendingFile) clearPendingImport(); // Only once, even if the user comes back later
  }, [pendingFile]);

  const closeImport = () => {
    setIsImportOpen(false);
    setPendingFile(null);
  };

  // Load the user's resumes when the page opens (and again on "Try again")
  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [{ data }, jobList] = await Promise.all([api.get("/resumes"), api.get("/jobs").catch(() => ({ data: [] }))]);
        setResumes(data);
        setJobs(jobList.data);
      } catch (error) {
        setLoadError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [reloadKey]);

  // A tailored resume appears in its application card instead of the resume grid
  const applications = jobs.filter((job) => resumes.some((resume) => resume._id === job.tailoredResumeId));
  const tailoredIds = new Set(applications.map((job) => job.tailoredResumeId));
  const otherResumes = resumes.filter((resume) => !tailoredIds.has(resume._id));

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

  // Scores the resume again (against the job it was last checked for) and updates its badge
  const handleRecheck = async (resume) => {
    setRecheckingId(resume._id);
    try {
      const { data } = await api.post(`/ats/rescore/${resume._id}`);
      setResumes((current) => current.map((r) => (r._id === resume._id ? { ...r, atsScore: { score: data.score, grade: data.grade, checkedAt: data.checkedAt } } : r)));
      toast.success(`ATS score: ${data.score} (${data.grade})`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRecheckingId(null);
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

  // One application: scope "resume" (the tailored resume only) or "application" (job, resume, cover letters)
  const handleDeleteApplication = async (scope) => {
    const job = applicationToDelete;
    setDeleting(true);
    try {
      if (scope === "resume") await api.delete(`/resumes/${job.tailoredResumeId}`);
      else await api.delete(`/jobs/${job._id}`);
      toast.success(scope === "resume" ? "Tailored resume deleted" : "Application deleted");
      setApplicationToDelete(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete: the selected resumes, and the selected applications (resume only, or whole)
  const toggle = (kind, id, on) => setSelected((current) => ({ ...current, [kind]: on ? [...current[kind], id] : current[kind].filter((other) => other !== id) }));
  const selectedCount = selected.resumes.length + selected.jobs.length;
  const handleBulkDelete = async (scope = "resume") => {
    const tailoredIds = applications.filter((job) => selected.jobs.includes(job._id)).map((job) => job.tailoredResumeId);
    setDeleting(true);
    try {
      const { data } = await api.post("/resumes/delete-many", {
        resumeIds: [...selected.resumes, ...(scope === "resume" ? tailoredIds : [])],
        jobIds: scope === "application" ? selected.jobs : [],
      });
      toast.success(`Deleted ${data.resumes} ${data.resumes === 1 ? "resume" : "resumes"}${data.applications ? ` and ${data.applications} ${data.applications === 1 ? "application" : "applications"}` : ""}`);
      setSelected({ resumes: [], jobs: [] });
      setBulkOpen(false);
      setReloadKey((key) => key + 1);
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
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
            {getGreeting()}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {loading
              ? "Loading your resumes..."
              : loadError
                ? "Your resumes couldn't be loaded."
                : `You have ${resumes.length} ${resumes.length === 1 ? "resume" : "resumes"}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/tailor" className="btn-secondary">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1" />
            </svg>
            Tailor to a job
          </Link>
          <button type="button" onClick={() => setIsImportOpen(true)} className="btn-secondary">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Upload existing resume
          </button>
          <button type="button" onClick={handleCreate} disabled={creating} className="btn-primary">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {creating ? "Creating..." : "Create new resume"}
          </button>
        </div>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Couldn't load your resumes</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState onCreate={handleCreate} onUpload={() => setIsImportOpen(true)} creating={creating} />
        ) : (
          <>
            {selectedCount > 0 && (
              <div className="sticky top-2 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/70" data-testid="bulk-bar">
                <span className="font-medium text-indigo-900 dark:text-indigo-100">{selectedCount} selected</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected({ resumes: [], jobs: [] })} className="btn-secondary px-3 py-1.5">
                    Clear
                  </button>
                  <button type="button" onClick={() => setBulkOpen(true)} className="btn-primary bg-red-600 px-3 py-1.5 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500">
                    Delete selected
                  </button>
                </div>
              </div>
            )}
            {applications.length > 0 && (
              <section className="mb-10" aria-labelledby="applications">
                <h2 id="applications" className="text-lg font-semibold text-slate-900 dark:text-white">
                  Applications
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each tailored resume with its job and cover letter.</p>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {applications.map((job) => (
                    <ApplicationCard
                      key={job._id}
                      job={job}
                      selected={selected.jobs.includes(job._id)}
                      onSelect={(on) => toggle("jobs", job._id, on)}
                      onDelete={() => setApplicationToDelete(job)}
                    />
                  ))}
                </div>
              </section>
            )}
            {applications.length > 0 && otherResumes.length > 0 && (
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Resumes</h2>
            )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherResumes.map((resume) => (
              <ResumeCard
                key={resume._id}
                resume={resume}
                onDuplicate={handleDuplicate}
                onDelete={setResumeToDelete}
                onRecheck={handleRecheck}
                isDuplicating={duplicatingId === resume._id}
                isRechecking={recheckingId === resume._id}
                selected={selected.resumes.includes(resume._id)}
                onSelect={(on) => toggle("resumes", resume._id, on)}
              />
            ))}
          </div>
          </>
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
      <DeleteApplicationModal
        open={applicationToDelete !== null}
        name={applicationToDelete?.title || "Untitled job"}
        onChoose={handleDeleteApplication}
        onCancel={() => setApplicationToDelete(null)}
        loading={deleting}
      />
      {/* Bulk: applications in the selection need the resume-only / whole choice */}
      <DeleteApplicationModal
        open={bulkOpen && selected.jobs.length > 0}
        count={selectedCount}
        name={applications.find((job) => job._id === selected.jobs[0])?.title || "Untitled job"}
        onChoose={handleBulkDelete}
        onCancel={() => setBulkOpen(false)}
        loading={deleting}
      />
      <ConfirmModal
        open={bulkOpen && selected.jobs.length === 0}
        title={`Delete ${selected.resumes.length} ${selected.resumes.length === 1 ? "resume" : "resumes"}?`}
        message="The selected resumes will be permanently deleted. This can't be undone."
        confirmText="Delete"
        onConfirm={() => handleBulkDelete("resume")}
        onCancel={() => setBulkOpen(false)}
        loading={deleting}
      />

      {isImportOpen && (
        <ImportResumeModal
          initialFile={pendingFile}
          onClose={closeImport}
          onStartFromScratch={() => {
            closeImport();
            handleCreate();
          }}
        />
      )}
    </div>
  );
}
