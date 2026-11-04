import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
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

// Cover letters (/cover-letters/new?job=<jobId> and /cover-letters/:id), via /api/cover-letters:
//   new    - generate a letter for a tailored job: tone, length, language, the recipient (name and
//            salutation) and the optional "Why this company?" answer
//   editor - the same layout as the resume editor: the letter's fields and rich text body on the
//            left, a live preview on the right drawn by the linked resume's template and palette
//            (so they look like a matching set), always fitted to one page. Regenerate (with a
//            warning before replacing hand edits), highlighted placeholders, and a PDF download
//            that warns while placeholders are still unfilled.

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

const wordCount = (html) => toPlainText(html ?? "").split(/\s+/).filter(Boolean).length;
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

function WhyCompany({ value, onChange, id }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        Why this company? <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <textarea id={id} rows={3} maxLength={600} className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="One or two sentences in your own words. If you leave it empty, the letter marks the spot for you to fill in." />
    </div>
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
  const [options, setOptions] = useState({ tone: "professional", length: "standard", language: "en", recipientName: "", recipientSalutation: "", whyCompany: "" });
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
      const { data } = await api.post("/cover-letters/generate", { jobId, ...options, recipientSalutation: options.recipientName.trim() ? options.recipientSalutation : "" });
      toast.success(data.placeholders.length ? `Letter written. Fill in ${data.placeholders.length} marked ${data.placeholders.length === 1 ? "spot" : "spots"} before sending.` : "Letter written.");
      navigate(`/cover-letters/${data.coverLetter._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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
        <WhyCompany id="new-why" value={options.whyCompany} onChange={set("whyCompany")} />
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
  const [confirm, setConfirm] = useState(null); // "regenerate" | "download"
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
        setRegen({ tone: data.tone, length: data.length, language: data.language, whyCompany: data.whyCompany ?? "" });
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
      setLetter((previous) => ({ ...previous, bodyEdited: data.bodyEdited, updatedAt: data.updatedAt }));
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

  if (failed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
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
        {/* Left: the letter */}
        <div className="space-y-4">
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
            <WhyCompany id="regen-why" value={regen.whyCompany} onChange={(whyCompany) => setRegen((r) => ({ ...r, whyCompany }))} />
            <div className="flex justify-end">
              <button type="button" onClick={() => (letter.bodyEdited || pending.current.body !== undefined ? setConfirm("regenerate") : regenerate())} disabled={busy || !letter.jobId} className="btn-secondary">
                {busy ? "Rewriting..." : "Regenerate"}
              </button>
            </div>
          </section>
        </div>

        {/* Right: live preview */}
        <div>
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
