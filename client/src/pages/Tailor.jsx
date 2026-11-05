import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Target, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import timeAgo from "../utils/timeAgo";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import DeleteApplicationModal from "../components/DeleteApplicationModal";
import ScoreRing from "../components/ats/ScoreRing";
import { fitTone } from "../components/ats/atsHelpers";
import TailorOptions from "../components/tailor/TailorOptions";
import { STRENGTHS, initialChoices, toRequestOptions } from "../components/tailor/tailorChoices";
import { pageClass } from "../components/ui/pageLayout";

// "Tailor to a job" (/tailor, /tailor/jobs/:jobId). Uses the /api/jobs routes:
//   1. Paste a job description (or reuse a saved job) and pick the base resume
//   2. Check the analysis: move skills between must-have and nice-to-have, or remove them;
//      choose how much the AI rewrites (light, balanced, strong), or see that AI is off
//   3. Tailoring progress, then the match report (/tailor/jobs/:jobId): how it was tailored
//      (and how many rewrites the safety check dropped), the match %, matched skills with
//      their evidence, and missing skills the user confirms ("I have this skill") or declines
//      ("I don't have this"). Skills are only ever added after confirming.

const MIN_JOB_WORDS = 30; // Same minimum as the server
const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const HONEST_NOTE = "We only use what's true in your resume. Missing skills are listed so you can decide what to learn or mention.";
const TAILOR_STEPS = ["Reading your resume", "Matching it to the job", "Writing the tailored copy"];
const STEP_TIMES = [600, 1500]; // When each progress step starts (ms); the last one waits for the server
const AI_OFF_NOTE = "AI is off, so tailoring is limited to reordering and small fixes.";
const OPTIONS_DELAY = 300; // ms after the last analysis edit before the options are fetched again

const jobTitleOf = (job) => [job.title ?? job.analysis?.title, job.company ?? job.analysis?.company].filter(Boolean).join(" – ") || "Untitled job";

export default function Tailor() {
  const { jobId } = useParams();
  return jobId ? <JobReport key={jobId} jobId={jobId} /> : <TailorFlow />;
}

// ---------- Steps 1 and 2 ----------

