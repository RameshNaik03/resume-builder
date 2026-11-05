import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, Upload, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";
import getErrorMessage from "../utils/getErrorMessage";
import { ACCEPT_ATTRIBUTE, MAX_SIZE_MB, setPendingImport, toUploadFile, validateFile } from "../utils/resumeFile";
import Modal from "../components/Modal";
import AnalyzeProgress from "../components/ats/AnalyzeProgress";
import { ANALYZE_STEPS } from "../components/ats/atsHelpers";
import AtsResults, { Disclaimer } from "../components/ats/AtsResults";
import { pageClass } from "../components/ui/pageLayout";

const MIN_JOB_WORDS = 30; // Same minimum as the server (when a job description is given)
const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// When each progress step starts (ms after clicking Analyze). The last step stays
// in progress until the server answers.
const STEP_TIMES = [700, 1600, 2500];
const STEP_TICK_MS = 250; // Pause per step when ticking off the rest after the answer arrives

// ---------- Input: resume source ----------

function FileDrop({ file, onFile, error }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const pick = (files) => {
    if (files.length > 1) return onFile(null, "Please choose just one file.");
    if (files[0]) onFile(files[0], validateFile(files[0]));
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null, "")}
          aria-label="Remove file"
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          pick(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60"
            : "border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30"
        }`}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Upload className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 font-medium text-slate-900 dark:text-white">
          {isDragging ? "Drop your file here" : "Drag and drop your resume"}
        </p>
        <button type="button" onClick={() => inputRef.current.click()} className="btn-secondary mt-3">
          Choose file
        </button>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">PDF or DOCX, up to {MAX_SIZE_MB} MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = ""; // Allow choosing the same file again
          }}
        />
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function SavedResumePicker({ resumes, loading, selectedId, onSelect }) {
  if (loading) return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading your resumes...</p>;
  if (!resumes.length) {
    return (
      <p className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        You don't have any saved resumes yet. Upload a file instead, or{" "}
        <Link to="/dashboard" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          create one
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto" role="radiogroup" aria-label="Saved resumes">
      {resumes.map((resume) => {
        const selected = resume._id === selectedId;
        return (
          <li key={resume._id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(resume._id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-950/50"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              }`}
            >
              <FileText className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{resume.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Shown to guests who click "Generate an ATS-friendly version"
function SignUpPrompt({ onClose, onContinue }) {
  return (
    <Modal onClose={onClose} labelledBy="signup-prompt-title" className="max-w-md p-6">
      <h2 id="signup-prompt-title" className="text-lg font-semibold text-slate-900 dark:text-white">
        Create a free account to continue
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Sign up or log in and we'll import the resume you just checked into the editor. Pick one of the single-column
        Basic templates there for the most ATS-friendly result.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => onContinue("/login")} className="btn-secondary">
          Log in
        </button>
        <button type="button" onClick={() => onContinue("/register")} className="btn-primary">
          Sign up free
        </button>
      </div>
    </Modal>
  );
}

// ---------- Page ----------

