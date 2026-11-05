import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { toPlainText } from "../utils/richText";
import printPageStyle from "../utils/printPageStyle";
import { getTemplate } from "../templates/registry";
import { resolveDesign, usedFontIds } from "../templates/design";
import { getPrintFonts } from "../templates/fonts";
import { letterPlaceholders } from "../templates/prepareLetter";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import ResumePreview from "../components/ResumePreview";
import RichTextEditor from "../components/editor/RichTextEditor";
import { pageClass } from "../components/ui/pageLayout";

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

function Choice({ legend, name, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, label, detail]) => (
          <label
            key={optionValue}
            className={`cursor-pointer rounded-lg px-3 py-2 text-sm ring-1 transition has-focus-visible:ring-2 has-focus-visible:ring-indigo-500 ${
              value === optionValue ? "bg-indigo-50 font-medium text-indigo-800 ring-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200" : "text-slate-700 ring-slate-200 hover:ring-indigo-300 dark:text-slate-300 dark:ring-slate-700"
            }`}
          >
            <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} className="sr-only" />
            {label}
            {detail && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">{detail}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RecipientFields({ name, salutation, onName, onSalutation, idPrefix }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div>
        <label htmlFor={`${idPrefix}-recipient`} className="label">
          Recipient's name <span className="font-normal text-slate-400">(if you know it)</span>
        </label>
        <input id={`${idPrefix}-recipient`} className="input" maxLength={120} value={name} onChange={(event) => onName(event.target.value)} placeholder="e.g. Anna Schmidt" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-salutation`} className="label">
          Salutation
        </label>
        <select id={`${idPrefix}-salutation`} className="input" value={salutation} onChange={(event) => onSalutation(event.target.value)} disabled={!name.trim()}>
          {SALUTATIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// The guided answers: short, optional, in the user's own words. Only these (and the resume) go
// into the letter; empty ones become marked spots, never invented text.
function GuidedAnswers({ values, language, onChange, idPrefix }) {
  const field = (name) => ({ id: `${idPrefix}-${name}`, className: "input", value: values[name], onChange: (event) => onChange(name, event.target.value) });
  const optional = <span className="font-normal text-slate-400">(optional)</span>;
  return (
    <fieldset className="space-y-4">
      <legend className="label">In your own words</legend>
      <p className="-mt-1 text-sm text-slate-500 dark:text-slate-400">All optional, but they make the letter yours. Anything you leave empty is marked for you to fill in, never made up.</p>
      <div>
        <label htmlFor={`${idPrefix}-achievement`} className="label">
          Your strongest achievement for this job {optional}
        </label>
        <textarea {...field("achievement")} rows={3} maxLength={600} placeholder="A short story: the situation, what you did, the result. E.g. “Our nightly billing job kept timing out, so I rewrote it as a stream; it now finishes in 4 minutes.”" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-why`} className="label">
          Why this company? {optional}
        </label>
        <textarea {...field("whyCompany")} id={`${idPrefix}-why`} rows={2} maxLength={600} placeholder="One or two sentences in your own words." />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-interest`} className="label">
          Anything specific about the company that interests you? {optional}
        </label>
        <input {...field("companyInterest")} id={`${idPrefix}-interest`} maxLength={400} placeholder="A product, a project, a value. E.g. “your open-source ledger library”" />
      </div>
      <div className={`grid gap-4 ${language === "de" ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label htmlFor={`${idPrefix}-availability`} className="label">
            Earliest start date {optional}
          </label>
          <input {...field("availability")} maxLength={120} placeholder={language === "de" ? "z. B. 1. April 2027 / sofort" : "e.g. 1 March 2027 / immediately"} />
        </div>
        {language === "de" && (
          <div>
            <label htmlFor={`${idPrefix}-salary`} className="label">
              Gehaltsvorstellung {optional}
            </label>
            <input {...field("salary")} maxLength={80} placeholder="z. B. 75.000 € brutto im Jahr" />
          </div>
        )}
      </div>
    </fieldset>
  );
}

