import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Button from "./Button";
import { ACCEPT_ATTRIBUTE, MAX_SIZE_MB } from "../../utils/resumeFile";

// Drop a resume file here, or choose one (PDF or DOCX).
//   onFiles      - called with the FileList (dropped or chosen); the caller checks it
//   disabled     - ignores drops (e.g. while uploading)
//   primary      - "Choose file" is the view's main action (in the import dialog)
//   chooseProps  - extra props for the button (e.g. data-autofocus)
export default function FileDropzone({ onFiles, disabled = false, primary = false, chooseProps = {} }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) onFiles(event.dataTransfer.files);
      }}
      className={`rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${isDragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2"}`}
    >
      <Upload className="mx-auto size-6 text-fg-muted" aria-hidden="true" />
      <p className="mt-3 type-label text-fg">{isDragging ? "Drop your file here" : "Drag and drop your resume here"}</p>
      <p className="mt-1 type-small text-fg-muted">or</p>
      <Button variant={primary ? "primary" : "secondary"} className="mt-3" onClick={() => inputRef.current.click()} {...chooseProps}>
        Choose file
      </Button>
      <p className="mt-4 type-small text-fg-subtle">PDF or DOCX, up to {MAX_SIZE_MB} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = ""; // Allow choosing the same file again
        }}
      />
    </div>
  );
}
