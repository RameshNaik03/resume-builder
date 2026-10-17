import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import Modal from "./Modal";

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Returns an error message for files we can't import, or null if the file looks fine
function validateFile(file) {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === ".doc") {
    return "Old .doc files aren't supported. In Word, use File → Save As → Word Document (.docx), then try again.";
  }
  if (!ACCEPTED_TYPES[extension]) return "Please choose a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum size is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

// Modal to upload an existing resume (PDF/DOCX). The server reads it and creates a new resume.
//   onStartFromScratch - called when the user gives up on importing and wants a blank resume
export default function ImportResumeModal({ onClose, onStartFromScratch }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [status, setStatus] = useState("idle"); // "idle" | "uploading" | "reading" | "failed"
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

    // Re-wrap the file with the correct type (some systems report .docx files with no type)
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)[0];
    const formData = new FormData();
    formData.append("file", new File([file], file.name, { type: ACCEPTED_TYPES[extension] }));

    try {
      const { data } = await api.post("/resumes/import", formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
          if (percent === 100) setStatus("reading"); // Uploaded; the server is now reading it
        },
      });

      toast.success("Resume imported");
      // The editor shows a "please check your resume" banner when it sees imported: true
      navigate(`/editor/${data.resume._id}`, { state: { imported: true } });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setStatus("failed");
    }
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

  return (
    // While uploading, Escape and outside clicks don't close the modal
    <Modal onClose={() => !isBusy && onClose()} labelledBy="import-modal-title" className="max-w-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="import-modal-title" className="text-lg font-semibold text-slate-900">
            Upload your existing resume
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            We'll read your PDF or Word file and fill in the editor for you.
          </p>
        </div>
        {!isBusy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ---------- Uploading / reading ---------- */}
      {isBusy && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center" role="status" aria-live="polite">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 font-medium text-slate-900">
            {status === "uploading" ? `Uploading… ${progress}%` : "Reading your resume..."}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500">{fileName}</p>
          {status === "reading" && <p className="mt-3 text-xs text-slate-400">This usually takes a few seconds.</p>}
          {status === "uploading" && (
            <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* ---------- Failed ---------- */}
      {status === "failed" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
          <p className="font-medium text-red-800">We couldn't import {fileName || "this file"}</p>
          <p className="mt-1 text-sm text-red-700">{serverError}</p>
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
              isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50/50"
            }`}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-slate-900">
              {isDragging ? "Drop your file here" : "Drag and drop your resume here"}
            </p>
            <p className="mt-1 text-sm text-slate-500">or</p>
            <button type="button" onClick={() => inputRef.current.click()} className="btn-primary mt-3">
              Choose file
            </button>
            <p className="mt-4 text-xs text-slate-400">PDF or DOCX, up to {MAX_SIZE_MB} MB</p>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = ""; // Allow choosing the same file again
              }}
            />
          </div>

          {fileError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {fileError}
            </p>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Tip: text-based PDFs (exported from Word or Google Docs) work best. Scanned images can't be read.
          </p>
        </>
      )}
    </Modal>
  );
}
