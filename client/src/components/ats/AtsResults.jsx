import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, FileText, Info, PenLine, Wand2 } from "lucide-react";
import toast from "../../utils/toast";
import CategoryCard from "./CategoryCard";
import { pageClass } from "../ui/pageLayout";
import { Alert, Badge, Card, CardHeader } from "../ui/Display";
import { ScoreRing } from "../ui/Meter";
import Button from "../ui/Button";
import BackLink from "../ui/BackLink";
import Tabs from "../ui/Tabs";

const CTA_THRESHOLD = 70; // Below this score, offer an ATS-friendly version

// Fine print under the results: small and quiet, so it doesn't compete with them
export function Disclaimer() {
  return (
    <p className="flex gap-2 type-small text-fg-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        These results are guidance, not a guarantee. They don't come from any specific ATS: every company uses different software and settings, and a person usually makes the final decision. Only add
        skills and experience you really have.
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

  if (!fixes.length) return <Alert tone="success">Every check passed. Nothing to fix.</Alert>;

  const potential = Math.min(100, Math.round(score + fixes.reduce((sum, fix) => sum + fix.gain, 0)));
  return (
    <Card>
      <CardHeader
        title={`Top ${fixes.length} fixes`}
        description={
          <>
            Could raise your score to about <span className="font-medium text-fg">{potential}</span>
          </>
        }
      />
      <ol className="space-y-3">
        {fixes.map((fix, index) => (
          <li key={fix.id} className="flex gap-3 rounded-lg border border-line p-4">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-medium text-accent">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="type-label text-fg">{fix.label}</p>
                <Badge tone="success">+{fix.gain} pts</Badge>
              </div>
              <p className="mt-1 type-small text-fg-muted">{fix.fix}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Keyword chips: found (success) or missing (danger); a * marks the job's requirements
function TagList({ items, tone }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.term} title={item.required ? "Listed in the job's requirements" : undefined}>
          <Badge tone={tone}>
            {item.term}
            {item.required && (
              <>
                <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </>
            )}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

// A small heading inside a card, with its count
function GroupHeading({ children, count }) {
  return (
    <h3 className="mt-5 type-label text-fg">
      {children} <span className="font-normal text-fg-muted tabular-nums">({count})</span>
    </h3>
  );
}

function Keywords({ result }) {
  const { matchedKeywords: matched, missingKeywords: missing, keywords } = result;

  // No job description: show the skills we recognised instead
  if (!keywords.jobDescriptionProvided) {
    const skills = (keywords.detectedSkills ?? []).map((term) => ({ term }));
    return (
      <Card>
        <CardHeader title="Keywords" description="Paste a job description to see which of its keywords you're missing." />
        <GroupHeading count={skills.length}>Skills and tools found</GroupHeading>
        {skills.length ? <TagList items={skills} tone="success" /> : <p className="mt-2 type-small text-fg-muted">We didn't recognise any specific tools or skills.</p>}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Keywords from the job"
        description={
          <>
            {matched.length} of {matched.length + missing.length} found
            {keywords.jobTitle && (
              <>
                {" "}
                · Job title: <span className="font-medium text-fg">{keywords.jobTitle}</span>
              </>
            )}
          </>
        }
      />
      <GroupHeading count={missing.length}>Missing</GroupHeading>
      {missing.length ? <TagList items={missing} tone="danger" /> : <p className="mt-2 type-small text-fg-muted">Your resume covers every keyword we found.</p>}

      <GroupHeading count={matched.length}>Matched</GroupHeading>
      {matched.length ? <TagList items={matched} tone="success" /> : <p className="mt-2 type-small text-fg-muted">None of the job's keywords appear yet.</p>}

      {[...matched, ...missing].some((k) => k.required) && <p className="mt-4 type-small text-fg-muted">* Listed in the job's requirements</p>}
    </Card>
  );
}

function AiSuggestions({ ai }) {
  return (
    <Card>
      <CardHeader title="AI feedback" />
      {ai.summary && <p className="rounded-lg bg-surface-2 px-4 py-3 type-body text-fg">{ai.summary}</p>}
      {ai.strengths.length > 0 && (
        <>
          <h3 className="mt-5 type-label text-fg">What's working</h3>
          <ul className="mt-2 space-y-1.5">
            {ai.strengths.map((strength) => (
              <li key={strength} className="flex gap-2 type-small text-fg-muted">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {strength}
              </li>
            ))}
          </ul>
        </>
      )}
      {ai.weakBullets.length > 0 && (
        <>
          <h3 className="mt-5 type-label text-fg">Bullet points to strengthen</h3>
          <ul className="mt-3 space-y-3">
            {ai.weakBullets.map((bullet) => (
              <li key={bullet.original} className="rounded-lg border border-line p-4">
                <p className="type-eyebrow text-fg-subtle">Before</p>
                <p className="mt-1 type-small text-fg-muted">{bullet.original}</p>
                <p className="mt-3 type-eyebrow text-success">Suggested</p>
                <p className="mt-1 type-small font-medium text-fg">{bullet.rewrite}</p>
                <p className="mt-2 type-small text-fg-muted">{bullet.issue}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 type-small text-fg-muted">Replace anything in [brackets] with your real numbers, or leave it out.</p>
        </>
      )}
    </Card>
  );
}

function Report({ result }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="space-y-6">
      <TopFixes checks={result.checks} score={result.score} />
      <section aria-labelledby="categories-title">
        <h2 id="categories-title" className="mb-3 type-h3 text-fg">
          Score breakdown
        </h2>
        <div className="space-y-3">
          {result.categories.map((category) => (
            <CategoryCard key={category.id} category={category} open={openId === category.id} onToggle={() => setOpenId(openId === category.id ? null : category.id)} />
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
    <div className="grid gap-6 lg:grid-cols-3">
      <Card padding="none" className="min-w-0 overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="type-label text-fg">Extracted plain text</h2>
          {text && (
            <Button size="sm" icon={Copy} onClick={copy}>
              Copy
            </Button>
          )}
        </div>
        {text ? (
          <pre className="max-h-workspace overflow-auto bg-surface-2 p-5 font-mono text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-fg">{text}</pre>
        ) : (
          <p className="p-8 text-center type-small text-fg-muted">No text could be read from this file. An ATS would see an empty page.</p>
        )}
      </Card>

      <Card tone="quiet" as="aside" className="h-fit">
        <h2 className="type-label text-fg">How to read this</h2>
        <div className="mt-2 space-y-2 type-small text-fg-muted">
          <p>This is the plain text we pulled out of your {fromSavedResume ? "resume" : "file"}, roughly what an ATS reads before it tries to sort it into fields.</p>
          <p>If sections are jumbled, lines from two columns are mixed together, text is missing, or symbols look strange here, a real ATS will most likely struggle too.</p>
          {fromSavedResume && <p>For saved resumes it's built from your content; the exported PDF reads the same way with a single-column template.</p>}
        </div>
      </Card>
    </div>
  );
}

// ---------- Page ----------

const TABS = [
  { id: "report", label: "Report" },
  { id: "ats-view", label: "What the ATS sees" },
];

// result     - the response of POST /api/ats/analyze
// onReset    - back to the form
// onGenerate - create an ATS-friendly copy (generating = in progress)
export default function AtsResults({ result, onReset, onGenerate, generating }) {
  const [tab, setTab] = useState("report");
  const fromSavedResume = result.source?.type === "saved";
  const { file } = result;

  return (
    <div className={pageClass()}>
      <BackLink onClick={onReset}>Check another resume</BackLink>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: score and actions */}
        <div className="space-y-6">
          <Card className="flex flex-col items-center text-center">
            <h1 className="sr-only">Your ATS results</h1>
            <ScoreRing value={result.score} label={result.grade} name="ATS score" size="lg" animate />
            <p className="mt-4 max-w-full truncate type-label text-fg" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 type-small text-fg-muted">
              {file.pagesEstimated && "About "}
              {file.pages} page{file.pages === 1 ? "" : "s"} · {file.words} words
            </p>
            <div className="mt-3">
              <Badge>{result.analyzedWith === "rules+ai" ? "Rule checks + AI review" : "Rule-based checks"}</Badge>
            </div>
            {fromSavedResume && (
              <Button as={Link} to={`/editor/${result.source.resumeId}`} icon={PenLine} className="mt-5 w-full">
                Edit this resume
              </Button>
            )}
            {result.source?.type === "original" && (
              <Button as={Link} to={`/resumes/${result.source.resumeId}/original`} icon={FileText} className="mt-5 w-full">
                Back to your original
              </Button>
            )}
          </Card>

          {result.score < CTA_THRESHOLD && (
            <Card>
              <h2 className="type-h3 text-fg">Make it easier for an ATS to read</h2>
              <p className="mt-1.5 type-small text-fg-muted">
                We'll create an improved copy in a single-column template: standard headings, one date format, newest job first and contact details in the body, plus stronger bullet points when AI
                is available. Your original stays as it is.
              </p>
              <Button variant="primary" icon={Wand2} loading={generating} onClick={onGenerate} className="mt-4 w-full">
                {generating ? "Optimizing… this can take a minute" : "Generate an ATS-friendly version"}
              </Button>
              <p className="mt-2 type-small text-fg-muted">Nothing is invented: skills, numbers and employers only come from your resume. Check each change before you use it.</p>
            </Card>
          )}

          <div className="hidden lg:block">
            <Disclaimer />
          </div>
        </div>

        {/* Right: tabs */}
        <div className="min-w-0 lg:col-span-2">
          <div className="mb-6">
            <Tabs label="Results" tabs={TABS} value={tab} onChange={setTab} />
          </div>
          <div role="tabpanel" aria-label={TABS.find((item) => item.id === tab).label}>
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
