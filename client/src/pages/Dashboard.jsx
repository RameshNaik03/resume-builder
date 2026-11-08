import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Target, Trash2, Upload, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import ResumeCard, { ResumeCardSkeleton } from "../components/ResumeCard";
import ApplicationCard from "../components/ApplicationCard";
import ConfirmModal from "../components/ConfirmModal";
import DeleteApplicationModal from "../components/DeleteApplicationModal";
import ImportResumeModal from "../components/ImportResumeModal";
import Button from "../components/ui/Button";
import { Alert, EmptyState, PageHeader } from "../components/ui/Display";
import { clearPendingImport, getPendingImport } from "../utils/resumeFile";
import { pageClass } from "../components/ui/pageLayout";

// The dashboard: the user's applications (a tailored resume with its job and cover letter) and
// resumes, as cards that lead with each resume's real first page. Each card's actions are in its
// menu; ticking cards shows a bar to delete several at once.

// "Good morning" / "Good afternoon" / "Good evening" based on the current hour
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`;
const GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]); // Tailored jobs: shown as applications (resume + job + cover letter)
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState({}); // { [resumeId]: "Duplicating…" | "Checking…" }
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

  // Load the user's resumes and applications when the page opens (and again on "Try again")
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
  const resumeById = (id) => resumes.find((resume) => resume._id === id);

  const setBusyFor = (id, label) => setBusy((current) => ({ ...current, [id]: label }));
  const clearBusy = (id) =>
    setBusy((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

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
    setBusyFor(resume._id, "Duplicating…");
    try {
      const { data } = await api.post(`/resumes/${resume._id}/duplicate`);
      setResumes((current) => [data, ...current]); // Newest first, so the copy goes at the top
      toast.success(`Created "${data.title}"`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      clearBusy(resume._id);
    }
  };

  // Scores the resume again (against the job it was last checked for) and updates its badge
  const handleRecheck = async (resume) => {
    setBusyFor(resume._id, "Checking…");
    try {
      const { data } = await api.post(`/ats/rescore/${resume._id}`);
      setResumes((current) => current.map((r) => (r._id === resume._id ? { ...r, atsScore: { score: data.score, grade: data.grade, checkedAt: data.checkedAt } } : r)));
      toast.success(`ATS score: ${data.score} (${data.grade})`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      clearBusy(resume._id);
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
    const tailoredSelected = applications.filter((job) => selected.jobs.includes(job._id)).map((job) => job.tailoredResumeId);
    setDeleting(true);
    try {
      const { data } = await api.post("/resumes/delete-many", {
        resumeIds: [...selected.resumes, ...(scope === "resume" ? tailoredSelected : [])],
        jobIds: scope === "application" ? selected.jobs : [],
      });
      toast.success(`Deleted ${plural(data.resumes, "resume")}${data.applications ? ` and ${plural(data.applications, "application")}` : ""}`);
      setSelected({ resumes: [], jobs: [] });
      setBulkOpen(false);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const summary = loading
    ? "Loading your resumes…"
    : loadError
      ? "Your resumes couldn't be loaded."
      : [plural(otherResumes.length, "resume"), applications.length > 0 && plural(applications.length, "application")].filter(Boolean).join(" · ");

  return (
    <div className={pageClass()}>
      <PageHeader
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        description={summary}
        actions={
          <>
            <Button icon={Target} onClick={() => navigate("/tailor")}>
              Tailor to a job
            </Button>
            <Button icon={Upload} onClick={() => setIsImportOpen(true)}>
              Upload
            </Button>
            <Button variant="primary" icon={Plus} onClick={handleCreate} loading={creating}>
              {creating ? "Creating…" : "Create resume"}
            </Button>
          </>
        }
      />

      <div className="mt-8">
        {loading ? (
          <div className={GRID} aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <ResumeCardSkeleton key={n} />
            ))}
          </div>
        ) : loadError ? (
          <Alert
            tone="danger"
            title="Couldn't load your resumes"
            action={
              <Button size="sm" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes yet"
            description="Start from a blank page, or upload the resume you already have and we'll fill in the editor for you."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={Upload} onClick={() => setIsImportOpen(true)}>
                  Upload a resume
                </Button>
                <Button variant="primary" icon={Plus} onClick={handleCreate} loading={creating}>
                  Create resume
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-12">
            {selectedCount > 0 && (
              <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-raised" data-testid="bulk-bar" role="region" aria-label="Selected items">
                <p className="type-label text-fg" aria-live="polite">
                  {selectedCount} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={X} onClick={() => setSelected({ resumes: [], jobs: [] })}>
                    Clear
                  </Button>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => setBulkOpen(true)}>
                    Delete selected
                  </Button>
                </div>
              </div>
            )}

            {applications.length > 0 && (
              <section aria-labelledby="applications">
                <SectionHeading id="applications" title="Applications" description="Each tailored resume with its job and cover letter." />
                <div className={GRID}>
                  {applications.map((job) => (
                    <ApplicationCard
                      key={job._id}
                      job={job}
                      resume={resumeById(job.tailoredResumeId)}
                      selected={selected.jobs.includes(job._id)}
                      onSelect={(on) => toggle("jobs", job._id, on)}
                      onDelete={() => setApplicationToDelete(job)}
                    />
                  ))}
                </div>
              </section>
            )}

            {otherResumes.length > 0 && (
              <section aria-labelledby="resumes">
                <SectionHeading id="resumes" title="Resumes" description={applications.length > 0 ? "Your base resumes. Tailor one to a job to start an application." : null} />
                <div className={GRID}>
                  {otherResumes.map((resume) => (
                    <ResumeCard
                      key={resume._id}
                      resume={resume}
                      busyLabel={busy[resume._id]}
                      onDuplicate={handleDuplicate}
                      onDelete={setResumeToDelete}
                      onRecheck={handleRecheck}
                      selected={selected.resumes.includes(resume._id)}
                      onSelect={(on) => toggle("resumes", resume._id, on)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={resumeToDelete !== null}
        title="Delete this resume?"
        message={`"${resumeToDelete?.title}" will be permanently deleted. This can't be undone.`}
        confirmText="Delete resume"
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
        title={`Delete ${plural(selected.resumes.length, "resume")}?`}
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
          onImported={(resume) => setResumes((current) => [resume, ...current])}
          onStartFromScratch={() => {
            closeImport();
            handleCreate();
          }}
        />
      )}
    </div>
  );
}

function SectionHeading({ id, title, description }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="type-h2 text-fg">
        {title}
      </h2>
      {description && <p className="mt-1 type-body text-fg-muted">{description}</p>}
    </div>
  );
}
