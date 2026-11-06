import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, PenLine, RefreshCw, X } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { findPlaceholders, placeholdersIn } from "../utils/placeholders";
import Loader from "../components/Loader";
import ResumeSnapshot from "../components/ats/ResumeSnapshot";
import { gradeFor } from "../components/ats/atsHelpers";
import { pageClass } from "../components/ui/pageLayout";
import { Alert, Card, PageHeader } from "../components/ui/Display";
import { ScoreRing } from "../components/ui/Meter";
import { Checkbox } from "../components/ui/Form";
import Button from "../components/ui/Button";
import BackLink from "../components/ui/BackLink";

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

// Accept / Reject for one change: pressed shows the decision in its status colour
const DECISION_STYLES = { accepted: "border-success/40 bg-success-soft text-success", rejected: "border-danger/40 bg-danger-soft text-danger" };

// locked: the resume was edited in the editor since the review, so decisions are read-only
function ChangeItem({ change, onDecide, busy, locked }) {
  const { status } = change;
  const button = (target, label, Icon) => (
    <button
      type="button"
      onClick={() => onDecide([{ id: change.id, status: target }])}
      disabled={busy || locked || status === target || (target === "rejected" && change.revertible === false)}
      aria-pressed={status === target}
      title={target === "rejected" && change.revertible === false ? "Your original file's layout can't be recreated" : undefined}
      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed ${
        status === target ? DECISION_STYLES[target] : "border-line-strong text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <li className={`py-4 ${status === "rejected" ? "opacity-70" : ""}`} data-change={change.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 type-small">
          <span className="text-danger line-through">{change.before}</span>
          <ArrowRight className="mx-1.5 inline size-3.5 text-fg-subtle" aria-label="changed to" />
          <span className="font-medium text-success">
            <WithPlaceholders text={change.after} />
          </span>
        </p>
        <span className="sr-only">Status: {STATUS_LABELS[status]}</span>
        <div className="flex shrink-0 gap-1.5">
          {button("accepted", "Accept", Check)}
          {button("rejected", "Reject", X)}
        </div>
      </div>
      <p className="mt-1 type-small text-fg-muted">{change.reason}</p>
      {status === "rejected" && <p className="mt-1 type-small font-medium text-danger">Undone in your optimized resume.</p>}
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
        <p className="type-body text-fg-muted">{loadError}</p>
        <Button as={Link} to="/dashboard" className="mt-4">
          Back to the dashboard
        </Button>
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
        <p className="type-body text-fg-muted">This resume wasn't created by the ATS optimizer, so there's nothing to review.</p>
        <Button as={Link} to={`/editor/${id}`} variant="primary" className="mt-4">
          Open in editor
        </Button>
      </div>
    );
  }

  const improvement = scores.after - scores.before;
  const reviewedCount = changes.filter((c) => c.status !== "pending").length;

  return (
    <div className={pageClass()}>
      {/* ---------- Header and scores ---------- */}
      <PageHeader
        back={
          <div className="mb-3">
            <BackLink to="/ats-checker">ATS checker</BackLink>
          </div>
        }
        title="Review your ATS-optimized resume"
        description={`${resume.title} · ${reviewedCount} of ${changes.length} changes reviewed · your original stays as it was`}
        actions={
          <>
            <Button icon={RefreshCw} onClick={rescore} loading={rescoring} disabled={busy}>
              {rescoring ? "Scoring..." : "Re-score"}
            </Button>
            <Button variant="primary" icon={PenLine} onClick={openEditor}>
              Open in editor
            </Button>
          </>
        }
      />

      <Card className="mt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="type-h2 text-fg tabular-nums" data-testid="improvement">
              {scores.before} → {scores.after}
              <span className={improvement >= 0 ? "text-success" : "text-danger"}>
                , {improvement >= 0 ? "+" : ""}
                {improvement} points
              </span>
            </p>
            {current && current.score !== scores.after && (
              <p className="mt-1 type-small text-fg-muted" data-testid="current-score">
                Current score with your choices: <span className="font-medium text-fg">{current.score}</span> ({current.grade})
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <div className="text-center">
              <p className="mb-2 type-eyebrow text-fg-muted">Original</p>
              <ScoreRing value={scores.before} label={gradeFor(scores.before)} name="ATS score" size="compact" animate />
            </div>
            <ArrowRight className="size-5 text-fg-subtle" aria-hidden="true" />
            <div className="text-center">
              <p className="mb-2 type-eyebrow text-fg-muted">Optimized</p>
              <ScoreRing value={scores.after} label={gradeFor(scores.after)} name="ATS score" size="compact" animate />
            </div>
          </div>
        </div>
      </Card>

      {placeholders.length > 0 && (
        <div className="mt-4">
          <Alert tone="warning" role="status" title={`Fill in ${placeholders.length} placeholder${placeholders.length === 1 ? "" : "s"}`}>
            Replace placeholders like <mark className="ats-placeholder text-fg">{placeholders[0]}</mark> with your real numbers, or remove them. Never send a resume with a placeholder or a number you can't
            back up.
          </Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---------- Changes ---------- */}
        <div className="min-w-0 space-y-6">
          <Card as="section" aria-labelledby="changes-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="changes-title" className="type-h3 text-fg">
                Changes <span className="font-normal text-fg-muted tabular-nums">({changes.length})</span>
              </h2>
              <div className="flex gap-2">
                <Button size="sm" icon={Check} onClick={() => decideAll("accepted")} disabled={busy || locked}>
                  Accept all
                </Button>
                <Button size="sm" icon={X} onClick={() => decideAll("rejected")} disabled={busy || locked}>
                  Reject all
                </Button>
              </div>
            </div>
            {locked ? (
              <div className="mt-3" data-testid="review-locked">
                <Alert tone="warning" role="status">
                  You've edited this resume since the review, so changes can no longer be accepted or rejected here.{" "}
                  <Link to="/ats-checker" className="font-medium text-fg underline">
                    Run the ATS check again
                  </Link>{" "}
                  to get a fresh review.
                </Alert>
              </div>
            ) : (
              <p className="mt-1 type-small text-fg-muted">Rejecting a change undoes it in your optimized resume. You can change your mind any time.</p>
            )}

            {groups.map(({ section, items }) => (
              <div key={section} className="mt-5">
                <h3 className="type-eyebrow text-fg-muted">{SECTION_LABELS[section] ?? section}</h3>
                <ul className="divide-y divide-line">
                  {items.map((change) => (
                    <ChangeItem key={change.id} change={change} onDecide={decide} busy={busy} locked={locked} />
                  ))}
                </ul>
              </div>
            ))}
            {changes.length === 0 && <p className="mt-4 type-small text-fg-muted">The optimizer found nothing to change.</p>}
          </Card>

          {(skills.length > 0 || otherTerms.length > 0) && (
            <Card as="section" aria-labelledby="skills-title">
              <h2 id="skills-title" className="type-h3 text-fg">
                Skills to consider adding if you have them
              </h2>
              <p className="mt-1 type-small text-fg-muted">The job asks for these, but your resume doesn't show them. Tick only the ones you really have; they're added to your Skills.</p>
              {skills.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {skills.map((skill) => (
                    <li key={skill.term} className="rounded-lg border border-line px-3 py-2">
                      <Checkbox
                        label={skill.term}
                        description={skill.required ? "Required by the job" : undefined}
                        checked={review.selectedSkills?.includes(skill.term) ?? false}
                        onChange={() => toggleSkill(skill.term)}
                        disabled={busy}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {otherTerms.length > 0 && (
                <p className="mt-4 type-small text-fg-muted">Words from the job you could use where they're true for you: {otherTerms.map((term) => `"${term.term}"`).join(", ")}.</p>
              )}
            </Card>
          )}
        </div>

        {/* ---------- Side by side ---------- */}
        <section className="min-w-0 lg:sticky lg:top-20 lg:self-start" aria-label="Original and optimized resume">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h2 className="mb-2 type-label text-fg">Original</h2>
              <ResumeSnapshot resume={original} highlights={highlights.original} tone="old" />
              {!review.original.template && <p className="mt-2 type-small text-fg-muted">Your file's content, shown in the new template (its own layout isn't shown).</p>}
            </div>
            <div>
              <h2 className="mb-2 type-label text-fg">Optimized</h2>
              <ResumeSnapshot resume={resume} highlights={highlights.optimized} tone="new" />
            </div>
          </div>
          {/* The legend: swatches of the highlight colours (they sit on the white page, not on the app) */}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 type-small text-fg-muted">
            <li className="flex items-center gap-1.5">
              <span className="ats-changed-new inline-block size-3" aria-hidden="true" />
              Changed or added
            </li>
            <li className="flex items-center gap-1.5">
              <span className="ats-changed-old inline-block size-3" aria-hidden="true" />
              What it replaced
            </li>
            <li className="flex items-center gap-1.5">
              <mark className="ats-placeholder inline-block size-3" aria-hidden="true" />
              A placeholder to fill in
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
