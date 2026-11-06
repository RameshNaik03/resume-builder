import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, XCircle } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { toPlainText } from "../utils/richText";
import printPageStyle, { printWhenFontsReady, reportPrintError } from "../utils/printPageStyle";
import { getTemplate } from "../templates/registry";
import { resolveDesign } from "../templates/design";
import { letterPlaceholders } from "../templates/prepareLetter";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import ResumePreview from "../components/ResumePreview";
import RichTextEditor from "../components/editor/RichTextEditor";
import { pageClass } from "../components/ui/pageLayout";
import { Alert, Card, CardHeader, PageHeader } from "../components/ui/Display";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import Button from "../components/ui/Button";
import BackLink from "../components/ui/BackLink";
import SegmentedControl from "../components/ui/SegmentedControl";
import Tabs from "../components/ui/Tabs";

// Cover letters (/cover-letters/new?job=<jobId> and /cover-letters/:id), via /api/cover-letters:
//   new    - generate a letter for a tailored job: tone, length, language, the recipient (name and
//            salutation) and the guided answers, all optional: why this company, the user's
//            strongest achievement for the job, what interests them about the company, their
//            earliest start date and (German letters) a salary expectation
//   editor - the same layout as the resume editor: the letter's fields and rich text body on the
//            left, a live preview on the right drawn by the linked resume's template and palette
//            (so they look like a matching set), always fitted to one page. A strength check
//            (like a mini ATS check), three openings to choose from, regenerate (with a warning
//            before replacing hand edits), highlighted placeholders, and a PDF download that warns
//            while placeholders are still unfilled.

const TONES = [
  ["professional", "Professional"],
  ["warm", "Warm"],
  ["confident", "Confident"],
];
const LENGTHS = [
  ["short", "Short", "~150 words"],
  ["standard", "Standard", "~250 words"],
  ["detailed", "Detailed", "~350 words"],
];
const LANGUAGES = [
  ["en", "English"],
  ["de", "Deutsch"],
];
const SALUTATIONS = [
  ["", "None (full name)"],
  ["Frau", "Frau / Ms."],
  ["Herr", "Herr / Mr."],
];
const SAVE_DELAY_MS = 1000;
const STATUS_TEXT = { saved: "Saved", unsaved: "Unsaved changes", saving: "Saving...", error: "Couldn't save" };

const ANSWER_FIELDS = ["whyCompany", "achievement", "companyInterest", "availability", "salary"];
const answersOf = (letter) => Object.fromEntries(ANSWER_FIELDS.map((field) => [field, letter?.[field] ?? ""]));

const wordCount = (html) => toPlainText(html ?? "").split(/\s+/).filter(Boolean).length;
const normalize = (text) => text.replace(/\s+/g, " ").trim();
// The letter's opening as plain text: the paragraph after the greeting
const openingOf = (html) => normalize(toPlainText((html ?? "").match(/<p[^>]*>[\s\S]*?<\/p>/g)?.[1] ?? ""));
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export default function CoverLetter() {
  const { id } = useParams();
  return id === "new" ? <NewLetter /> : <LetterEditor key={id} id={id} />;
}

// ---------- Shared form pieces ----------

// One choice from a few options (tone, length, language): a label and the shared segmented control.
// Hints (a length's word count) sit inside the segments on wider screens; on phones the segments
// show just the labels, and the selected option's hint is a caption under them.
function Choice({ legend, name, options, value, onChange }) {
  const id = `choice-${name}`;
  const selectedHint = options.find(([optionValue]) => optionValue === value)?.[2];
  return (
    <div data-choice={name}>
      <p id={id} className="mb-1.5 type-label text-fg">
        {legend}
      </p>
      <SegmentedControl labelledBy={id} options={options.map(([optionValue, label, hint]) => ({ value: optionValue, label, hint }))} value={value} onChange={onChange} hintClassName="max-sm:hidden" />
      {selectedHint && (
        <p className="mt-1.5 type-small text-fg-muted sm:hidden" data-testid="choice-caption">
          {selectedHint}
        </p>
      )}
    </div>
  );
}