export default function AtsChecker() {
  usePageTitle("ATS Resume Checker");
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const [sourceTab, setSourceTab] = useState("upload"); // "upload" | "saved"
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [savedResumes, setSavedResumes] = useState(null); // null until loaded
  const [resumeId, setResumeId] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const [step, setStep] = useState(-1); // Progress step while analyzing; -1 = not analyzing
  const stepRef = useRef(-1); // The same step, readable inside handleAnalyze while it awaits
  const goToStep = (value) => {
    stepRef.current = Math.max(stepRef.current, value); // Steps only move forward
    setStep(stepRef.current);
  };
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [analyzedJobDescription, setAnalyzedJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  // Logged-in users can pick one of their saved resumes
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    api
      .get("/resumes")
      .then(({ data }) => !ignore && setSavedResumes(data))
      .catch(() => !ignore && setSavedResumes([]));
    return () => {
      ignore = true;
    };
  }, [user]);

  const analyzing = step >= 0;
  const usingSaved = Boolean(user) && sourceTab === "saved";
  const hasResume = usingSaved ? Boolean(resumeId) : Boolean(file) && !fileError;
  const jobWords = countWords(jobDescription);
  const jobTooShort = jobWords > 0 && jobWords < MIN_JOB_WORDS; // Empty is fine: it's optional
  const canAnalyze = hasResume && !jobTooShort && !analyzing;

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!canAnalyze) return;

    setError("");
    stepRef.current = -1;
    goToStep(0);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    const timers = STEP_TIMES.map((ms, index) => setTimeout(() => goToStep(index + 1), ms));

    const formData = new FormData();
    if (jobWords) formData.append("jobDescription", jobDescription);
    setAnalyzedJobDescription(jobWords ? jobDescription : ""); // The optimizer uses the same one
    if (usingSaved) formData.append("resumeId", resumeId);
    else formData.append("file", toUploadFile(file));

    try {
      const { data } = await api.post("/ats/analyze", formData);
      timers.forEach(clearTimeout);
      // A fast answer: tick off the remaining steps one by one, then show the results
      while (stepRef.current < ANALYZE_STEPS.length) {
        goToStep(stepRef.current + 1);
        if (!reducedMotion) await wait(STEP_TICK_MS);
      }
      setResult(data);
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(getErrorMessage(err));
    } finally {
      stepRef.current = -1;
      setStep(-1);
    }
  };

  // The optimizer saves an improved copy (the original is never changed), then the review
  // screen shows each change to accept or reject
  const handleGenerate = async () => {
    if (!user) {
      setShowSignUpPrompt(true);
      return;
    }
    setGenerating(true);
    const source =
      result.source.type === "saved"
        ? { resumeId: result.source.resumeId }
        : {
            parsedResume: result.parsedResume,
            fileName: result.file.name,
            headerFooterText: result.headerFooterText,
            originalScore: result.score,
          };
    try {
      const { data } = await api.post("/ats/optimize", {
        ...source,
        failedChecks: result.checks.filter((check) => !check.passed).map((check) => check.id),
        jobDescription: analyzedJobDescription,
      });
      // Next: the review screen (changes to accept or reject); the same data is saved on the resume
      navigate(`/ats/review/${data.resume._id}`, { state: { optimization: data } });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setGenerating(false);
    }
  };

  // Guests: remember the file, then sign up / log in. The dashboard imports it afterwards.
  const continueToAuth = (path) => {
    setPendingImport(file);
    navigate(path);
  };

  if (analyzing) {
    return (
      <div className="px-4 py-16 sm:px-6">
        <AnalyzeProgress
          step={step}
          fileName={usingSaved ? savedResumes?.find((r) => r._id === resumeId)?.title : file?.name}
        />
      </div>
    );
  }

  if (result) {
    return (
      <>
        <AtsResults result={result} onReset={() => setResult(null)} onGenerate={handleGenerate} generating={generating} />
        {showSignUpPrompt && <SignUpPrompt onClose={() => setShowSignUpPrompt(false)} onContinue={continueToAuth} />}
      </>
    );
  }

  // ---------- Input view ----------
  return (
    <div className={pageClass()}>
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Free ATS check
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Can an ATS read your resume?
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Get a score out of 100 with every check explained: layout, structure, content, keywords and polish. Add a job
          description to see which keywords you're missing. We don't save your file; it's only read for this check.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mt-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: resume */}
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white">1. Your resume</h2>
            {user && (
              <div className="mt-4 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
                {[
                  ["upload", "Upload a file"],
                  ["saved", "My resumes"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === id}
                    onClick={() => setSourceTab(id)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      sourceTab === id
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4">
              {usingSaved ? (
                <SavedResumePicker
                  resumes={savedResumes ?? []}
                  loading={savedResumes === null}
                  selectedId={resumeId}
                  onSelect={setResumeId}
                />
              ) : (
                <FileDrop
                  file={file}
                  error={fileError}
                  onFile={(nextFile, problem) => {
                    setFile(problem ? null : nextFile);
                    setFileError(problem ?? "");
                  }}
                />
              )}
            </div>
            {!user && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Log in
                </Link>{" "}
                to check one of your saved resumes instead.
              </p>
            )}
          </section>

          {/* Right: job description (optional) */}
          <section className="card flex flex-col p-6">
            <label htmlFor="job-description" className="font-semibold text-slate-900 dark:text-white">
              2. Paste job description{" "}
              <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
            </label>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Adds a keyword match against the job. Without it, we check for a clear, specific skills section instead.
            </p>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting here, including the responsibilities and requirements..."
              className="input mt-4 min-h-60 flex-1 resize-y leading-relaxed"
              maxLength={20000}
              aria-describedby="job-description-count"
            />
            <p
              id="job-description-count"
              className={`mt-2 text-right text-xs ${jobTooShort ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}
            >
              {jobTooShort
                ? `${MIN_JOB_WORDS - jobWords} more words needed, or leave it empty`
                : jobWords
                  ? `${jobWords} words`
                  : "Optional"}
            </p>
          </section>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="w-full sm:max-w-xl">
            <Disclaimer />
          </div>
          <button type="submit" disabled={!canAnalyze} className="btn-primary w-full px-7 py-3 text-base sm:w-auto">
            Analyze my resume
            <ArrowRight className="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
