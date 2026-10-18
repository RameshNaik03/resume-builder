import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Lightbulb,
  PenLine,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { ACCEPT_ATTRIBUTE, MAX_SIZE_MB, setPendingImport, toUploadFile, validateFile } from "../utils/resumeFile";
import ImportResumeModal from "../components/ImportResumeModal";
import Modal from "../components/Modal";

const MIN_JOB_WORDS = 30; // Same minimum as the server
const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

const PRIORITY_STYLES = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        These results are guidance, not a guarantee. Every company uses different ATS software and settings, and a
        person usually makes the final decision. Only add skills and experience you really have.
      </span>
    </p>
  );
}

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

// ---------- Results ----------

function ScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const tone =
    score >= 75
      ? { label: "Strong match", stroke: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
      : score >= 50
        ? { label: "Fair match", stroke: "stroke-amber-500", text: "text-amber-600 dark:text-amber-400" }
        : { label: "Low match", stroke: "stroke-rose-500", text: "text-rose-600 dark:text-rose-400" };

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-44" role="img" aria-label={`Match score ${score} out of 100: ${tone.label}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
            className={`${tone.stroke} transition-[stroke-dashoffset] duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="font-display text-5xl font-extrabold text-slate-900 dark:text-white">{score}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">out of 100</span>
        </div>
      </div>
      <p className={`mt-3 font-semibold ${tone.text}`}>{tone.label}</p>
    </div>
  );
}

function KeywordTags({ title, keywords, tone, emptyText }) {
  const styles =
    tone === "matched"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
      : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300";
  const Icon = tone === "matched" ? CheckCircle2 : XCircle;

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Icon className={`size-5 ${tone === "matched" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} aria-hidden="true" />
        {title}
        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({keywords.length})</span>
      </h2>
      {keywords.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <li
              key={keyword.term}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${styles}`}
              title={keyword.required ? "Listed in the job's requirements" : undefined}
            >
              {keyword.term}
              {keyword.required && (
                <>
                  <span aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}

function Suggestions({ result }) {
  const { ai, suggestions } = result;

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Lightbulb className="size-5 text-amber-500" aria-hidden="true" />
        Suggestions
      </h2>

      {ai?.summary && (
        <p className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">
          {ai.summary}
        </p>
      )}

      {ai?.missingSkills.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top missing skills</h3>
          <ul className="mt-2 space-y-2">
            {ai.missingSkills.map((item) => (
              <li key={item.skill} className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{item.skill}</span>: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ai?.weakBullets.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Bullet points to strengthen</h3>
          <ul className="mt-3 space-y-4">
            {ai.weakBullets.map((bullet) => (
              <li key={bullet.original} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Before</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{bullet.original}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Suggested
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{bullet.rewrite}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{bullet.reason}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Replace anything in [brackets] with your real numbers, or leave it out.
          </p>
        </div>
      )}

      {ai?.formattingIssues.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Formatting issues</h3>
          <ul className="mt-2 space-y-3">
            {ai.formattingIssues.map((item) => (
              <li key={item.issue} className="flex gap-2 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-white">{item.issue}</span> {item.fix}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6">
          {ai && <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick checks</h3>}
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.map((item) => (
              <li key={item.title} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-3">
                <span className={`h-fit w-fit rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[item.priority]}`}>
                  {item.priority}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!ai && !suggestions.length && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nothing obvious to fix. Nice work!</p>
      )}
    </section>
  );
}

// Shown to guests who click "Fix it in the editor"
function SignUpPrompt({ onClose, onContinue }) {
  return (
    <Modal onClose={onClose} labelledBy="signup-prompt-title" className="max-w-md p-6">
      <h2 id="signup-prompt-title" className="text-lg font-semibold text-slate-900 dark:text-white">
        Create a free account to edit your resume
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Sign up or log in and we'll import the resume you just checked straight into the editor, so you can fix
        it with your results in mind.
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

  const [sourceTab, setSourceTab] = useState("upload"); // "upload" | "saved"
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [savedResumes, setSavedResumes] = useState(null); // null until loaded
  const [resumeId, setResumeId] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [importFile, setImportFile] = useState(null); // Logged-in user importing the checked file

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

  const usingSaved = Boolean(user) && sourceTab === "saved";
  const hasResume = usingSaved ? Boolean(resumeId) : Boolean(file) && !fileError;
  const jobWords = countWords(jobDescription);
  const canCheck = hasResume && jobWords >= MIN_JOB_WORDS && !checking;

  const handleCheck = async (event) => {
    event.preventDefault();
    if (!canCheck) return;

    setChecking(true);
    setError("");
    const formData = new FormData();
    formData.append("jobDescription", jobDescription);
    if (usingSaved) formData.append("resumeId", resumeId);
    else formData.append("file", toUploadFile(file));

    try {
      const { data } = await api.post("/ats/check", formData);
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const handleFix = () => {
    if (result.source.type === "saved") {
      navigate(`/editor/${result.source.resumeId}`);
    } else if (user) {
      setImportFile(file);
    } else {
      setShowSignUpPrompt(true);
    }
  };

  // Guests: remember the file, then sign up / log in. The dashboard imports it afterwards.
  const continueToAuth = (path) => {
    setPendingImport(file);
    navigate(path);
  };

  // ---------- Results view ----------
  if (result) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => setResult(null)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Check another job
        </button>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <section className="card flex flex-col items-center p-6 text-center">
              <h1 className="sr-only">Your ATS results</h1>
              <ScoreRing score={result.score} />
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                {result.matchedKeywords.length} of {result.matchedKeywords.length + result.missingKeywords.length}{" "}
                keywords from the job found in{" "}
                <span className="font-medium text-slate-900 dark:text-white">
                  {result.source.type === "saved" ? result.source.title : result.source.fileName}
                </span>
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {result.analyzedWith === "ai" ? (
                  <>
                    <Sparkles className="size-3.5" aria-hidden="true" /> Keyword match + AI feedback
                  </>
                ) : (
                  "Keyword match"
                )}
              </span>
              <button type="button" onClick={handleFix} className="btn-primary mt-6 w-full py-2.5">
                <PenLine className="size-4" aria-hidden="true" />
                Fix it in the editor
              </button>
            </section>
            <Disclaimer />
          </div>

          <div className="min-w-0 space-y-6">
            <KeywordTags
              title="Missing keywords"
              keywords={result.missingKeywords}
              tone="missing"
              emptyText="Your resume covers every keyword we found in this job description."
            />
            <KeywordTags
              title="Matched keywords"
              keywords={result.matchedKeywords}
              tone="matched"
              emptyText="None of the job's keywords appear in your resume yet."
            />
            {[...result.missingKeywords, ...result.matchedKeywords].some((k) => k.required) && (
              <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">* Listed in the job's requirements</p>
            )}
            <Suggestions result={result} />
          </div>
        </div>

        {showSignUpPrompt && (
          <SignUpPrompt onClose={() => setShowSignUpPrompt(false)} onContinue={continueToAuth} />
        )}
        {importFile && (
          <ImportResumeModal
            initialFile={importFile}
            onClose={() => setImportFile(null)}
            onStartFromScratch={() => navigate("/dashboard")}
          />
        )}
      </div>
    );
  }

  // ---------- Input view ----------
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Free ATS check
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          How well does your resume match the job?
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Add your resume and paste a job description. We'll show which keywords you're missing and what to improve.
          We don't save your file; it's only read for this check.
        </p>
      </div>

      <form onSubmit={handleCheck} className="mt-8">
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

          {/* Right: job description */}
          <section className="card flex flex-col p-6">
            <label htmlFor="job-description" className="font-semibold text-slate-900 dark:text-white">
              2. Job description
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting here, including the responsibilities and requirements..."
              className="input mt-4 min-h-72 flex-1 resize-y leading-relaxed"
              maxLength={20000}
            />
            <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
              {jobWords < MIN_JOB_WORDS && jobWords > 0
                ? `${MIN_JOB_WORDS - jobWords} more words needed`
                : `${jobWords} words`}
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
          <button type="submit" disabled={!canCheck} className="btn-primary w-full px-7 py-3 text-base sm:w-auto">
            {checking ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Checking...
              </>
            ) : (
              <>
                Check My Resume
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
        {checking && (
          <p className="mt-3 text-center text-sm text-slate-500 sm:text-right dark:text-slate-400" aria-live="polite">
            Reading your resume and comparing it with the job. This can take up to a minute.
          </p>
        )}
      </form>
    </div>
  );
}
