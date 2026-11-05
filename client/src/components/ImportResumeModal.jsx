import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "../utils/toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import { TEMPLATES } from "../templates/registry";
import { ACCEPT_ATTRIBUTE, MAX_SIZE_MB, toUploadFile, validateFile } from "../utils/resumeFile";
import Modal from "./Modal";
import TemplatePicker from "./editor/TemplatePicker";

// Used when the user closes the "choose a template" step without picking one
const FALLBACK_TEMPLATE = TEMPLATES.find((template) => template.tier === "basic");

// Modal to upload an existing resume (PDF/DOCX). The server reads it and creates a new resume.
//   onStartFromScratch - called when the user gives up on importing and wants a blank resume
//   initialFile        - optional file to import straight away (e.g. one checked on the ATS page)
export default function ImportResumeModal({ onClose, onStartFromScratch, initialFile = null }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const startedInitialUpload = useRef(false); // StrictMode runs effects twice in development

  const [status, setStatus] = useState("idle"); // "idle" | "uploading" | "reading" | "failed" | "choose"
  const [importedResume, setImportedResume] = useState(null); // Set when the upload worked
  const [importWarnings, setImportWarnings] = useState([]); // e.g. "experience-bullets-unassigned"
  const [savingTemplateId, setSavingTemplateId] = useState(null);
  const [progress, setProgress] = useState(0); // Upload progress, 0-100
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState(""); // Problem found before uploading
  const [serverError, setServerError] = useState(""); // Problem reported by the server
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isBusy) handleFiles(event.dataTransfer.files);
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
    // While uploading, Escape and outside clicks don't close the modal
    <Modal onClose={() => !isBusy && onClose()} labelledBy="import-modal-title" className="max-w-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="import-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            Upload your existing resume
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            We'll read your PDF or Word file and fill in the editor for you.
          </p>
        </div>
        {!isBusy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ---------- Uploading / reading ---------- */}
      {isBusy && (
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-10 text-center" role="status" aria-live="polite">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600" />
          <p className="mt-4 font-medium text-slate-900 dark:text-white">
            {status === "uploading" ? `Uploading… ${progress}%` : "Reading your resume..."}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{fileName}</p>
          {status === "reading" && <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">This usually takes a few seconds.</p>}
          {status === "uploading" && (
            <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* ---------- Failed ---------- */}
      {status === "failed" && (
        <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-5" role="alert">
          <p className="font-medium text-red-800 dark:text-red-200">We couldn't import {fileName || "this file"}</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{serverError}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={tryAgain} className="btn-secondary">
              Try another file
            </button>
            <button type="button" onClick={onStartFromScratch} className="btn-primary">
              Start from scratch instead
            </button>
          </div>
        </div>
      )}

      {/* ---------- Choose / drop a file ---------- */}
      {status === "idle" && (
        <>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-6 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60" : "border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30"
            }`}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-slate-900 dark:text-white">
              {isDragging ? "Drop your file here" : "Drag and drop your resume here"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">or</p>
            <button type="button" onClick={() => inputRef.current.click()} className="btn-primary mt-3">
              Choose file
            </button>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">PDF or DOCX, up to {MAX_SIZE_MB} MB</p>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = ""; // Allow choosing the same file again
              }}
            />
          </div>

          {fileError && (
            <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
              {fileError}
            </p>
          )}

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Tip: text-based PDFs (exported from Word or Google Docs) work best. Scanned images can't be read.
          </p>
        </>
      )}
    </Modal>
  );
}
