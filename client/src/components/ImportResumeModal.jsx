import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "../utils/toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import { toUploadFile, validateFile } from "../utils/resumeFile";
import { describeOriginal } from "../utils/originalFile";
import { ChevronRight, FileCheck2, Loader2, PenLine } from "lucide-react";
import Dialog from "./ui/Dialog";
import Button from "./ui/Button";
import BackLink from "./ui/BackLink";
import { Alert } from "./ui/Display";
import FileDropzone from "./ui/FileDropzone";
import TemplatePicker from "./editor/TemplatePicker";
import OriginalDocument from "./original/OriginalDocument";
import MatchedDesign from "./original/MatchedDesign";
import { saveChosenTemplate, saveMatchedTemplate, useMatchedDesign } from "./original/applyTemplate";

// One of the two choices after an upload: a whole-card button
function ChoiceCard({ icon: Icon, title, description, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block type-label text-fg">{title}</span>
        <span className="mt-0.5 block type-small text-fg-muted">{description}</span>
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
    </button>
  );
}

// Modal to upload an existing resume (PDF/DOCX). The server reads it, keeps the file, and creates
// a new resume. Then the user sees their own file first, and chooses:
//   "Keep my original design" -> the original's page (view, ATS check, download unchanged)
//   "Edit with a matching template" -> the original beside the closest template, styled like it
//     -> "Use this" or "Choose a different template" -> the editor
// Nothing switches to a template on its own.
//   onImported         - called with the new resume once it's saved (so a list can show it)
//   onStartFromScratch - called when the user gives up on importing and wants a blank resume
//   initialFile        - optional file to import straight away (e.g. one checked on the ATS page)
export default function ImportResumeModal({ onClose, onImported, onStartFromScratch, initialFile = null }) {
  const navigate = useNavigate();
  const startedInitialUpload = useRef(false); // StrictMode runs effects twice in development

  // "idle" | "uploading" | "reading" | "failed" | "original" | "match" | "choose"
  const [status, setStatus] = useState("idle");
  const [importedResume, setImportedResume] = useState(null); // Set when the upload worked
  const [importWarnings, setImportWarnings] = useState([]); // e.g. "experience-bullets-unassigned"
  const [savingTemplateId, setSavingTemplateId] = useState(null);
  const [progress, setProgress] = useState(0); // Upload progress, 0-100
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState(""); // Problem found before uploading
  const [serverError, setServerError] = useState(""); // Problem reported by the server

  const isBusy = status === "uploading" || status === "reading";

  // Dropping a file outside the drop area would make the browser open it - stop that
  useEffect(() => {
    const preventDefault = (event) => event.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const uploadFile = async (file) => {
    const problem = validateFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }

    setFileError("");
    setServerError("");
    setFileName(file.name);
    setProgress(0);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", toUploadFile(file));

    try {
      const { data } = await api.post("/resumes/import", formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
          if (percent === 100) setStatus("reading"); // Uploaded; the server is now reading it
        },
      });

      // Next: the user sees their original (the resume was saved without a template)
      setImportedResume(data.resume);
      setImportWarnings(data.warnings ?? []);
      onImported?.(data.resume);
      setStatus("original");
    } catch (error) {
      setServerError(getErrorMessage(error));
      setStatus("failed");
    }
  };

  // Import a file we were handed straight away, without the "choose a file" step
  useEffect(() => {
    if (initialFile && !startedInitialUpload.current) {
      startedInitialUpload.current = true;
      uploadFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, []);

  const match = useMatchedDesign(importedResume ?? {});
  const [savingMatch, setSavingMatch] = useState(false);

  // Saves the template (and design) to edit in, then opens the editor. The editor shows a
  // "please check your resume" banner when it sees imported: true (plus any import warnings).
  const openInEditor = async (save, setSaving) => {
    setSaving(true);
    try {
      await save();
      toast.success("Resume imported");
      navigate(`/editor/${importedResume._id}`, { state: { imported: true, importWarnings } });
    } catch (error) {
      toast.error(`Couldn't save the template: ${getErrorMessage(error)}`);
      setSaving(false);
    }
  };
  const applyMatch = (matched) => openInEditor(() => saveMatchedTemplate(importedResume._id, matched), setSavingMatch);
  const applyTemplate = (template) => openInEditor(() => saveChosenTemplate(importedResume._id, template.id, match), (on) => setSavingTemplateId(on ? template.id : null));

  const handleFiles = (files) => {
    if (files.length > 1) {
      setFileError("Please choose just one file.");
      return;
    }
    if (files[0]) uploadFile(files[0]);
  };

  const tryAgain = () => {
    setStatus("idle");
    setServerError("");
  };

  // After the upload: the user's own file, and what to do with it
  if (status === "original") {
    return (
      <Dialog size="lg" title="Your original" description={describeOriginal(importedResume.original)} onClose={onClose}>
        <div className="grid items-start gap-6 md:grid-cols-2">
          {/* The whole first page (on phones under the choices, which are what to act on) */}
          <div className="order-2 flex justify-center md:order-1">
            <OriginalDocument resume={importedResume} pages="first" width={260} />
          </div>
          <div className="order-1 space-y-3 md:order-2">
            <p className="type-body text-fg">We kept your file exactly as you uploaded it. What would you like to do?</p>
            <ChoiceCard
              icon={FileCheck2}
              title="Keep my original design"
              description="View it, check its ATS score and download it unchanged."
              onClick={() => navigate(`/resumes/${importedResume._id}/original`)}
              testId="keep-original"
            />
            <ChoiceCard
              icon={PenLine}
              title="Edit with a matching template"
              description="Editing rebuilds your resume in one of our templates, styled to look like your file."
              onClick={() => setStatus("match")}
              testId="edit-with-template"
            />
            <p className="type-small text-fg-muted">Either way, your original stays available from the dashboard and the editor.</p>
          </div>
        </div>
      </Dialog>
    );
  }

  // The original beside the matching template
  if (status === "match") {
    return (
      <Dialog size="lg" title="Edit with a matching template" onClose={onClose}>
        <div className="mb-4">
          <BackLink onClick={() => setStatus("original")}>Your original</BackLink>
        </div>
        <MatchedDesign resume={importedResume} onUse={applyMatch} onChooseOther={() => setStatus("choose")} busy={savingMatch} />
      </Dialog>
    );
  }

  // "Choose a different template" (full screen, with the imported data)
  if (status === "choose") {
    return (
      <TemplatePicker
        resume={importedResume}
        fullScreen
        title="Choose a template for your resume"
        description="Every template below is filled with your imported resume, in your section order. Pick one to continue. You can change it later."
        closeLabel="Back"
        savingId={savingTemplateId}
        onSelect={applyTemplate}
        onClose={() => setStatus("match")}
      />
    );
  }

  return (
    // While uploading, Escape and outside clicks don't close it (and there's no close button)
    <Dialog
      size="md"
      title="Upload your existing resume"
      description="We'll read your PDF or Word file and fill in the editor for you."
      onClose={() => !isBusy && onClose()}
      headerAction={isBusy ? <span /> : undefined}
    >
      {/* ---------- Uploading / reading ---------- */}
      {isBusy && (
        <div className="rounded-xl border border-line bg-surface-2 px-6 py-10 text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto size-8 animate-spin text-accent" aria-hidden="true" />
          <p className="mt-4 type-label text-fg">{status === "uploading" ? `Uploading… ${progress}%` : "Reading your resume..."}</p>
          <p className="mt-1 truncate type-small text-fg-muted">{fileName}</p>
          {status === "reading" && <p className="mt-3 type-small text-fg-subtle">This usually takes a few seconds.</p>}
          {status === "uploading" && (
            <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* ---------- Failed ---------- */}
      {status === "failed" && (
        <Alert
          tone="danger"
          title={`We couldn't import ${fileName || "this file"}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={tryAgain}>
                Try another file
              </Button>
              <Button size="sm" variant="primary" onClick={onStartFromScratch}>
                Start from scratch instead
              </Button>
            </div>
          }
        >
          {serverError}
        </Alert>
      )}

      {/* ---------- Choose / drop a file ---------- */}
      {status === "idle" && (
        <>
          <FileDropzone onFiles={handleFiles} disabled={isBusy} primary chooseProps={{ "data-autofocus": true }} />

          {fileError && (
            <div className="mt-3">
              <Alert tone="danger">{fileError}</Alert>
            </div>
          )}

          <p className="mt-4 type-small text-fg-muted">Tip: text-based PDFs (exported from Word or Google Docs) work best. Scanned images can't be read.</p>
        </>
      )}
    </Dialog>
  );
}