function TailorFlow() {
  usePageTitle("Tailor to a job");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("input"); // "input" | "check" | "tailoring"
  const [resumes, setResumes] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [resumeId, setResumeId] = useState(searchParams.get("resume") ?? "");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(null); // From the server, with the analysis
  const [options, setOptions] = useState(null); // What the options panel offers (POST /jobs/options)
  const [choices, setChoices] = useState(null); // The user's options
  const [askVersion, setAskVersion] = useState(false); // "Replace the existing version" or "Create a new version"
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // The options for this resume and job, again whenever the analysis is edited
  useEffect(() => {
    if (step !== "check" || !analysis || !resumeId) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .post("/jobs/options", { resumeId, job: { description, analysis } })
        .then(({ data }) => {
          if (cancelled) return;
          setOptions(data);
          setChoices((previous) => initialChoices(data, previous ?? {}));
        })
        .catch((error) => !cancelled && toast.error(getErrorMessage(error)));
    }, OPTIONS_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, analysis, resumeId, description]);

  useEffect(() => {
    Promise.all([api.get("/resumes"), api.get("/jobs")])
      .then(([resumeList, jobList]) => {
        setResumes(resumeList.data);
        setJobs(jobList.data);
        setResumeId((current) => current || resumeList.data[0]?._id || "");
      })
      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);

  const words = countWords(description);
  const canAnalyze = words >= MIN_JOB_WORDS && resumeId && !busy;

  const analyze = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/jobs/analyze", { jobDescription: description });
      setAnalysis(data.analysis);
      setAiEnabled(data.aiEnabled);
      setStep("check");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  // A saved job: its description and analysis, straight to the check step
  const loadSavedJob = async (id) => {
    if (!id) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setDescription(data.description);
      setAnalysis(data.analysis);
      setAiEnabled(data.aiEnabled);
      setStep("check");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  // replaceJobId: an earlier version of this resume for this job to replace (null: a new one)
  const tailor = async (replaceJobId = null) => {
    setAskVersion(false);
    setStep("tailoring");
    setProgress(0);
    const timers = STEP_TIMES.map((ms, index) => setTimeout(() => setProgress(index + 1), ms));
    try {
      const { data } = await api.post("/jobs/tailor", {
        resumeId,
        job: { description, analysis },
        options: toRequestOptions(choices),
        title: choices.title.trim(),
        replaceJobId,
      });
      timers.forEach(clearTimeout);
      setProgress(TAILOR_STEPS.length);
      toast.success(data.replaced ? `Replaced "${data.resume.title}" with the new version` : `Tailored copy saved as "${data.resume.title}"`);
      navigate(`/tailor/jobs/${data.jobId}`);
    } catch (error) {
      timers.forEach(clearTimeout);
      toast.error(getErrorMessage(error));
      setStep("check");
    }
  };

  if (resumes === null) return <Loader text="Loading your resumes..." />;

  return (
    <div className={pageClass()}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Target className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tailor to a job</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">A copy of your resume aimed at one job. Your original stays as it is.</p>
        </div>
      </div>
      <HonestNote />
      <Steps current={step === "input" ? 0 : step === "check" ? 1 : 2} />

      {step === "input" && (
        <section className="card mt-6 space-y-5 p-5 sm:p-6" aria-labelledby="step-input">
          <h2 id="step-input" className="font-semibold text-slate-900 dark:text-white">
            1. The job and your resume
          </h2>

          {jobs.length > 0 && (
            <div>
              <label htmlFor="saved-job" className="label">
                Use a saved job <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <select id="saved-job" className="input" defaultValue="" onChange={(event) => loadSavedJob(event.target.value)} disabled={busy}>
                <option value="">Paste a new job description below</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {jobTitleOf(job)} · {job.score}% · {fitTone(job.score).label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="job-description" className="label">
              Job description
            </label>
            <textarea
              id="job-description"
              rows={10}
              className="input"
              placeholder="Paste the whole job ad: the role, what you'd do and the requirements."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              {words < MIN_JOB_WORDS ? `${words} words. Paste the full description (at least ${MIN_JOB_WORDS} words).` : `${words} words`}
            </p>
          </div>

          <div>
            <label htmlFor="base-resume" className="label">
              Resume to tailor
            </label>
            {resumes.length ? (
              <select id="base-resume" className="input" value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
                {resumes.map((resume) => (
                  <option key={resume._id} value={resume._id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You don't have a resume yet. <Link to="/dashboard" className="font-medium text-indigo-600 dark:text-indigo-400">Create one first</Link>.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={analyze} disabled={!canAnalyze} className="btn-primary">
              {busy ? "Reading the job..." : "Analyze job"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {step === "check" && analysis && (
        <AnalysisCheck
          analysis={analysis}
          onChange={setAnalysis}
          aiEnabled={aiEnabled}
          resume={resumes.find((resume) => resume._id === resumeId)}
          options={options}
          choices={choices}
          onChoices={(patch) => setChoices((current) => ({ ...current, ...patch }))}
          onUseResume={setResumeId}
          onBack={() => setStep("input")}
          onTailor={() => (options?.existingVersions.length ? setAskVersion(true) : tailor())}
        />
      )}
      {askVersion && options && <VersionChoice versions={options.existingVersions} onReplace={() => tailor(options.existingVersions[0].jobId)} onNew={() => tailor()} onCancel={() => setAskVersion(false)} />}

      {step === "tailoring" && <TailorProgress step={progress} />}

      {step === "input" && <SavedJobs jobs={jobs} />}
    </div>
  );
}

function HonestNote() {
  return (
    <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200" data-testid="honest-note">
      {HONEST_NOTE}
    </p>
  );
}

function AiOffNote() {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" data-testid="ai-off-note">
      {AI_OFF_NOTE}
    </p>
  );
}

function Steps({ current }) {
  const labels = ["Job and resume", "Check the analysis", "Match report"];
  return (
    <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Steps">
      {labels.map((label, index) => (
        <li key={label} className={`flex items-center gap-2 ${index === current ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`} aria-current={index === current ? "step" : undefined}>
          <span
            className={`grid size-6 place-items-center rounded-full text-xs ${
              index < current ? "bg-emerald-500 text-white" : index === current ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {index < current ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

// Step 2: the analysis, editable before tailoring, and the options
function AnalysisCheck({ analysis, onChange, aiEnabled, resume, options, choices, onChoices, onUseResume, onBack, onTailor }) {
  const move = (skill, from, to) => onChange({ ...analysis, [from]: analysis[from].filter((s) => s !== skill), [to]: [...analysis[to], skill] });
  const remove = (skill, from) => onChange({ ...analysis, [from]: analysis[from].filter((s) => s !== skill) });
  const nothingLeft = !analysis.mustHave.length && !analysis.niceToHave.length;

  return (
    <section className="card mt-6 space-y-6 p-5 sm:p-6" aria-labelledby="step-check">
      <div>
        <h2 id="step-check" className="font-semibold text-slate-900 dark:text-white">
          2. Check what we found
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Move a skill if we put it in the wrong list, or remove one the job doesn't really need.</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          ["Job title", analysis.title],
          ["Company", analysis.company],
          ["Seniority", analysis.seniority && analysis.seniority[0].toUpperCase() + analysis.seniority.slice(1)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-slate-500 uppercase dark:text-slate-400">{label}</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-white">{value || <span className="text-slate-400">Not stated</span>}</dd>
          </div>
        ))}
      </dl>

      <SkillGroup
        title="Must-have skills"
        testId="must-have"
        skills={analysis.mustHave}
        moveLabel="Move to nice-to-have"
        onMove={(skill) => move(skill, "mustHave", "niceToHave")}
        onRemove={(skill) => remove(skill, "mustHave")}
        tone="must"
      />
      <SkillGroup
        title="Nice-to-have skills"
        testId="nice-to-have"
        skills={analysis.niceToHave}
        moveLabel="Move to must-have"
        onMove={(skill) => move(skill, "niceToHave", "mustHave")}
        onRemove={(skill) => remove(skill, "niceToHave")}
        tone="nice"
      />

      {analysis.responsibilities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Key responsibilities</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {analysis.responsibilities.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {aiEnabled === false && <AiOffNote />}
      {resume && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tailoring <span className="font-medium text-slate-900 dark:text-white">{resume.title}</span>
        </p>
      )}
      {options?.tailoredFrom && <TailoredCopyWarning base={options.tailoredFrom} onUse={onUseResume} />}
      {options && choices ? <TailorOptions options={options} choices={choices} onChange={onChoices} aiEnabled={aiEnabled !== false} /> : <p className="text-sm text-slate-500 dark:text-slate-400">Loading the options...</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button type="button" onClick={onTailor} disabled={nothingLeft || !choices} className="btn-primary">
          Tailor my resume
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// The chosen resume is itself a tailored copy: suggest its base resume instead
function TailoredCopyWarning({ base, onUse }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="alert" data-testid="tailored-copy-warning">
      <p>
        This resume is already a tailored copy{base.title ? ` of "${base.title}"` : ""}. Tailoring it again carries over its changes (and any mistakes in them), so it's best to start from
        your base resume.
      </p>
      {base.resumeId ? (
        <button type="button" onClick={() => onUse(base.resumeId)} className="btn-secondary mt-2 px-3 py-1.5">
          Use "{base.title}" instead
        </button>
      ) : (
        <p className="mt-1">Its base resume was deleted.</p>
      )}
    </div>
  );
}

// The same resume was tailored for this job before: replace that version or add a new one
function VersionChoice({ versions, onReplace, onNew, onCancel }) {
  const latest = versions[0];
  return (
    <Modal onClose={onCancel} labelledBy="version-choice-title" className="max-w-md p-6">
      <h2 id="version-choice-title" className="text-lg font-semibold text-slate-900 dark:text-white">
        You've tailored this resume for this job before
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        "{latest.title}", {timeAgo(latest.createdAt)}
        {versions.length > 1 ? ` (and ${versions.length - 1} older ${versions.length === 2 ? "version" : "versions"})` : ""}.
      </p>
      <div className="mt-5 space-y-3">
        <button type="button" onClick={onReplace} className="w-full rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-left hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70">
          <span className="block font-medium text-indigo-800 dark:text-indigo-200">Replace the existing version</span>
          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">Same application: its cover letter and the skills you confirmed are kept.</span>
        </button>
        <button type="button" onClick={onNew} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          <span className="block font-medium text-slate-900 dark:text-white">Create a new version</span>
          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">Keep both, as separate applications.</span>
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

const TAG_TONES = {
  must: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-900",
  nice: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
};

function SkillGroup({ title, testId, skills, moveLabel, onMove, onRemove, tone }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title} <span className="font-normal text-slate-400">({skills.length})</span>
      </h3>
      {skills.length ? (
        <ul className="mt-2 flex flex-wrap gap-2" data-testid={testId}>
          {skills.map((skill) => (
            <li key={skill} className={`flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium ring-1 ${TAG_TONES[tone]}`}>
              {skill}
              <button type="button" onClick={() => onMove(skill)} className="grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label={`${moveLabel}: ${skill}`} title={moveLabel}>
                {tone === "must" ? <Minus className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => onRemove(skill)} className="grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label={`Remove ${skill}`} title="Remove">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">None</p>
      )}
    </div>
  );
}

function TailorProgress({ step }) {
  return (
    <section className="card mx-auto mt-6 max-w-lg p-8" role="status" aria-live="polite">
      <h2 className="text-center text-lg font-semibold text-slate-900 dark:text-white">Tailoring your resume</h2>
      <ol className="mt-6 space-y-4">
        {TAILOR_STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full ${
                index < step ? "bg-emerald-500 text-white" : index === step ? "border-2 border-indigo-600 border-t-transparent motion-safe:animate-spin" : "border-2 border-slate-200 dark:border-slate-700"
              }`}
            >
              {index < step && <Check className="size-3.5" aria-hidden="true" />}
            </span>
            <span className={index <= step ? "text-slate-900 dark:text-white" : "text-slate-400"}>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SavedJobs({ jobs }) {
  if (!jobs.length) return null;
  return (
    <section className="mt-10" aria-labelledby="saved-jobs">
      <h2 id="saved-jobs" className="text-lg font-semibold text-slate-900 dark:text-white">
        Saved jobs
      </h2>
      <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900" data-testid="saved-jobs">
        {jobs.map((job) => (
          <li key={job._id} className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <Link to={`/tailor/jobs/${job._id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900 dark:text-white">{job.title || "Untitled job"}</span>
                <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
                  {job.company || "Company not stated"} · {timeAgo(job.createdAt)}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${fitTone(job.score).badge}`}>
                {job.score}% · {fitTone(job.score).label}
              </span>
            </Link>
            <Link
              to={job.coverLetterId ? `/cover-letters/${job.coverLetterId}` : `/cover-letters/new?job=${job._id}`}
              className="mr-4 shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {job.coverLetterId ? "Cover letter" : "Write cover letter"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Step 3: the match report ----------

function JobReport({ jobId }) {
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [failed, setFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // scope "resume": only the tailored resume; "application": the job, resume and cover letters
  const remove = async (scope) => {
    setDeleting(true);
    try {
      if (scope === "resume") await api.delete(`/resumes/${job.tailoredResumeId}`);
      else await api.delete(`/jobs/${job._id}`);
      toast.success(scope === "resume" ? "Tailored resume deleted" : "Application deleted");
      navigate("/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleting(false);
    }
  };
  usePageTitle(job ? `${jobTitleOf(job.analysis)} · Match` : "Match report");

  useEffect(() => {
    api
      .get(`/jobs/${jobId}`)
      .then(({ data }) => setJob(data))
      .catch((error) => {
        setFailed(true);
        toast.error(getErrorMessage(error));
      });
  }, [jobId]);

  if (failed) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <p className="font-medium text-slate-900 dark:text-white">We couldn't open this job.</p>
        <Link to="/tailor" className="btn-primary mt-6">
          Tailor to a job
        </Link>
      </div>
    );
  }
  if (!job) return <Loader text="Opening your match report..." />;

  const report = job.matchReport;
  const setReport = (matchReport, changes = {}) => setJob((previous) => ({ ...previous, matchReport, ...changes }));

  return (
    <div className={pageClass()}>
      <Link to="/tailor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tailor to a job
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{jobTitleOf(job.analysis)}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tailored copy: {job.tailoredResume?.title ?? "deleted"} · {timeAgo(job.createdAt)}
          </p>
        </div>
        {job.tailoredResume && (
          <div className="flex flex-wrap gap-2">
            <Link to={job.coverLetterId ? `/cover-letters/${job.coverLetterId}` : `/cover-letters/new?job=${job._id}`} className="btn-secondary">
              {job.coverLetterId ? "Open cover letter" : "Write cover letter"}
            </Link>
            <Link to={`/ats/review/${job.tailoredResumeId}`} className="btn-secondary">
              Review changes
            </Link>
            <Link to={`/editor/${job.tailoredResumeId}`} className="btn-primary">
              Open in editor
            </Link>
            <button type="button" onClick={() => setDeleteOpen(true)} className="btn-secondary text-red-600 hover:border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/50">
              Delete
            </button>
          </div>
        )}
      </div>
      <HonestNote />
      <TailoringNote tailoring={job.tailoring} aiEnabled={job.aiEnabled} />
      {job.tailoring?.differences && <Differences differences={job.tailoring.differences} />}
      <DeleteApplicationModal open={deleteOpen} name={job.tailoredResume?.title ?? jobTitleOf(job.analysis)} onChoose={remove} onCancel={() => setDeleteOpen(false)} loading={deleting} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="card p-6" aria-label="Match">
          <div data-testid="match-score" data-score={report.score}>
            <ScoreRing key={report.score} score={report.score} grade={fitTone(report.score).label} label="Match" unit="% match" toneFor={fitTone} />
          </div>
          <Breakdown report={report} />
        </section>

        <div className="space-y-6">
          <MatchedSkills matched={report.matched} />
          <MissingSkills job={job} onReport={setReport} />
        </div>
      </div>

      <details id="job-description" className="card mt-6 p-5" open={window.location.hash === "#job-description"}>
        <summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">Job description</summary>
        <p className="mt-3 text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{job.description}</p>
      </details>
    </div>
  );
}

// How this copy was tailored: AI or rules only, the strength, and the generated lines the
// safety check dropped (with why). Jobs tailored before this was saved have no tailoring.
function TailoringNote({ tailoring, aiEnabled }) {
  if (!tailoring) return aiEnabled === false ? <div className="mt-4"><AiOffNote /></div> : null;
  if (tailoring.tailoredWith !== "rules+ai") return <div className="mt-4"><AiOffNote /></div>;
  const dropped = tailoring.rejectedRewrites ?? [];
  const strength = STRENGTHS.find((option) => option.value === tailoring.strength)?.label ?? "Balanced";
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" data-testid="tailoring-note">
      <p>
        Tailored with AI · {strength} ·{" "}
        <span data-testid="rewrites-dropped" data-count={dropped.length}>
          {dropped.length === 1 ? "1 rewrite" : `${dropped.length} rewrites`} dropped by the safety check
        </span>
      </p>
      {dropped.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Why they were dropped</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {dropped.map((item, index) => (
              <li key={index}>
                <span className="font-medium capitalize">{item.section}</span>: {item.problem}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// "How this version differs": the changes by type, and a warning (with why) when the tailored
// copy is nearly the same as the base resume
function Differences({ differences }) {
  const percent = Math.round(differences.changedShare * 100);
  return (
    <section className="card mt-4 p-5" aria-labelledby="differences" data-testid="differences">
      <h2 id="differences" className="font-semibold text-slate-900 dark:text-white">
        How this version differs
      </h2>
      {differences.nearlyIdentical && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="alert" data-testid="nearly-identical">
          <p className="font-medium">This version is nearly identical to your base resume ({percent}% of its words changed).</p>
          <ul className="mt-1 list-disc pl-5">
            {differences.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      {differences.byType.length ? (
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {differences.byType.map((entry) => (
            <li key={entry.type} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-slate-700 dark:text-slate-300">{entry.label}</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{entry.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No changes were made.</p>
      )}
      {!differences.nearlyIdentical && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{percent}% of the words differ from your base resume (reordering not counted).</p>}
    </section>
  );
}

function Breakdown({ report }) {
  const count = (required) => {
    const matched = report.matched.filter((m) => m.required === required).length;
    const missing = (required ? report.missingMustHave : report.missingNiceToHave).length;
    return { matched, total: matched + missing };
  };
  const rows = [
    ["Must-haves", count(true), "bg-indigo-600"],
    ["Nice-to-haves", count(false), "bg-slate-400"],
  ];
  return (
    <dl className="mt-6 space-y-3" data-testid="breakdown">
      {rows.map(([label, { matched, total }, color]) => (
        <div key={label}>
          <div className="flex justify-between text-sm">
            <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {matched} of {total}
            </dd>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(matched / total) * 100}%` : 0 }} />
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">Must-haves count three times as much as nice-to-haves.</p>
    </dl>
  );
}

// Matched skills; the evidence quote shows on hover and keyboard focus
function MatchedSkills({ matched }) {
  return (
    <section className="card p-5" aria-labelledby="matched-skills">
      <h2 id="matched-skills" className="font-semibold text-slate-900 dark:text-white">
        Skills your resume shows ({matched.length})
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hover or focus a skill to see where.</p>
      {matched.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" data-testid="matched-skills">
          {matched.map((item) => (
            <li key={item.skill} className="group relative">
              <span
                tabIndex={0}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900"
                title={`${item.evidence.section}: "${item.evidence.text}"`}
                aria-describedby={`evidence-${item.skill}`}
                data-skill={item.skill}
              >
                <Check className="size-3.5" aria-hidden="true" />
                {item.skill}
                {item.required && <span className="sr-only">(must-have)</span>}
              </span>
              <span
                id={`evidence-${item.skill}`}
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-72 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-focus-within:block group-hover:block dark:bg-slate-700"
              >
                <span className="block font-semibold">{item.evidence.section[0].toUpperCase() + item.evidence.section.slice(1)}</span>
                <span className="mt-0.5 block">"{item.evidence.text}"</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">None of the job's skills appear in your resume yet.</p>
      )}
    </section>
  );
}

function MissingSkills({ job, onReport }) {
  const { missingMustHave, missingNiceToHave } = job.matchReport;
  const missing = [...missingMustHave.map((skill) => ({ skill, required: true })), ...missingNiceToHave.map((skill) => ({ skill, required: false }))];
  const [open, setOpen] = useState(null); // The skill whose "I have this skill" form is open

  const decline = async (skill) => {
    try {
      const { data } = await api.post(`/jobs/${job._id}/decline-skill`, { skill });
      onReport(job.matchReport, { declinedSkills: data.declinedSkills });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <section className="card p-5" aria-labelledby="missing-skills">
      <h2 id="missing-skills" className="font-semibold text-slate-900 dark:text-white">
        Skills the job asks for that your resume doesn't show ({missing.length})
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Nothing is added unless you say you have it. If you don't, it's a good list of what to learn next.
      </p>
      {missing.length ? (
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800" data-testid="missing-skills">
          {missing.map(({ skill, required }) => {
            const declined = job.declinedSkills.includes(skill);
            return (
              <li key={skill} className="py-3" data-skill={skill}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{skill}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${required ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {required ? "Must-have" : "Nice-to-have"}
                    </span>
                    {declined && <span className="text-xs text-slate-500 dark:text-slate-400">You don't have this yet</span>}
                  </div>
                  {open !== skill && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOpen(skill)} className="btn-secondary px-3 py-1.5">
                        I have this skill
                      </button>
                      {!declined && (
                        <button type="button" onClick={() => decline(skill)} className="btn-secondary px-3 py-1.5">
                          I don't have this
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {open === skill && (
                  <ConfirmSkillForm
                    job={job}
                    skill={skill}
                    onCancel={() => setOpen(null)}
                    onConfirmed={(matchReport) => {
                      setOpen(null);
                      onReport(matchReport, { declinedSkills: job.declinedSkills.filter((s) => s !== skill) });
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Your resume shows every skill this job lists.</p>
      )}
    </section>
  );
}

// "I have this skill": where it was used, a short note, and whether to add a bullet too
function ConfirmSkillForm({ job, skill, onCancel, onConfirmed }) {
  const [where, setWhere] = useState(""); // "job:<id>", "project:<name>" or "other"
  const [note, setNote] = useState("");
  const [placement, setPlacement] = useState("skills");
  const [bullet, setBullet] = useState("");
  const [bulletEdited, setBulletEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useMemo(() => skill.replace(/\W+/g, "-").toLowerCase(), [skill]);

  // The bullet draft follows the note until the user edits it
  const draft = note.trim() ? `${note.trim()[0].toUpperCase()}${note.trim().slice(1)}`.replace(/[.\s]+$/, "") : "";
  const bulletText = bulletEdited ? bullet : draft;
  const canBullet = where && where !== "other";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const [type, ...rest] = where.split(":");
    const body = { jobId: job._id, skill, note, placement: canBullet ? placement : "skills" };
    if (body.placement === "bullet") Object.assign(body, { target: { type, id: rest.join(":") }, bullet: bulletText });
    setSaving(true);
    try {
      const { data } = await api.post("/jobs/confirm-skill", body);
      toast.success(body.placement === "bullet" ? `${skill} added to Skills and as a bullet` : `${skill} added to Skills`);
      onConfirmed(data.matchReport);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50" aria-label={`Confirm ${skill}`}>
      <div>
        <label htmlFor={`where-${id}`} className="label">
          Where did you use {skill}?
        </label>
        <select id={`where-${id}`} className="input" value={where} onChange={(event) => setWhere(event.target.value)} required>
          <option value="" disabled>
            Choose a job or project
          </option>
          {job.places.jobs.length > 0 && (
            <optgroup label="Jobs">
              {job.places.jobs.map((place) => (
                <option key={place.id} value={`job:${place.id}`}>
                  {place.label}
                </option>
              ))}
            </optgroup>
          )}
          {job.places.projects.length > 0 && (
            <optgroup label="Projects">
              {job.places.projects.map((place) => (
                <option key={place.id} value={`project:${place.id}`}>
                  {place.label}
                </option>
              ))}
            </optgroup>
          )}
          <option value="other">Other (a course, side work...)</option>
        </select>
      </div>
      <div>
        <label htmlFor={`note-${id}`} className="label">
          A short note on how you used it
        </label>
        <textarea id={`note-${id}`} rows={2} className="input" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder={`e.g. Ran our services on ${skill} in production`} required />
      </div>

      <fieldset>
        <legend className="label">What should we add?</legend>
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2">
            <input type="radio" name={`placement-${id}`} value="skills" checked={!canBullet || placement === "skills"} onChange={() => setPlacement("skills")} />
            Add to Skills only
          </label>
          <label className={`flex items-center gap-2 ${canBullet ? "" : "opacity-60"}`}>
            <input type="radio" name={`placement-${id}`} value="bullet" checked={canBullet && placement === "bullet"} disabled={!canBullet} onChange={() => setPlacement("bullet")} />
            Also add a bullet{!canBullet && where === "other" ? " (choose a job or project for it)" : ""}
          </label>
        </div>
      </fieldset>

      {canBullet && placement === "bullet" && (
        <div>
          <label htmlFor={`bullet-${id}`} className="label">
            The bullet (edit it to read well)
          </label>
          <textarea
            id={`bullet-${id}`}
            rows={2}
            className="input"
            maxLength={300}
            value={bulletText}
            onChange={(event) => {
              setBulletEdited(true);
              setBullet(event.target.value);
            }}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Keep to what's true: numbers and tools must come from your note or resume.</p>
        </div>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving || !where || !note.trim()} className="btn-primary">
          {saving ? "Adding..." : "Add it"}
        </button>
      </div>
    </form>
  );
}