// The letter strength check from the server (opening, evidence, motivation, clichés, length,
// placeholders): pass, warning (amber) or fail, with a tip for each one that isn't a pass.
//   evidenceWords - set when the requested length couldn't be reached because the resume has no
//                   more matching evidence (the letter is never padded): a note under the length
const STATUS_ICONS = {
  pass: [CheckCircle2, "text-emerald-600 dark:text-emerald-400", "Passed"],
  warn: [AlertTriangle, "text-amber-500 dark:text-amber-400", "Warning"],
  fail: [XCircle, "text-rose-600 dark:text-rose-400", "Needs work"],
};
function StrengthCheck({ strength, evidenceWords }) {
  if (!strength) return null;
  return (
    <section className="card p-5" aria-labelledby="letter-strength" data-testid="letter-strength">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="letter-strength" className="font-semibold text-slate-900 dark:text-white">
          Letter strength
        </h2>
        <span className="text-sm font-medium text-slate-600 tabular-nums dark:text-slate-300">
          {strength.passed} of {strength.total} checks passed
          {strength.warnings > 0 && ` · ${strength.warnings} ${strength.warnings === 1 ? "warning" : "warnings"}`}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {strength.checks.map((check) => {
          const status = check.status ?? (check.passed ? "pass" : "fail");
          const [Icon, color, label] = STATUS_ICONS[status];
          return (
            <li key={check.id} className="flex gap-2.5 text-sm" data-check={check.id} data-passed={check.passed} data-status={status}>
              <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-label={label} />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{check.label}</p>
                {check.tip && <p className="mt-0.5 text-slate-500 dark:text-slate-400">{check.tip}</p>}
                {check.id === "length" && status !== "pass" && evidenceWords > 0 && (
                  <p className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" data-testid="length-note">
                    Your resume has evidence for about {evidenceWords} words. Add an achievement story or a company detail to make it longer.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// The three generated openings: the one in the letter is selected; choosing another replaces only
// the paragraph after the greeting
function OpeningPicker({ options, current, busy, onChoose }) {
  if (!options?.length) return null;
  const selected = options.findIndex((option) => normalize(option) === current);
  return (
    <section className="card space-y-3 p-5" aria-labelledby="letter-openings">
      <div>
        <h2 id="letter-openings" className="font-semibold text-slate-900 dark:text-white">
          Opening
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {selected === -1 ? "You've written your own opening. Choosing one of these replaces it." : "Three ways to open, from your real experience. Pick the one that sounds most like you."}
        </p>
      </div>
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
            className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ring-1 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60 ${
              index === selected ? "bg-indigo-50 text-indigo-900 ring-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-100" : "text-slate-700 ring-slate-200 hover:ring-indigo-300 dark:text-slate-300 dark:ring-slate-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
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
        <p className="font-medium text-slate-900 dark:text-white">Choose a job first: cover letters are written for a tailored resume and its job.</p>
        <Link to="/tailor" className="btn-primary mt-6">
          Tailor to a job
        </Link>
      </div>
    );
  }
  if (!job) return <Loader text="Loading the job..." />;
  const role = [job.analysis.title, job.analysis.company].filter(Boolean).join(" – ") || "this job";

  return (
    <div className={pageClass()}>
      <Link to={`/tailor/jobs/${jobId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the match report
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Write a cover letter</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        For {role}, from your tailored resume{job.tailoredResume ? ` "${job.tailoredResume.title}"` : ""} and the skills you confirmed. Nothing is made up: anything we don't know is marked for you to fill in.
      </p>

      <form onSubmit={generate} className="card mt-6 space-y-6 p-5 sm:p-6">
        <Choice legend="Tone" name="tone" options={TONES} value={options.tone} onChange={set("tone")} />
        <Choice legend="Length" name="length" options={LENGTHS} value={options.length} onChange={set("length")} />
        <Choice legend="Language" name="language" options={LANGUAGES} value={options.language} onChange={set("language")} />
        <RecipientFields idPrefix="new" name={options.recipientName} salutation={options.recipientSalutation} onName={set("recipientName")} onSalutation={set("recipientSalutation")} />
        <GuidedAnswers idPrefix="new" values={options} language={options.language} onChange={(name, value) => set(name)(value)} />
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Writing..." : "Write cover letter"}
          </button>
        </div>
      </form>
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
  const fontIds = resolved ? usedFontIds(resolved).join(",") : "";
  const [printFonts, setPrintFonts] = useState([]);
  useEffect(() => {
    let ignore = false;
    getPrintFonts(fontIds ? fontIds.split(",") : []).then((fonts) => !ignore && setPrintFonts(fonts));
    return () => {
      ignore = true;
    };
  }, [fontIds]);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: letter?.title || "Cover letter", pageStyle: printPageStyle(resolved?.pageSize ?? "A4"), fonts: printFonts });
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
        <p className="font-medium text-slate-900 dark:text-white">We couldn't open this cover letter.</p>
        <Link to="/dashboard" className="btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    );
  }
  if (!letter || !resume) return <Loader text="Opening your cover letter..." />;

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-16 z-5 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to={letter.jobId ? `/tailor/jobs/${letter.jobId}` : "/dashboard"} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Back">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <input value={letter.title} onChange={(event) => update({ title: event.target.value })} aria-label="Cover letter title" className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-lg font-semibold text-slate-900 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-indigo-500/30 dark:text-white dark:hover:bg-slate-800" />
          <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400" aria-live="polite" data-testid="letter-save-status">
            {STATUS_TEXT[status]}
          </span>
          <Link to={`/editor/${resume._id}`} className="btn-secondary hidden shrink-0 md:inline-flex">
            Resume
          </Link>
          <button type="button" onClick={download} className="btn-primary shrink-0">
            Download PDF
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
        {/* Left: the letter (min-w-0: grid columns may shrink below the A4 preview's width) */}
        <div className="min-w-0 space-y-4">
          {placeholders.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200" data-testid="letter-placeholders">
              <p className="font-semibold">
                Fill {placeholders.length === 1 ? "this" : `these ${placeholders.length}`} before sending
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {placeholders.map((placeholder) => (
                  <li key={placeholder}>
                    <mark className="ats-placeholder">{placeholder}</mark>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">They're highlighted in yellow in the preview. Replace each one with your own words, or delete it.</p>
            </section>
          )}

          <StrengthCheck strength={letter.strength} evidenceWords={letter.evidenceWords} />
          <OpeningPicker options={letter.openingOptions} current={currentOpening} busy={busy} onChoose={pickOpening} />

          <section className="card space-y-4 p-5" aria-labelledby="letter-recipient">
            <h2 id="letter-recipient" className="font-semibold text-slate-900 dark:text-white">
              Recipient
            </h2>
            <RecipientFields
              idPrefix="edit"
              name={letter.recipientName}
              salutation={letter.recipientSalutation}
              onName={(recipientName) => update({ recipientName, ...(recipientName.trim() ? {} : { recipientSalutation: "" }) })}
              onSalutation={(recipientSalutation) => update({ recipientSalutation })}
            />
            <div>
              <label htmlFor="edit-company" className="label">
                Company
              </label>
              <input id="edit-company" className="input" maxLength={120} value={letter.companyName} onChange={(event) => update({ companyName: event.target.value })} />
            </div>
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="letter-text">
            <h2 id="letter-text" className="font-semibold text-slate-900 dark:text-white">
              Letter
            </h2>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div>
                <label htmlFor="edit-subject" className="label">
                  Subject line
                </label>
                <input id="edit-subject" className="input" maxLength={200} value={letter.subject} onChange={(event) => update({ subject: event.target.value })} />
              </div>
              <div>
                <label htmlFor="edit-date" className="label">
                  Date
                </label>
                <input id="edit-date" type="date" className="input" value={toDateInput(letter.date)} onChange={(event) => event.target.value && update({ date: new Date(`${event.target.value}T12:00:00`).toISOString() })} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="label mb-0" id="letter-body-label">
                  Text
                </span>
                <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400" data-testid="word-count">
                  {wordCount(letter.body)} words
                </span>
              </div>
              <RichTextEditor value={letter.body} onChange={(body) => update({ body })} ariaLabel="Cover letter text" minHeight="16rem" />
            </div>
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="letter-regenerate">
            <div>
              <h2 id="letter-regenerate" className="font-semibold text-slate-900 dark:text-white">
                Regenerate
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rewrite the text from your tailored resume with other options. It replaces the text above.</p>
            </div>
            <Choice legend="Tone" name="regen-tone" options={TONES} value={regen.tone} onChange={(tone) => setRegen((r) => ({ ...r, tone }))} />
            <Choice legend="Length" name="regen-length" options={LENGTHS} value={regen.length} onChange={(length) => setRegen((r) => ({ ...r, length }))} />
            <Choice legend="Language" name="regen-language" options={LANGUAGES} value={regen.language} onChange={(language) => setRegen((r) => ({ ...r, language }))} />
            <GuidedAnswers idPrefix="regen" values={regen} language={regen.language} onChange={(name, value) => setRegen((r) => ({ ...r, [name]: value }))} />
            <div className="flex justify-end">
              <button type="button" onClick={() => (letter.bodyEdited || pending.current.body !== undefined ? setConfirm("regenerate") : regenerate())} disabled={busy || !letter.jobId} className="btn-secondary">
                {busy ? "Rewriting..." : "Regenerate"}
              </button>
            </div>
          </section>
        </div>

        {/* Right: live preview (scaled to the column's width) */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:p-1">
            <p className="mb-3 hidden text-xs font-medium tracking-wider text-slate-400 uppercase lg:block dark:text-slate-500">Live preview · {getTemplate(resume.template).name}</p>
            {fit?.fitStatus && !fit.fitStatus.pending && !fit.fitStatus.fits && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" role="status">
                This letter is longer than one page. Shorten it, or choose a shorter length.
              </p>
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
