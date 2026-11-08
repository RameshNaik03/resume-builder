import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";
import getErrorMessage from "../utils/getErrorMessage";
import { setPendingImport, toUploadFile, validateFile } from "../utils/resumeFile";
import AnalyzeProgress from "../components/ats/AnalyzeProgress";
import { ANALYZE_STEPS } from "../components/ats/atsHelpers";
import AtsResults, { Disclaimer } from "../components/ats/AtsResults";
import { pageClass } from "../components/ui/pageLayout";
import { Alert, Card, CardHeader, PageHeader } from "../components/ui/Display";
import { Textarea } from "../components/ui/Form";
import Button from "../components/ui/Button";
import Dialog from "../components/ui/Dialog";
import Tabs from "../components/ui/Tabs";
import FileDropzone from "../components/ui/FileDropzone";

const MIN_JOB_WORDS = 30; // Same minimum as the server (when a job description is given)
const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// When each progress step starts (ms after clicking Analyze). The last step stays
// in progress until the server answers.
const STEP_TIMES = [700, 1600, 2500];
const STEP_TICK_MS = 250; // Pause per step when ticking off the rest after the answer arrives

// ---------- Input: resume source ----------

function FileDrop({ file, onFile, error }) {
  const pick = (files) => {
    if (files.length > 1) return onFile(null, "Please choose just one file.");
    if (files[0]) onFile(files[0], validateFile(files[0]));
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <FileText className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate type-label text-fg">{file.name}</p>
          <p className="type-small text-fg-muted">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <Button variant="ghost" size="sm" iconOnly icon={X} onClick={() => onFile(null, "")} aria-label="Remove file" />
      </div>
    );
  }

  return (
    <>
      <FileDropzone onFiles={pick} />
      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </>
  );
}

function SavedResumePicker({ resumes, loading, selectedId, onSelect }) {
  if (loading) return <p className="py-8 text-center type-small text-fg-muted">Loading your resumes...</p>;
  if (!resumes.length) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center type-small text-fg-muted">
        You don't have any saved resumes yet. Upload a file instead, or{" "}
        <Link to="/dashboard" className="font-medium text-accent hover:underline">
          create one
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto p-0.5" role="radiogroup" aria-label="Saved resumes">
      {resumes.map((resume) => {
        const selected = resume._id === selectedId;
        return (
          <li key={resume._id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(resume._id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}
            >
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${selected ? "border-accent" : "border-line-strong"}`} aria-hidden="true">
                {selected && <span className="size-2 rounded-full bg-accent" />}
              </span>
              <span className="truncate type-label text-fg">{resume.title}</span>
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
    <Dialog
      size="sm"
      title="Create a free account to continue"
      description="Sign up or log in and we'll import the resume you just checked into the editor. Pick one of the single-column Basic templates there for the most ATS-friendly result."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => onContinue("/login")}>Log in</Button>
          <Button variant="primary" onClick={() => onContinue("/register")}>
            Sign up free
          </Button>
        </>
      }
    />
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
  // ?original=<resumeId>: check the file one of the user's resumes was imported from
  const [searchParams, setSearchParams] = useSearchParams();
  const originalOf = searchParams.get("original");
  const autoStarted = useRef(false);

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
  const originalResume = user && originalOf ? savedResumes?.find((r) => r._id === originalOf && r.original) : null;
  const usingOriginal = Boolean(originalResume);
  const usingSaved = !usingOriginal && Boolean(user) && sourceTab === "saved";
  const hasResume = usingOriginal || (usingSaved ? Boolean(resumeId) : Boolean(file) && !fileError);
  const jobWords = countWords(jobDescription);
  const jobTooShort = jobWords > 0 && jobWords < MIN_JOB_WORDS; // Empty is fine: it's optional
  const canAnalyze = hasResume && !jobTooShort && !analyzing;

  const handleAnalyze = async (event) => {
    event?.preventDefault();
    if (!canAnalyze) return;

    setError("");
    stepRef.current = -1;
    goToStep(0);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    const timers = STEP_TIMES.map((ms, index) => setTimeout(() => goToStep(index + 1), ms));

    const formData = new FormData();
    if (jobWords) formData.append("jobDescription", jobDescription);
    setAnalyzedJobDescription(jobWords ? jobDescription : ""); // The optimizer uses the same one
    if (usingOriginal) formData.append("originalOf", originalOf);
    else if (usingSaved) formData.append("resumeId", resumeId);
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

  // Opened from an original ("Check ATS score"): start the check straight away, once
  useEffect(() => {
    if (usingOriginal && !autoStarted.current) {
      autoStarted.current = true;
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the original is first known
  }, [usingOriginal]);
  const stopUsingOriginal = () => setSearchParams({}, { replace: true });

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
      <div className={pageClass()}>
        <AnalyzeProgress
          step={step}
          fileName={usingOriginal ? originalResume.original.fileName : usingSaved ? savedResumes?.find((r) => r._id === resumeId)?.title : file?.name}
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
      <PageHeader
        eyebrow="Free ATS check"
        title="Can an ATS read your resume?"
        description="Get a score out of 100 with every check explained: layout, structure, content, keywords and polish. Add a job description to see which keywords you're missing. We don't save your file; it's only read for this check."
      />

      <form onSubmit={handleAnalyze} className="mt-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: resume */}
          <Card>
            <CardHeader title="1. Your resume" />
            {usingOriginal && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3" data-testid="ats-original-source">
                <FileText className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate type-label text-fg">{originalResume.original.fileName}</p>
                  <p className="type-small text-fg-muted">Your uploaded original of "{originalResume.title}"</p>
                </div>
                <Button variant="ghost" size="sm" iconOnly icon={X} onClick={stopUsingOriginal} aria-label="Check another resume instead" />
              </div>
            )}
            {user && !usingOriginal && (
              <div className="mb-4">
                <Tabs
                  variant="segmented"
                  fullWidth
                  label="Resume source"
                  value={sourceTab}
                  onChange={setSourceTab}
                  tabs={[
                    { id: "upload", label: "Upload a file" },
                    { id: "saved", label: "My resumes" },
                  ]}
                />
              </div>
            )}
            {usingOriginal ? null : usingSaved ? (
              <SavedResumePicker resumes={savedResumes ?? []} loading={savedResumes === null} selectedId={resumeId} onSelect={setResumeId} />
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
            {!user && (
              <p className="mt-4 type-small text-fg-muted">
                <Link to="/login" className="font-medium text-accent hover:underline">
                  Log in
                </Link>{" "}
                to check one of your saved resumes instead.
              </p>
            )}
          </Card>

          {/* Right: job description (optional) */}
          <Card className="flex flex-col">
            <CardHeader title="2. Paste job description" description="Optional. Adds a keyword match against the job. Without it, we check for a clear, specific skills section instead." />
            <label htmlFor="job-description" className="sr-only">
              Job description (optional)
            </label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting here, including the responsibilities and requirements..."
              className="min-h-60 flex-1 resize-y"
              maxLength={20000}
              aria-describedby="job-description-count"
            />
            <p id="job-description-count" className={`mt-2 text-right type-small ${jobTooShort ? "text-warning" : "text-fg-muted"}`}>
              {jobTooShort ? `${MIN_JOB_WORDS - jobWords} more words needed, or leave it empty` : jobWords ? `${jobWords} words` : "Optional"}
            </p>
          </Card>
        </div>

        {error && (
          <div className="mt-6">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:max-w-xl">
            <Disclaimer />
          </div>
          <Button type="submit" variant="primary" size="lg" disabled={!canAnalyze}>
            Analyze my resume
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