function RecipientFields({ name, salutation, onName, onSalutation, idPrefix }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-recipient`} label="Recipient's name" help="If you know it.">
          {(props) => <Input {...props} maxLength={120} value={name} onChange={(event) => onName(event.target.value)} placeholder="e.g. Anna Schmidt" />}
        </Field>
      </div>
      <Field id={`${idPrefix}-salutation`} label="Salutation">
        {(props) => (
          <Select {...props} value={salutation} onChange={(event) => onSalutation(event.target.value)} disabled={!name.trim()}>
            {SALUTATIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

// The guided answers: short, optional, in the user's own words. Only these (and the resume) go
// into the letter; empty ones become marked spots, never invented text.
function GuidedAnswers({ values, language, onChange, idPrefix }) {
  const bind = (name) => ({ value: values[name], onChange: (event) => onChange(name, event.target.value) });
  return (
    <fieldset className="space-y-4">
      <legend className="type-label text-fg">In your own words</legend>
      <p className="-mt-2 type-small text-fg-muted">All optional, but they make the letter yours. Anything you leave empty is marked for you to fill in, never made up.</p>
      <Field id={`${idPrefix}-achievement`} label="Your strongest achievement for this job" optional>
        {(props) => (
          <Textarea
            {...props}
            {...bind("achievement")}
            rows={3}
            maxLength={600}
            placeholder="A short story: the situation, what you did, the result. E.g. “Our nightly billing job kept timing out, so I rewrote it as a stream; it now finishes in 4 minutes.”"
          />
        )}
      </Field>
      <Field id={`${idPrefix}-why`} label="Why this company?" optional>
        {(props) => <Textarea {...props} {...bind("whyCompany")} rows={2} maxLength={600} placeholder="One or two sentences in your own words." />}
      </Field>
      <Field id={`${idPrefix}-interest`} label="Anything specific about the company that interests you?" optional>
        {(props) => <Input {...props} {...bind("companyInterest")} maxLength={400} placeholder="A product, a project, a value. E.g. “your open-source ledger library”" />}
      </Field>
      <div className={`grid gap-4 ${language === "de" ? "sm:grid-cols-2" : ""}`}>
        <Field id={`${idPrefix}-availability`} label="Earliest start date" optional>
          {(props) => <Input {...props} {...bind("availability")} maxLength={120} placeholder={language === "de" ? "z. B. 1. April 2027 / sofort" : "e.g. 1 March 2027 / immediately"} />}
        </Field>
        {language === "de" && (
          <Field id={`${idPrefix}-salary`} label="Gehaltsvorstellung" optional>
            {(props) => <Input {...props} {...bind("salary")} maxLength={80} placeholder="z. B. 75.000 € brutto im Jahr" />}
          </Field>
        )}
      </div>
    </fieldset>
  );
}

// The letter strength check from the server (opening, evidence, motivation, clichés, length,
// placeholders): pass, warning or fail, with a tip for each one that isn't a pass.
//   evidenceWords - set when the requested length couldn't be reached because the resume has no
//                   more matching evidence (the letter is never padded): a note under the length
const STATUS_ICONS = {
  pass: [CheckCircle2, "text-success", "Passed"],
  warn: [AlertTriangle, "text-warning", "Warning"],
  fail: [XCircle, "text-danger", "Needs work"],
};
function StrengthCheck({ strength, evidenceWords }) {
  if (!strength) return null;
  return (
    <Card as="section" aria-labelledby="letter-strength" data-testid="letter-strength">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="letter-strength" className="type-h3 text-fg">
          Letter strength
        </h2>
        <span className="type-small text-fg-muted tabular-nums">
          {strength.passed} of {strength.total} checks passed
          {strength.warnings > 0 && ` · ${strength.warnings} ${strength.warnings === 1 ? "warning" : "warnings"}`}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {strength.checks.map((check) => {
          const status = check.status ?? (check.passed ? "pass" : "fail");
          const [Icon, color, label] = STATUS_ICONS[status];
          return (
            <li key={check.id} className="flex gap-2.5" data-check={check.id} data-passed={check.passed} data-status={status}>
              <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-label={label} />
              <div className="min-w-0">
                <p className="type-label text-fg">{check.label}</p>
                {check.tip && <p className="mt-0.5 type-small text-fg-muted">{check.tip}</p>}
                {check.id === "length" && status !== "pass" && evidenceWords > 0 && (
                  <p className="mt-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 type-small text-fg" data-testid="length-note">
                    Your resume has evidence for about {evidenceWords} words. Add an achievement story or a company detail to make it longer.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// The three generated openings: the one in the letter is selected; choosing another replaces only
// the paragraph after the greeting
function OpeningPicker({ options, current, busy, onChoose }) {
  if (!options?.length) return null;
  const selected = options.findIndex((option) => normalize(option) === current);
  return (
    <Card as="section" aria-labelledby="letter-openings">
      <CardHeader
        title={<span id="letter-openings">Opening</span>}
        description={selected === -1 ? "You've written your own opening. Choosing one of these replaces it." : "Three ways to open, from your real experience. Pick the one that sounds most like you."}
      />
      <div role="radiogroup" aria-labelledby="letter-openings" className="space-y-2">
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={index === selected}
            disabled={busy}
            onClick={() => index !== selected && onChoose(index)}
            data-testid="opening-option"
            className={`block w-full rounded-lg border px-3 py-2.5 text-left type-small transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 ${
              index === selected ? "border-accent bg-accent-soft text-fg" : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---------- New letter ----------

function NewLetter() {
  usePageTitle("Write a cover letter");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const [job, setJob] = useState(null);
  const [failed, setFailed] = useState(!jobId);
  const [options, setOptions] = useState({ tone: "professional", length: "standard", language: "en", recipientName: "", recipientSalutation: "", ...answersOf(null) });
  const [busy, setBusy] = useState(false);
  const set = (field) => (value) => setOptions((previous) => ({ ...previous, [field]: value }));

  useEffect(() => {
    if (!jobId) return;
    api
      .get(`/jobs/${jobId}`)
      .then(({ data }) => setJob(data))
      .catch((error) => {
        setFailed(true);
        toast.error(getErrorMessage(error));
      });
  }, [jobId]);

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/cover-letters/generate", {
        jobId,
        ...options,
        recipientSalutation: options.recipientName.trim() ? options.recipientSalutation : "",
        salary: options.language === "de" ? options.salary : "",
      });
      toast.success(data.placeholders.length ? `Letter written. Fill in ${data.placeholders.length} marked ${data.placeholders.length === 1 ? "spot" : "spots"} before sending.` : "Letter written.");
      navigate(`/cover-letters/${data.coverLetter._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <h1 className="type-h2 text-fg">Choose a job first</h1>
        <p className="mt-2 type-body text-fg-muted">Cover letters are written for a tailored resume and its job.</p>
        <Button as={Link} to="/tailor" variant="primary" className="mt-6">
          Tailor to a job
        </Button>
      </div>
    );
  }
  if (!job) return <Loader text="Loading the job..." />;
  const role = [job.analysis.title, job.analysis.company].filter(Boolean).join(" – ") || "this job";

  return (
    <div className={pageClass()}>
      <PageHeader
        back={
          <div className="mb-3">
            <BackLink to={`/tailor/jobs/${jobId}`}>Back to the match report</BackLink>
          </div>
        }
        title="Write a cover letter"
        description={`For ${role}, from your tailored resume${job.tailoredResume ? ` "${job.tailoredResume.title}"` : ""} and the skills you confirmed. Nothing is made up: anything we don't know is marked for you to fill in.`}
      />

      <Card as="form" onSubmit={generate} className="mt-6 space-y-6">
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <Choice legend="Tone" name="tone" options={TONES} value={options.tone} onChange={set("tone")} />
          <Choice legend="Length" name="length" options={LENGTHS} value={options.length} onChange={set("length")} />
          <Choice legend="Language" name="language" options={LANGUAGES} value={options.language} onChange={set("language")} />
        </div>
        <RecipientFields idPrefix="new" name={options.recipientName} salutation={options.recipientSalutation} onName={set("recipientName")} onSalutation={set("recipientSalutation")} />
        <GuidedAnswers idPrefix="new" values={options} language={options.language} onChange={(name, value) => set(name)(value)} />
        <div className="flex justify-end border-t border-line pt-5">
          <Button type="submit" variant="primary" loading={busy}>
            {busy ? "Writing..." : "Write cover letter"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------- Editor ----------

function LetterEditor({ id }) {
  const [letter, setLetter] = useState(null);
  const [resume, setResume] = useState(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("saved");
  const [regen, setRegen] = useState(null); // Regenerate options (start from the letter's own)
  const [confirm, setConfirm] = useState(null); // "regenerate" | "download" | { opening: index }
  const [busy, setBusy] = useState(false);
  const [fit, setFit] = useState(null);
  const [view, setView] = useState("edit"); // Phones and tablets: "edit" or "preview" (as in the resume editor)
  const pending = useRef({});
  const timer = useRef(null);
  const printRef = useRef(null);
  usePageTitle(letter?.title || "Cover letter");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/cover-letters/${id}`);
        setLetter(data);
        setRegen({ tone: data.tone, length: data.length, language: data.language, ...answersOf(data) });
        setResume((await api.get(`/resumes/${data.resumeId}`)).data);
      } catch (error) {
        setFailed(true);
        toast.error(getErrorMessage(error));
      }
    })();
  }, [id]);

  // Autosave: changed fields are sent together, a moment after the last change
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    const fields = pending.current;
    if (!Object.keys(fields).length) return;
    pending.current = {};
    setStatus("saving");
    try {
      const { data } = await api.put(`/cover-letters/${id}`, fields);
      setLetter((previous) => ({ ...previous, bodyEdited: data.bodyEdited, updatedAt: data.updatedAt, strength: data.strength }));
      setStatus(Object.keys(pending.current).length ? "unsaved" : "saved");
    } catch (error) {
      pending.current = { ...fields, ...pending.current };
      setStatus("error");
      toast.error(getErrorMessage(error));
    }
  }, [id]);
  const update = (fields) => {
    setLetter((previous) => ({ ...previous, ...fields }));
    pending.current = { ...pending.current, ...fields };
    setStatus("unsaved");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // The letter is drawn by the resume's template, always fitted to one page
  const previewResume = useMemo(() => resume && { ...resume, design: { ...resume.design, fitOnePage: true } }, [resume]);
  const previewLetter = useMemo(
    () =>
      letter && {
        body: letter.body,
        subject: letter.subject,
        date: letter.date,
        recipientName: letter.recipientName,
        recipientSalutation: letter.recipientSalutation,
        companyName: letter.companyName,
        language: letter.language,
      },
    [letter]
  );
  const placeholders = useMemo(() => (letter ? letterPlaceholders(letter) : []), [letter]);

  // PDF: the hidden printed copy in ResumePreview, with the template's fonts
  const resolved = useMemo(() => (resume ? resolveDesign(getTemplate(resume.template), resume.design).resolved : null), [resume]);
  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: letter?.title || "Cover letter",
    pageStyle: printPageStyle(resolved?.pageSize ?? "A4"),
    print: printWhenFontsReady(() => letter?.title || "Cover letter"), // Waits for the fonts in use, then prints
    onPrintError: reportPrintError,
  });
  const download = async () => {
    await save();
    if (placeholders.length) setConfirm("download");
    else print();
  };

  const regenerate = async () => {
    setConfirm(null);
    setBusy(true);
    clearTimeout(timer.current);
    delete pending.current.body; // The new body replaces any unsaved edit
    await save();
    try {
      const { data } = await api.post(`/cover-letters/${id}/regenerate`, {
        ...regen,
        salary: regen.language === "de" ? regen.salary : "",
        recipientName: letter.recipientName,
        recipientSalutation: letter.recipientName.trim() ? letter.recipientSalutation : "",
      });
      setLetter(data.coverLetter);
      toast.success("Letter rewritten");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  // Another of the generated openings (pending edits are saved first, so only the opening changes)
  const currentOpening = useMemo(() => openingOf(letter?.body), [letter?.body]);
  const chooseOpening = async (index) => {
    setConfirm(null);
    setBusy(true);
    await save();
    try {
      const { data } = await api.post(`/cover-letters/${id}/opening`, { index });
      setLetter((previous) => ({ ...previous, body: data.body, bodyEdited: data.bodyEdited, strength: data.strength }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const pickOpening = (index) => {
    const ownOpening = !letter.openingOptions.some((option) => normalize(option) === currentOpening);
    if (ownOpening) setConfirm({ opening: index });
    else chooseOpening(index);
  };

  if (failed) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <h1 className="type-h2 text-fg">We couldn't open this cover letter</h1>
        <Button as={Link} to="/dashboard" variant="primary" className="mt-6">
          Back to dashboard
        </Button>
      </div>
    );
  }
  if (!letter || !resume) return <Loader text="Opening your cover letter..." />;

  return (
    <div>
      {/* Top bar: the same as the resume editor's (sits just below the AppShell's bar) */}
      <div className="sticky top-16 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
          <Button as={Link} to={letter.jobId ? `/tailor/jobs/${letter.jobId}` : "/dashboard"} variant="ghost" iconOnly icon={ArrowLeft} aria-label="Back" title="Back" />
          <input
            value={letter.title}
            onChange={(event) => update({ title: event.target.value })}
            aria-label="Cover letter title"
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 type-h3 text-ellipsis text-fg outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-3 focus:ring-accent/15"
          />
          <span className="flex items-center gap-1.5 type-small text-fg-muted max-sm:sr-only" aria-live="polite">
            <span className={`size-2 rounded-full ${status === "error" ? "bg-danger" : status === "saved" ? "bg-success" : "bg-warning"}`} aria-hidden="true" />
            <span data-testid="letter-save-status">{STATUS_TEXT[status]}</span>
          </span>
          <Button as={Link} to={`/editor/${resume._id}`} icon={FileText} aria-label="Resume" className="max-md:w-9 max-md:px-0">
            <span className="hidden md:inline">Resume</span>
          </Button>
          <Button variant="primary" icon={Download} onClick={download} aria-label="Download PDF" className="max-sm:w-9 max-sm:px-0">
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>

        {/* Phones and tablets: Edit / Preview (side by side on large screens) */}
        <div className="mx-auto flex max-w-7xl px-4 pb-2.5 sm:px-6 lg:hidden">
          <Tabs
            variant="segmented"
            label="Show"
            value={view}
            onChange={setView}
            tabs={[
              { id: "edit", label: "Edit" },
              { id: "preview", label: "Preview" },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
        {/* Left: the letter (min-w-0: grid columns may shrink below the A4 preview's width) */}
        <div className={`min-w-0 space-y-4 ${view === "edit" ? "block" : "hidden"} lg:block`}>
          {placeholders.length > 0 && (
            <div data-testid="letter-placeholders">
              <Alert tone="warning" role="status" title={`Fill ${placeholders.length === 1 ? "this" : `these ${placeholders.length}`} before sending`}>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {placeholders.map((placeholder) => (
                    <li key={placeholder}>
                      <mark className="ats-placeholder text-fg">{placeholder}</mark>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 type-small">They're highlighted in yellow in the preview. Replace each one with your own words, or delete it.</p>
              </Alert>
            </div>
          )}

          <StrengthCheck strength={letter.strength} evidenceWords={letter.evidenceWords} />
          <OpeningPicker options={letter.openingOptions} current={currentOpening} busy={busy} onChoose={pickOpening} />

          <Card as="section" aria-labelledby="letter-recipient" className="space-y-4">
            <h2 id="letter-recipient" className="type-h3 text-fg">
              Recipient
            </h2>
            <RecipientFields
              idPrefix="edit"
              name={letter.recipientName}
              salutation={letter.recipientSalutation}
              onName={(recipientName) => update({ recipientName, ...(recipientName.trim() ? {} : { recipientSalutation: "" }) })}
              onSalutation={(recipientSalutation) => update({ recipientSalutation })}
            />
            <Field id="edit-company" label="Company">
              {(props) => <Input {...props} maxLength={120} value={letter.companyName} onChange={(event) => update({ companyName: event.target.value })} />}
            </Field>
          </Card>

          <Card as="section" aria-labelledby="letter-text" className="space-y-4">
            <h2 id="letter-text" className="type-h3 text-fg">
              Letter
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field id="edit-subject" label="Subject line">
                  {(props) => <Input {...props} maxLength={200} value={letter.subject} onChange={(event) => update({ subject: event.target.value })} />}
                </Field>
              </div>
              <Field id="edit-date" label="Date">
                {(props) => <Input {...props} type="date" value={toDateInput(letter.date)} onChange={(event) => event.target.value && update({ date: new Date(`${event.target.value}T12:00:00`).toISOString() })} />}
              </Field>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="type-label text-fg" id="letter-body-label">
                  Text
                </span>
                <span className="type-small text-fg-muted tabular-nums" data-testid="word-count">
                  {wordCount(letter.body)} words
                </span>
              </div>
              <RichTextEditor value={letter.body} onChange={(body) => update({ body })} ariaLabel="Cover letter text" minHeight="16rem" />
            </div>
          </Card>

          <Card as="section" aria-labelledby="letter-regenerate" className="space-y-5">
            <div>
              <h2 id="letter-regenerate" className="type-h3 text-fg">
                Regenerate
              </h2>
              <p className="mt-0.5 type-small text-fg-muted">Rewrite the text from your tailored resume with other options. It replaces the text above.</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-5">
              <Choice legend="Tone" name="regen-tone" options={TONES} value={regen.tone} onChange={(tone) => setRegen((r) => ({ ...r, tone }))} />
              <Choice legend="Length" name="regen-length" options={LENGTHS} value={regen.length} onChange={(length) => setRegen((r) => ({ ...r, length }))} />
              <Choice legend="Language" name="regen-language" options={LANGUAGES} value={regen.language} onChange={(language) => setRegen((r) => ({ ...r, language }))} />
            </div>
            <GuidedAnswers idPrefix="regen" values={regen} language={regen.language} onChange={(name, value) => setRegen((r) => ({ ...r, [name]: value }))} />
            <div className="flex justify-end border-t border-line pt-5">
              <Button onClick={() => (letter.bodyEdited || pending.current.body !== undefined ? setConfirm("regenerate") : regenerate())} disabled={!letter.jobId} loading={busy}>
                {busy ? "Rewriting..." : "Regenerate"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: live preview (scaled to the column's width) */}
        <div className={`min-w-0 ${view === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-36 lg:max-h-workspace lg:overflow-y-auto lg:p-1">
            <p className="mb-3 hidden type-eyebrow text-fg-muted lg:block">Live preview · {getTemplate(resume.template).name}</p>
            {fit?.fitStatus && !fit.fitStatus.pending && !fit.fitStatus.fits && (
              <div className="mb-3">
                <Alert tone="warning" role="status">
                  This letter is longer than one page. Shorten it, or choose a shorter length.
                </Alert>
              </div>
            )}
            <ResumePreview resume={previewResume} letter={previewLetter} printRef={printRef} highlightPlaceholders onStatus={setFit} />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirm === "regenerate"}
        title="Replace your edits?"
        message="You've changed the text by hand. Regenerating replaces it with a new letter, and your edits will be lost."
        confirmText="Replace my edits"
        onConfirm={regenerate}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.opening !== undefined}
        title="Replace your opening?"
        message="You've written your own opening paragraph. Choosing a generated one replaces it; the rest of the letter stays as it is."
        confirmText="Replace my opening"
        onConfirm={() => chooseOpening(confirm.opening)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === "download"}
        title="Some placeholders are still unfilled"
        message={`Your letter still contains ${placeholders.join(", ")}. Replace them before sending, or download anyway.`}
        confirmText="Download anyway"
        onConfirm={() => {
          setConfirm(null);
          print();
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
