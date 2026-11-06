import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "../utils/toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import { TEMPLATES } from "../templates/registry";
import { toUploadFile, validateFile } from "../utils/resumeFile";
import { Loader2 } from "lucide-react";
import Dialog from "./ui/Dialog";
import Button from "./ui/Button";
import { Alert } from "./ui/Display";
import FileDropzone from "./ui/FileDropzone";
import TemplatePicker from "./editor/TemplatePicker";

// Used when the user closes the "choose a template" step without picking one
const FALLBACK_TEMPLATE = TEMPLATES.find((template) => template.tier === "basic");

// Modal to upload an existing resume (PDF/DOCX). The server reads it and creates a new resume.
//   onStartFromScratch - called when the user gives up on importing and wants a blank resume
//   initialFile        - optional file to import straight away (e.g. one checked on the ATS page)
export default function ImportResumeModal({ onClose, onStartFromScratch, initialFile = null }) {
  const navigate = useNavigate();
  const startedInitialUpload = useRef(false); // StrictMode runs effects twice in development

  const [status, setStatus] = useState("idle"); // "idle" | "uploading" | "reading" | "failed" | "choose"
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

      // Next step: the user picks a template (the resume was saved without one)
      setImportedResume(data.resume);
      setImportWarnings(data.warnings ?? []);
      setStatus("choose");
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

  // Saves the chosen template, then opens the editor.
  // The editor shows a "please check your resume" banner when it sees imported: true
  // (plus a note for any import warnings).
  const saveTemplateAndOpenEditor = async (template, wasChosen) => {
    setSavingTemplateId(template.id);
    try {
      await api.put(`/resumes/${importedResume._id}`, { template: template.id });
      if (wasChosen) {
        toast.success("Resume imported");
      } else {
        toast.success(`We used the ${template.name} template. You can change it anytime with the Templates button.`, {
          duration: 6000,
        });
      }
    } catch (error) {
      // The resume itself is already saved, so carry on to the editor anyway
      toast.error(`Couldn't save the template: ${getErrorMessage(error)}`);
    }
    navigate(`/editor/${importedResume._id}`, { state: { imported: true, importWarnings } });
  };

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

  // Step 2 after a successful upload: choose a template (full screen, with the imported data)
  if (status === "choose") {
    return (
      <TemplatePicker
        resume={importedResume}
        fullScreen
        title="Choose a template for your resume"
        description="Every template below is filled with your imported resume. Pick one to continue. You can change it later."
        closeLabel="Skip for now"
        savingId={savingTemplateId}
        onSelect={(template) => saveTemplateAndOpenEditor(template, true)}
        onClose={() => saveTemplateAndOpenEditor(FALLBACK_TEMPLATE, false)}
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
