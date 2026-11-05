import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Info,
  PenLine,
  Sparkles,
  TrendingUp,
  Wand2,
  XCircle,
} from "lucide-react";
import toast from "../../utils/toast";
import ScoreRing from "./ScoreRing";
import CategoryCard from "./CategoryCard";

const CTA_THRESHOLD = 70; // Below this score, offer an ATS-friendly version

export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        These results are guidance, not a guarantee. They don't come from any specific ATS: every company uses
        different software and settings, and a person usually makes the final decision. Only add skills and
        experience you really have.
      </span>
    </p>
  );
}

// ---------- Report tab ----------

// The failed checks that would add the most points if fixed
function TopFixes({ checks, score }) {
  const fixes = checks
    .filter((check) => !check.passed)
    .map((check) => ({ ...check, gain: check.maxPoints - check.points }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  if (!fixes.length) {
    return (
      <section className="card flex items-center gap-3 p-5">
        <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="text-sm text-slate-700 dark:text-slate-300">Every check passed. Nothing to fix!</p>
      </section>
    );
  }

  const potential = Math.min(100, Math.round(score + fixes.reduce((sum, fix) => sum + fix.gain, 0)));
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Top {fixes.length} fixes
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Could raise your score to about <span className="font-semibold text-slate-900 dark:text-white">{potential}</span>
        </p>
      </div>
      <ol className="mt-4 space-y-3">
        {fixes.map((fix, index) => (
          <li key={fix.id} className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-white">{fix.label}</p>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  +{fix.gain} pts
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{fix.fix}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TagList({ items, tone }) {
  const styles =
    tone === "matched"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
      : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300";
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.term}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${styles}`}
          title={item.required ? "Listed in the job's requirements" : undefined}
        >
          {item.term}
          {item.required && (
            <>
              <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Keywords({ result }) {
  const { matchedKeywords: matched, missingKeywords: missing, keywords } = result;

  // No job description: show the skills we recognised instead
  if (!keywords.jobDescriptionProvided) {
    const skills = (keywords.detectedSkills ?? []).map((term) => ({ term }));
    return (
      <section className="card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white">Keywords</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste a job description to see which of its keywords you're missing.
        </p>
        <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Skills and tools found ({skills.length})
        </h3>
        {skills.length ? (
          <TagList items={skills} tone="matched" />
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">We didn't recognise any specific tools or skills.</p>
        )}
      </section>
    );
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-white">Keywords from the job</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {matched.length} of {matched.length + missing.length} found
          {keywords.jobTitle && (
            <>
              {" "}
              · Job title: <span className="font-medium text-slate-700 dark:text-slate-300">{keywords.jobTitle}</span>
            </>
          )}
        </p>
      </div>

      <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <XCircle className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        Missing ({missing.length})
      </h3>
      {missing.length ? (
        <TagList items={missing} tone="missing" />
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your resume covers every keyword we found.</p>
      )}

      <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Matched ({matched.length})
      </h3>
      {matched.length ? (
        <TagList items={matched} tone="matched" />
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">None of the job's keywords appear yet.</p>
      )}

      {[...matched, ...missing].some((k) => k.required) && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">* Listed in the job's requirements</p>
      )}
    </section>
  );
}

function AiSuggestions({ ai }) {
  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Sparkles className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        AI feedback
      </h2>
      {ai.summary && (
        <p className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">
          {ai.summary}
        </p>
      )}
      {ai.strengths.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">What's working</h3>
          <ul className="mt-2 space-y-1.5">
            {ai.strengths.map((strength) => (
              <li key={strength} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {strength}
              </li>
            ))}
          </ul>
        </>
      )}
      {ai.weakBullets.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">Bullet points to strengthen</h3>
          <ul className="mt-3 space-y-3">
            {ai.weakBullets.map((bullet) => (
              <li key={bullet.original} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Before</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{bullet.original}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Suggested</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{bullet.rewrite}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{bullet.issue}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Replace anything in [brackets] with your real numbers, or leave it out.
          </p>
        </>
      )}
    </section>
  );
}

function Report({ result }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="space-y-6">
      <TopFixes checks={result.checks} score={result.score} />
      <section aria-labelledby="categories-title">
        <h2 id="categories-title" className="mb-3 font-semibold text-slate-900 dark:text-white">
          Score breakdown
        </h2>
        <div className="space-y-3">
          {result.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              open={openId === category.id}
              onToggle={() => setOpenId(openId === category.id ? null : category.id)}
            />
          ))}
        </div>
      </section>
      <Keywords result={result} />
      {result.ai && <AiSuggestions ai={result.ai} />}
    </div>
  );
}

// ---------- "What the ATS sees" tab ----------

function AtsView({ text, fromSavedResume }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Text copied");
    } catch {
      toast.error("Couldn't copy the text");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="card min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Extracted plain text</h2>
          {text && (
            <button type="button" onClick={copy} className="btn-secondary px-3 py-1.5 text-xs">
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </button>
          )}
        </div>
        {text ? (
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap wrap-break-word bg-slate-50 p-5 font-mono text-[13px] leading-relaxed text-slate-800 dark:bg-slate-950 dark:text-slate-200">
            {text}
          </pre>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No text could be read from this file. An ATS would see an empty page.
          </p>
        )}
      </section>

      <aside className="h-fit rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <h2 className="flex items-center gap-2 font-semibold">
          <Eye className="size-4" aria-hidden="true" />
          How to read this
        </h2>
        <p className="mt-2">
          This is the plain text we pulled out of your {fromSavedResume ? "resume" : "file"}, roughly what an ATS reads
          before it tries to sort it into fields.
        </p>
        <p className="mt-2">
          If sections are jumbled, lines from two columns are mixed together, text is missing, or symbols look strange
          here, a real ATS will most likely struggle too.
        </p>
        {fromSavedResume && (
          <p className="mt-2">
            For saved resumes it's built from your content; the exported PDF reads the same way with a single-column
            template.
          </p>
        )}
      </aside>
    </div>
  );
}

// ---------- Page ----------

const TABS = [
  { id: "report", label: "Report", icon: FileText },
  { id: "ats-view", label: "What the ATS sees", icon: Eye },
];

// result     - the response of POST /api/ats/analyze
// onReset    - back to the form
// onGenerate - create an ATS-friendly copy (generating = in progress)
export default function AtsResults({ result, onReset, onGenerate, generating }) {
  const [tab, setTab] = useState("report");
  const fromSavedResume = result.source?.type === "saved";
  const { file } = result;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Check another resume
      </button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left: score and actions */}
        <div className="space-y-6">
          <section className="card flex flex-col items-center p-6 text-center">
            <h1 className="sr-only">Your ATS results</h1>
            <ScoreRing score={result.score} grade={result.grade} />
            <p className="mt-4 max-w-full truncate text-sm font-medium text-slate-900 dark:text-white" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {file.pagesEstimated && "About "}
              {file.pages} page{file.pages === 1 ? "" : "s"} · {file.words} words
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {result.analyzedWith === "rules+ai" ? (
                <>
                  <Sparkles className="size-3.5" aria-hidden="true" /> Rule checks + AI review
                </>
              ) : (
                "Rule-based checks"
              )}
            </span>
            {fromSavedResume && (
              <Link to={`/editor/${result.source.resumeId}`} className="btn-secondary mt-5 w-full">
                <PenLine className="size-4" aria-hidden="true" />
                Edit this resume
              </Link>
            )}
          </section>

          {result.score < CTA_THRESHOLD && (
            <section className="rounded-2xl border-2 border-indigo-500 bg-indigo-50 p-5 dark:bg-indigo-950/40">
              <h2 className="font-semibold text-slate-900 dark:text-white">Make it easier for an ATS to read</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                We'll create an improved copy in a single-column template: standard headings, one date format, newest
                job first and contact details in the body, plus stronger bullet points when AI is available. Your
                original stays as it is.
              </p>
              <button type="button" onClick={onGenerate} disabled={generating} className="btn-primary mt-4 w-full py-2.5">
                {generating ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Optimizing… this can take a minute
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" aria-hidden="true" />
                    Generate an ATS-friendly version
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Nothing is invented: skills, numbers and employers only come from your resume. Check each change before
                you use it.
              </p>
            </section>
          )}

          <div className="hidden lg:block">
            <Disclaimer />
          </div>
        </div>

        {/* Right: tabs */}
        <div className="min-w-0">
          <div className="mb-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Results">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  tab === id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === "report" ? <Report result={result} /> : <AtsView text={result.atsView} fromSavedResume={fromSavedResume} />}
          </div>
          {/* On phones the disclaimer goes after the results, so they come first */}
          <div className="mt-6 lg:hidden">
            <Disclaimer />
          </div>
        </div>
      </div>
    </div>
  );
}
