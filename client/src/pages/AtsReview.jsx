import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, PenLine, RefreshCw, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { findPlaceholders, placeholdersIn } from "../utils/placeholders";
import Loader from "../components/Loader";
import ScoreRing from "../components/ats/ScoreRing";
import ResumeSnapshot from "../components/ats/ResumeSnapshot";
import { gradeFor } from "../components/ats/atsHelpers";
import { pageClass } from "../components/ui/pageLayout";

// Review screen for the ATS optimizer's result (/ats/review/:resumeId): the score before and
// after, the original and optimized resume side by side, and every change to accept or reject.
// The optimizer's response arrives in the navigation state; the same data is saved on the
// resume (atsOptimization), so the page also works after a refresh.

const SECTION_ORDER = ["personalInfo", "summary", "experience", "education", "skills", "projects", "layout"];
const SECTION_LABELS = {
  personalInfo: "Contact details",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  layout: "Layout",
};
const STATUS_LABELS = { pending: "Not reviewed yet", accepted: "Accepted", rejected: "Rejected (undone)" };

// Text with "[X%]"-style placeholders highlighted
function WithPlaceholders({ text }) {
  const parts = text.split(/(\[[^\]\d<>]{1,30}\])/);
  return parts.map((part, index) =>
    findPlaceholders(part).length ? (
      <mark key={index} className="ats-placeholder">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// locked: the resume was edited in the editor since the review, so decisions are read-only
function ChangeItem({ change, onDecide, busy, locked }) {
  const { status } = change;
  const button = (target, label, Icon, activeClass) => (
    <button
      type="button"
      onClick={() => onDecide([{ id: change.id, status: target }])}
      disabled={busy || locked || status === target || (target === "rejected" && change.revertible === false)}
      aria-pressed={status === target}
      title={target === "rejected" && change.revertible === false ? "Your original file's layout can't be recreated" : undefined}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed ${
        status === target ? activeClass : "border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <li className={`py-4 ${status === "rejected" ? "opacity-70" : ""}`} data-change={change.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm">
          <span className="text-rose-700 line-through decoration-rose-400 dark:text-rose-300">{change.before}</span>
          <ArrowRight className="mx-1.5 inline size-3.5 text-slate-400" aria-label="changed to" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            <WithPlaceholders text={change.after} />
          </span>
        </p>
        <span className="sr-only">Status: {STATUS_LABELS[status]}</span>
        <div className="flex shrink-0 gap-1.5">
          {button("accepted", "Accept", Check, "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300")}
          {button("rejected", "Reject", X, "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300")}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{change.reason}</p>
      {status === "rejected" && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">Undone in your optimized resume.</p>}
    </li>
  );
}

export default function AtsReview() {
  usePageTitle("Review ATS changes");
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromOptimizer = location.state?.optimization ?? null; // Shown while the resume loads

  const [resume, setResume] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    let ignore = false;
    api
      .get(`/resumes/${id}`)
      .then(({ data }) => !ignore && setResume(data))
      .catch((error) => !ignore && setLoadError(getErrorMessage(error)));
    return () => {
      ignore = true;
    };
  }, [id]);

  const review = resume?.atsOptimization ?? null;
  const locked = Boolean(review?.lockedAt); // Edited in the editor since the review (set by the server)
  const scores = review?.scores ?? fromOptimizer?.scores;
  const current = review?.currentScore ?? null;
  const changes = useMemo(() => review?.changes ?? [], [review]);

  // The original resume, as it was before the optimizer (an uploaded file's content is shown
  // in the optimized template, since its own layout can't be recreated)
  const original = useMemo(() => (review ? { ...review.original, template: review.original.template ?? resume.template } : null), [review, resume]);
  const highlights = useMemo(() => {
    const active = changes.filter((change) => change.status !== "rejected");
    return { original: active.flatMap((c) => c.marks?.original ?? []), optimized: active.flatMap((c) => c.marks?.optimized ?? []) };
  }, [changes]);
  const groups = useMemo(
    () => SECTION_ORDER.map((section) => ({ section, items: changes.filter((c) => c.section === section) })).filter((group) => group.items.length),
    [changes]
  );
  const placeholders = resume ? placeholdersIn(resume) : [];

  // Sends decisions / ticked skills; the server updates the resume and returns it
  const save = async (body) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/ats/review/${id}`, body);
      setResume(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // 409: it was edited in the editor (e.g. in another tab) since this page loaded
      if (error.response?.status === 409) {
        setResume((previous) => ({ ...previous, atsOptimization: { ...previous.atsOptimization, lockedAt: new Date().toISOString() } }));
      }
    } finally {
      setBusy(false);
    }
  };
  const decide = (decisions) => save({ decisions });
  const decideAll = (status) =>
    decide(changes.filter((c) => c.status !== status && !(status === "rejected" && c.revertible === false)).map((c) => ({ id: c.id, status })));

  const skills = review?.skillsToConsider.filter((s) => s.type === "skill") ?? [];
  const otherTerms = review?.skillsToConsider.filter((s) => s.type !== "skill") ?? [];
  const toggleSkill = (term) => {
    const selected = review.selectedSkills ?? [];
    save({ selectedSkills: selected.includes(term) ? selected.filter((s) => s !== term) : [...selected, term] });
  };

  const rescore = async () => {
    setRescoring(true);
    try {
      const { data } = await api.post(`/ats/rescore/${id}`);
      setResume((previous) => ({ ...previous, atsOptimization: { ...previous.atsOptimization, currentScore: data }, atsScore: data }));
      toast.success(`Current score: ${data.score}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRescoring(false);
    }
  };

  const openEditor = () =>
    navigate(`/editor/${id}`, {
      state: {
        optimized: {
          before: scores.before,
          after: current?.score ?? scores.after,
          changes: changes.filter((c) => c.status !== "rejected").length,
          skillsToConsider: skills.length - (review.selectedSkills?.length ?? 0) + otherTerms.length,
        },
      },
    });

  if (loadError) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <p className="text-slate-700 dark:text-slate-300">{loadError}</p>
        <Link to="/dashboard" className="btn-secondary mt-4">
          Back to the dashboard
        </Link>
      </div>
    );
  }
  // Straight from the optimizer, its scores are known before the resume has loaded
  if (!resume) {
    return <Loader text={fromOptimizer ? `Loading your review (${fromOptimizer.scores.before} → ${fromOptimizer.scores.after})...` : "Loading your review..."} />;
  }
  if (!review) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <p className="text-slate-700 dark:text-slate-300">This resume wasn't created by the ATS optimizer, so there's nothing to review.</p>
        <Link to={`/editor/${id}`} className="btn-primary mt-4">
          Open in editor
        </Link>
      </div>
    );
  }

  const improvement = scores.after - scores.before;
  const reviewedCount = changes.filter((c) => c.status !== "pending").length;

  return (
    <div className={pageClass()}>
      <Link to="/ats-checker" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="size-4" aria-hidden="true" />
        ATS checker
      </Link>

      {/* ---------- Scores ---------- */}
      <section className="card mt-4 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Review your ATS-optimized resume</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {resume.title} · {reviewedCount} of {changes.length} changes reviewed · your original stays as it was
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white" data-testid="improvement">
              {scores.before} → {scores.after}
              <span className={improvement >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                , {improvement >= 0 ? "+" : ""}
                {improvement} points
              </span>
            </p>
            {current && current.score !== scores.after && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300" data-testid="current-score">
                Current score with your choices: <span className="font-semibold">{current.score}</span> ({current.grade})
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={rescore} disabled={rescoring || busy} className="btn-secondary">
                <RefreshCw className={`size-4 ${rescoring ? "animate-spin" : ""}`} aria-hidden="true" />
                {rescoring ? "Scoring..." : "Re-score"}
              </button>
              <button type="button" onClick={openEditor} className="btn-primary">
                <PenLine className="size-4" aria-hidden="true" />
                Open in editor
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-6">
            <div className="text-center">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">Original</p>
              <ScoreRing score={scores.before} grade={gradeFor(scores.before)} compact />
            </div>
            <ArrowRight className="size-6 text-slate-400" aria-hidden="true" />
            <div className="text-center">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">Optimized</p>
              <ScoreRing score={scores.after} grade={gradeFor(scores.after)} compact />
            </div>
          </div>
        </div>
      </section>

      {placeholders.length > 0 && (
        <p className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100" role="status">
          <span className="font-semibold">
            Fill in {placeholders.length} placeholder{placeholders.length === 1 ? "" : "s"}
          </span>{" "}
          like <mark className="ats-placeholder">{placeholders[0]}</mark> with your real numbers, or remove them. Never send a resume with a placeholder
          or a number you can't back up.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ---------- Changes ---------- */}
        <div className="min-w-0 space-y-6">
          <section className="card p-6" aria-labelledby="changes-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="changes-title" className="font-semibold text-slate-900 dark:text-white">
                Changes ({changes.length})
              </h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => decideAll("accepted")} disabled={busy || locked} className="btn-secondary px-3 py-1.5 text-xs">
                  <Check className="size-3.5" aria-hidden="true" />
                  Accept all
                </button>
                <button type="button" onClick={() => decideAll("rejected")} disabled={busy || locked} className="btn-secondary px-3 py-1.5 text-xs">
                  <X className="size-3.5" aria-hidden="true" />
                  Reject all
                </button>
              </div>
            </div>
            {locked ? (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" role="status" data-testid="review-locked">
                You've edited this resume since the review, so changes can no longer be accepted or rejected here.{" "}
                <Link to="/ats-checker" className="font-semibold underline">
                  Run the ATS check again
                </Link>{" "}
                to get a fresh review.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rejecting a change undoes it in your optimized resume. You can change your mind any time.</p>
            )}

            {groups.map(({ section, items }) => (
              <div key={section} className="mt-5">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{SECTION_LABELS[section] ?? section}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((change) => (
                    <ChangeItem key={change.id} change={change} onDecide={decide} busy={busy} locked={locked} />
                  ))}
                </ul>
              </div>
            ))}
            {changes.length === 0 && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">The optimizer found nothing to change.</p>}
          </section>

          {(skills.length > 0 || otherTerms.length > 0) && (
            <section className="card p-6" aria-labelledby="skills-title">
              <h2 id="skills-title" className="font-semibold text-slate-900 dark:text-white">
                Skills to consider adding if you have them
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                The job asks for these, but your resume doesn't show them. Tick only the ones you really have; they're added to your Skills.
              </p>
              {skills.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {skills.map((skill) => (
                    <li key={skill.term}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={review.selectedSkills?.includes(skill.term) ?? false}
                          onChange={() => toggleSkill(skill.term)}
                          disabled={busy}
                          className="size-4 accent-indigo-600"
                        />
                        <span className="text-slate-800 dark:text-slate-200">{skill.term}</span>
                        {skill.required && <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">required</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {otherTerms.length > 0 && (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  Words from the job you could use where they're true for you: {otherTerms.map((term) => `"${term.term}"`).join(", ")}.
                </p>
              )}
            </section>
          )}
        </div>

        {/* ---------- Side by side ---------- */}
        <section className="min-w-0 lg:sticky lg:top-4 lg:self-start" aria-label="Original and optimized resume">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Original</h2>
              <ResumeSnapshot resume={original} highlights={highlights.original} tone="old" />
              {!review.original.template && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your file's content, shown in the new template (its own layout isn't shown).</p>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Optimized</h2>
              <ResumeSnapshot resume={resume} highlights={highlights.optimized} tone="new" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="ats-changed-new px-1">Green</span>: changed or added. <span className="ats-changed-old px-1">Red</span>: what it replaced.{" "}
            <mark className="ats-placeholder">Yellow</mark>: a placeholder to fill in.
          </p>
        </section>
      </div>
    </div>
  );
}
