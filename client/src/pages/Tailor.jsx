import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Trash2 } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import timeAgo from "../utils/timeAgo";
import Loader from "../components/Loader";
import DeleteApplicationModal from "../components/DeleteApplicationModal";
import { fitTone } from "../components/ats/atsHelpers";
import TailorOptions from "../components/tailor/TailorOptions";
import { STRENGTHS, initialChoices, toRequestOptions } from "../components/tailor/tailorChoices";
import { pageClass } from "../components/ui/pageLayout";
import { Alert, Badge, Card, CardHeader, PageHeader } from "../components/ui/Display";
import { Field, Radio, Select, Textarea } from "../components/ui/Form";
import { ScoreRing } from "../components/ui/Meter";
import Button from "../components/ui/Button";
import BackLink from "../components/ui/BackLink";
import Dialog from "../components/ui/Dialog";
import Menu from "../components/ui/Menu";
import StepProgress from "../components/ui/StepProgress";

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
      <PageHeader title="Tailor to a job" description="A copy of your resume aimed at one job. Your original stays as it is." />
      <div className="mt-6 space-y-6">
        <HonestNote />
        <Steps current={step === "input" ? 0 : step === "check" ? 1 : 2} />

        {step === "input" && (
          <Card as="section" aria-labelledby="step-input">
            <CardHeader title={<span id="step-input">1. The job and your resume</span>} />
            <div className="space-y-5">
              {jobs.length > 0 && (
                <Field id="saved-job" label="Use a saved job" optional>
                  {(props) => (
                    <Select {...props} defaultValue="" onChange={(event) => loadSavedJob(event.target.value)} disabled={busy}>
                      <option value="">Paste a new job description below</option>
                      {jobs.map((job) => (
                        <option key={job._id} value={job._id}>
                          {jobTitleOf(job)} · {job.score}% · {fitTone(job.score).label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}

              <Field
                id="job-description"
                label="Job description"
                help={words < MIN_JOB_WORDS ? `${words} words. Paste the full description (at least ${MIN_JOB_WORDS} words).` : `${words} words`}
              >
                {(props) => (
                  <Textarea {...props} rows={10} placeholder="Paste the whole job ad: the role, what you'd do and the requirements." value={description} onChange={(event) => setDescription(event.target.value)} />
                )}
              </Field>

              {resumes.length ? (
                <Field id="base-resume" label="Resume to tailor">
                  {(props) => (
                    <Select {...props} value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
                      {resumes.map((resume) => (
                        <option key={resume._id} value={resume._id}>
                          {resume.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : (
                <Alert tone="info" title="You don't have a resume yet">
                  <Link to="/dashboard" className="font-medium text-accent hover:underline">
                    Create one first
                  </Link>
                  , then come back to tailor it.
                </Alert>
              )}

              <div className="flex justify-end">
                <Button variant="primary" onClick={analyze} disabled={!canAnalyze} loading={busy}>
                  {busy ? "Reading the job..." : "Analyze job"}
                  {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </Card>
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

        {step === "tailoring" && <StepProgress headingLevel="h2" title="Tailoring your resume" steps={TAILOR_STEPS} current={progress} />}

        {step === "input" && <SavedJobs jobs={jobs} />}
      </div>
    </div>
  );
}

function HonestNote() {
  return (
    <Alert tone="info" data-testid="honest-note">
      {HONEST_NOTE}
    </Alert>
  );
}

function AiOffNote() {
  return (
    <Alert tone="warning" role="status" data-testid="ai-off-note">
      {AI_OFF_NOTE}
    </Alert>
  );
}

// Where the user is: done steps are ticked, the current one is in the accent
function Steps({ current }) {
  const labels = ["Job and resume", "Check the analysis", "Match report"];
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Steps">
      {labels.map((label, index) => (
        <li key={label} className={`flex items-center gap-2 type-small ${index === current ? "font-medium text-fg" : "text-fg-muted"}`} aria-current={index === current ? "step" : undefined}>
          <span
            className={`grid size-6 place-items-center rounded-full text-xs font-medium ${index < current ? "bg-success-soft text-success" : index === current ? "bg-accent text-on-accent" : "bg-surface-2 text-fg-muted"}`}
            aria-hidden="true"
          >
            {index < current ? <Check className="size-3.5" /> : index + 1}
          </span>
          {label}
          {index < current && <span className="sr-only"> (done)</span>}
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
    <Card as="section" aria-labelledby="step-check">
      <CardHeader title={<span id="step-check">2. Check what we found</span>} description="Click a skill to move it to the other list, or to remove one the job doesn't really need." />

      <div className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Job title", analysis.title],
            ["Company", analysis.company],
            ["Seniority", analysis.seniority && analysis.seniority[0].toUpperCase() + analysis.seniority.slice(1)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="type-eyebrow text-fg-muted">{label}</dt>
              <dd className="mt-1 type-label text-fg">{value || <span className="font-normal text-fg-subtle">Not stated</span>}</dd>
            </div>
          ))}
        </dl>

        <SkillGroup title="Must-have skills" testId="must-have" skills={analysis.mustHave} tone="accent" moveLabel="Move to nice-to-have" onMove={(skill) => move(skill, "mustHave", "niceToHave")} onRemove={(skill) => remove(skill, "mustHave")} />
        <SkillGroup title="Nice-to-have skills" testId="nice-to-have" skills={analysis.niceToHave} tone="neutral" moveLabel="Move to must-have" onMove={(skill) => move(skill, "niceToHave", "mustHave")} onRemove={(skill) => remove(skill, "niceToHave")} />

        {analysis.responsibilities.length > 0 && (
          <div>
            <h3 className="type-label text-fg">Key responsibilities</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 type-small text-fg-muted">
              {analysis.responsibilities.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {aiEnabled === false && <AiOffNote />}
        {resume && (
          <p className="type-small text-fg-muted">
            Tailoring <span className="font-medium text-fg">{resume.title}</span>
          </p>
        )}
        {options?.tailoredFrom && <TailoredCopyWarning base={options.tailoredFrom} onUse={onUseResume} />}
        {options && choices ? <TailorOptions options={options} choices={choices} onChange={onChoices} aiEnabled={aiEnabled !== false} /> : <p className="type-small text-fg-muted">Loading the options...</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <Button icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={onTailor} disabled={nothingLeft || !choices}>
            Tailor my resume
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// The chosen resume is itself a tailored copy: suggest its base resume instead
function TailoredCopyWarning({ base, onUse }) {
  return (
    <Alert
      tone="warning"
      data-testid="tailored-copy-warning"
      action={
        base.resumeId && (
          <Button size="sm" onClick={() => onUse(base.resumeId)}>
            Use "{base.title}" instead
          </Button>
        )
      }
    >
      This resume is already a tailored copy{base.title ? ` of "${base.title}"` : ""}. Tailoring it again carries over its changes (and any mistakes in them), so it's best to start from your base
      resume.{!base.resumeId && " Its base resume was deleted."}
    </Alert>
  );
}

// The same resume was tailored for this job before: replace that version or add a new one
function VersionChoice({ versions, onReplace, onNew, onCancel }) {
  const latest = versions[0];
  const option = "w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <Dialog
      size="sm"
      titleId="version-choice-title"
      title="You've tailored this resume for this job before"
      description={`"${latest.title}", ${timeAgo(latest.createdAt)}${versions.length > 1 ? ` (and ${versions.length - 1} older ${versions.length === 2 ? "version" : "versions"})` : ""}.`}
      onClose={onCancel}
      footer={<Button onClick={onCancel}>Cancel</Button>}
    >
      <div className="space-y-2">
        <button type="button" onClick={onReplace} className={`${option} border-accent bg-accent-soft hover:border-accent-strong`} data-autofocus>
          <span className="block type-label text-fg">Replace the existing version</span>
          <span className="mt-0.5 block type-small text-fg-muted">Same application: its cover letter and the skills you confirmed are kept.</span>
        </button>
        <button type="button" onClick={onNew} className={`${option} border-line hover:bg-surface-2`}>
          <span className="block type-label text-fg">Create a new version</span>
          <span className="mt-0.5 block type-small text-fg-muted">Keep both, as separate applications.</span>
        </button>
      </div>
    </Dialog>
  );
}

// Chip colours: must-haves in the accent, nice-to-haves neutral
const CHIP_TONES = {
  accent: "border-accent/30 bg-accent-soft text-accent hover:border-accent",
  neutral: "border-line bg-surface-2 text-fg hover:border-line-strong",
};

// One list of the job's skills. Each skill is a chip; clicking it opens a small menu to move it
// to the other list or remove it (one interaction, instead of icons on every chip).
function SkillGroup({ title, testId, skills, tone, moveLabel, onMove, onRemove }) {
  return (
    <div>
      <h3 className="type-label text-fg">
        {title} <span className="font-normal text-fg-muted tabular-nums">({skills.length})</span>
      </h3>
      {skills.length ? (
        <ul className="mt-2 flex flex-wrap gap-2" data-testid={testId}>
          {skills.map((skill) => (
            <li key={skill}>
              <Menu
                align="start"
                label={`Change ${skill}`}
                trigger={
                  <>
                    {skill}
                    <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
                  </>
                }
                triggerClassName={`inline-flex h-7 items-center gap-1 rounded-full border pr-2 pl-3 type-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${CHIP_TONES[tone]}`}
                items={[
                  { label: moveLabel, icon: tone === "accent" ? ArrowRight : ArrowLeft, onClick: () => onMove(skill) },
                  { label: "Remove", icon: Trash2, tone: "danger", onClick: () => onRemove(skill) },
                ]}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 type-small text-fg-subtle">None</p>
      )}
    </div>
  );
}

function SavedJobs({ jobs }) {
  if (!jobs.length) return null;
  return (
    <section aria-labelledby="saved-jobs" className="pt-4">
      <h2 id="saved-jobs" className="type-h2 text-fg">
        Saved jobs
      </h2>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft" data-testid="saved-jobs">
        {jobs.map((job) => {
          const fit = fitTone(job.score);
          return (
            <li key={job._id} className="flex items-center gap-2 pr-4 transition-colors hover:bg-surface-2">
              <Link to={`/tailor/jobs/${job._id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                <span className="min-w-0">
                  <span className="block truncate type-label text-fg">{job.title || "Untitled job"}</span>
                  <span className="block truncate type-small text-fg-muted">
                    {job.company || "Company not stated"} · {timeAgo(job.createdAt)}
                  </span>
                </span>
                <Badge tone={fit.tone}>
                  {job.score}% · {fit.label}
                </Badge>
              </Link>
              <Button as={Link} variant="link" className="type-small max-sm:hidden" to={job.coverLetterId ? `/cover-letters/${job.coverLetterId}` : `/cover-letters/new?job=${job._id}`}>
                {job.coverLetterId ? "Cover letter" : "Write cover letter"}
              </Button>
            </li>
          );
        })}
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
        <h1 className="type-h2 text-fg">We couldn't open this job</h1>
        <Button as={Link} to="/tailor" variant="primary" className="mt-6">
          Tailor to a job
        </Button>
      </div>
    );
  }
  if (!job) return <Loader text="Opening your match report..." />;

  const report = job.matchReport;
  const setReport = (matchReport, changes = {}) => setJob((previous) => ({ ...previous, matchReport, ...changes }));
  const fit = fitTone(report.score);

  return (
    <div className={pageClass()}>
      <PageHeader
        back={
          <div className="mb-3">
            <BackLink to="/tailor">Tailor to a job</BackLink>
          </div>
        }
        title={jobTitleOf(job.analysis)}
        description={`Tailored copy: ${job.tailoredResume?.title ?? "deleted"} · ${timeAgo(job.createdAt)}`}
        actions={
          job.tailoredResume && (
            <>
              <Button as={Link} to={job.coverLetterId ? `/cover-letters/${job.coverLetterId}` : `/cover-letters/new?job=${job._id}`}>
                {job.coverLetterId ? "Open cover letter" : "Write cover letter"}
              </Button>
              <Button as={Link} to={`/ats/review/${job.tailoredResumeId}`}>
                Review changes
              </Button>
              <Button as={Link} to={`/editor/${job.tailoredResumeId}`} variant="primary">
                Open in editor
              </Button>
              <Button variant="ghostDanger" iconOnly icon={Trash2} onClick={() => setDeleteOpen(true)} aria-label="Delete" title="Delete" />
            </>
          )
        }
      />
      <div className="mt-6 space-y-4">
        <ReportNotes job={job} />
        {job.tailoring?.differences && <Differences differences={job.tailoring.differences} />}
      </div>
      <DeleteApplicationModal open={deleteOpen} name={job.tailoredResume?.title ?? jobTitleOf(job.analysis)} onChoose={remove} onCancel={() => setDeleteOpen(false)} loading={deleting} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card as="section" aria-label="Match">
          <div className="flex justify-center" data-testid="match-score" data-score={report.score}>
            <ScoreRing key={report.score} value={report.score} label={fit.label} name="Match" caption="% match" tone={fit.tone} size="lg" animate />
          </div>
          <Breakdown report={report} />
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <MatchedSkills matched={report.matched} />
          <MissingSkills job={job} onReport={setReport} />
        </div>
      </div>

      <details id="job-description" className="group mt-6 rounded-xl border border-line bg-surface shadow-soft" open={window.location.hash === "#job-description"}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 type-label text-fg">
          Job description
          <ChevronDown className="size-4 text-fg-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="border-t border-line px-5 py-4 type-small whitespace-pre-line text-fg-muted">{job.description}</p>
      </details>
    </div>
  );
}

// The match report's notes, most important first: the copy is nearly identical to the base
// resume, AI was off, how it was tailored (AI strength, rewrites the safety check dropped), and
// the honesty note. Jobs tailored before the tailoring details were saved have no tailoring.
function reportNotes(job) {
  const { tailoring, aiEnabled } = job;
  const notes = [];
  const differences = tailoring?.differences;
  if (differences?.nearlyIdentical) {
    notes.push({
      id: "nearly-identical",
      tone: "warning",
      title: `This version is nearly identical to your base resume (${Math.round(differences.changedShare * 100)}% of its words changed).`,
      body: (
        <ul className="list-disc pl-5">
          {differences.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ),
    });
  }
  const aiOff = tailoring ? tailoring.tailoredWith !== "rules+ai" : aiEnabled === false;
  if (aiOff) notes.push({ id: "ai-off-note", tone: "warning", title: AI_OFF_NOTE });
  if (tailoring && !aiOff) {
    const dropped = tailoring.rejectedRewrites ?? [];
    const strength = STRENGTHS.find((option) => option.value === tailoring.strength)?.label ?? "Balanced";
    notes.push({
      id: "tailoring-note",
      tone: "info",
      title: (
        <>
          Tailored with AI · {strength} ·{" "}
          <span data-testid="rewrites-dropped" data-count={dropped.length}>
            {dropped.length === 1 ? "1 rewrite" : `${dropped.length} rewrites`} dropped by the safety check
          </span>
        </>
      ),
      body: dropped.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {dropped.map((item, index) => (
            <li key={index}>
              <span className="font-medium text-fg capitalize">{item.section}</span>: {item.problem}
            </li>
          ))}
        </ul>
      ),
    });
  }
  notes.push({ id: "honest-note", tone: "info", title: HONEST_NOTE });
  return notes;
}

// All the notes in one alert: the most important shows, "Show N more notes" expands the rest
function ReportNotes({ job }) {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = reportNotes(job);
  const note = (item) => (
    <div data-testid={item.id}>
      <p className="font-medium text-fg">{item.title}</p>
      {item.body && <div className="mt-1 type-small text-fg-muted">{item.body}</div>}
    </div>
  );
  return (
    <Alert
      tone={first.tone}
      role="status"
      data-testid="report-notes"
      action={
        rest.length > 0 && (
          <Button variant="link" className="type-small" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="report-more-notes">
            {expanded ? "Show fewer notes" : `Show ${rest.length} more ${rest.length === 1 ? "note" : "notes"}`}
          </Button>
        )
      }
    >
      {note(first)}
      {expanded && (
        <div id="report-more-notes" className="mt-3 space-y-3 border-t border-line pt-3">
          {rest.map((item) => (
            <div key={item.id}>{note(item)}</div>
          ))}
        </div>
      )}
    </Alert>
  );
}

// "How this version differs": the changes by type and how much of the text changed (the warning
// for a copy that's nearly the same as the base resume is in the report's notes)
function Differences({ differences }) {
  const percent = Math.round(differences.changedShare * 100);
  return (
    <Card as="section" aria-labelledby="differences" data-testid="differences">
      <h2 id="differences" className="type-h3 text-fg">
        How this version differs
      </h2>
      {differences.byType.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {differences.byType.map((entry) => (
            <li key={entry.type} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 type-small">
              <span className="text-fg-muted">{entry.label}</span>
              <span className="font-medium text-fg tabular-nums">{entry.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 type-small text-fg-muted">No changes were made.</p>
      )}
      <p className="mt-2 type-small text-fg-muted">{percent}% of the words differ from your base resume (reordering not counted).</p>
    </Card>
  );
}

function Breakdown({ report }) {
  const count = (required) => {
    const matched = report.matched.filter((m) => m.required === required).length;
    const missing = (required ? report.missingMustHave : report.missingNiceToHave).length;
    return { matched, total: matched + missing };
  };
  const rows = [
    ["Must-haves", count(true), "bg-accent"],
    ["Nice-to-haves", count(false), "bg-fg-subtle"],
  ];
  return (
    <dl className="mt-6 space-y-3" data-testid="breakdown">
      {rows.map(([label, { matched, total }, color]) => (
        <div key={label}>
          <div className="flex justify-between type-small">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="font-medium text-fg tabular-nums">
              {matched} of {total}
            </dd>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(matched / total) * 100}%` : 0 }} />
          </div>
        </div>
      ))}
      <p className="pt-1 type-small text-fg-muted">Must-haves count three times as much as nice-to-haves.</p>
    </dl>
  );
}

// Matched skills; the evidence quote shows on hover and keyboard focus
function MatchedSkills({ matched }) {
  return (
    <Card as="section" aria-labelledby="matched-skills">
      <CardHeader title={<span id="matched-skills">Skills your resume shows ({matched.length})</span>} description="Hover or focus a skill to see where." />
      {matched.length ? (
        <ul className="flex flex-wrap gap-2" data-testid="matched-skills">
          {matched.map((item) => (
            <li key={item.skill} className="group relative">
              <span
                tabIndex={0}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-success/30 bg-success-soft px-3 type-small font-medium text-success outline-none focus-visible:ring-2 focus-visible:ring-success"
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
                className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-72 rounded-md bg-fg px-3 py-2 text-xs leading-snug text-canvas shadow-raised group-focus-within:block group-hover:block"
              >
                <span className="block font-medium">{item.evidence.section[0].toUpperCase() + item.evidence.section.slice(1)}</span>
                <span className="mt-0.5 block">"{item.evidence.text}"</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-small text-fg-muted">None of the job's skills appear in your resume yet.</p>
      )}
    </Card>
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
    <Card as="section" aria-labelledby="missing-skills">
      <CardHeader
        title={<span id="missing-skills">Skills the job asks for that your resume doesn't show ({missing.length})</span>}
        description="Nothing is added unless you say you have it. If you don't, it's a good list of what to learn next."
      />
      {missing.length ? (
        <ul className="divide-y divide-line" data-testid="missing-skills">
          {missing.map(({ skill, required }) => {
            const declined = job.declinedSkills.includes(skill);
            return (
              <li key={skill} className="py-3 first:pt-0 last:pb-0" data-skill={skill}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-label text-fg">{skill}</span>
                    <Badge tone={required ? "accent" : "neutral"}>{required ? "Must-have" : "Nice-to-have"}</Badge>
                    {declined && <span className="type-small text-fg-muted">You don't have this yet</span>}
                  </div>
                  {open !== skill && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setOpen(skill)}>
                        I have this skill
                      </Button>
                      {!declined && (
                        <Button size="sm" variant="ghost" onClick={() => decline(skill)}>
                          I don't have this
                        </Button>
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
        <p className="type-small text-fg-muted">Your resume shows every skill this job lists.</p>
      )}
    </Card>
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
    <form onSubmit={submit} className="mt-3 space-y-4 rounded-lg border border-line bg-surface-2 p-4" aria-label={`Confirm ${skill}`}>
      <Field id={`where-${id}`} label={`Where did you use ${skill}?`}>
        {(props) => (
          <Select {...props} value={where} onChange={(event) => setWhere(event.target.value)} required>
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
          </Select>
        )}
      </Field>
      <Field id={`note-${id}`} label="A short note on how you used it">
        {(props) => <Textarea {...props} rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder={`e.g. Ran our services on ${skill} in production`} required />}
      </Field>

      <fieldset>
        <legend className="mb-2 type-label text-fg">What should we add?</legend>
        <div className="space-y-2">
          <Radio name={`placement-${id}`} value="skills" label="Add to Skills only" checked={!canBullet || placement === "skills"} onChange={() => setPlacement("skills")} />
          <Radio
            name={`placement-${id}`}
            value="bullet"
            label="Also add a bullet"
            description={!canBullet && where === "other" ? "Choose a job or project for it" : undefined}
            checked={canBullet && placement === "bullet"}
            disabled={!canBullet}
            onChange={() => setPlacement("bullet")}
          />
        </div>
      </fieldset>

      {canBullet && placement === "bullet" && (
        <Field id={`bullet-${id}`} label="The bullet (edit it to read well)" help="Keep to what's true: numbers and tools must come from your note or resume.">
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              maxLength={300}
              value={bulletText}
              onChange={(event) => {
                setBulletEdited(true);
                setBullet(event.target.value);
              }}
            />
          )}
        </Field>
      )}

      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!where || !note.trim()} loading={saving}>
          {saving ? "Adding..." : "Add it"}
        </Button>
      </div>
    </form>
  );
}
