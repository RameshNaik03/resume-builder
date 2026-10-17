import { useEffect, useRef } from "react";

// A simple "Are you sure?" dialog.
// Closes with the Cancel button, the Escape key, or a click on the dark background.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  onConfirm,
  onCancel,
  loading = false,
}) {
  const cancelButtonRef = useRef(null);

  // Focus "Cancel" when the modal opens, so pressing Enter by accident doesn't delete anything
  useEffect(() => {
    if (open) cancelButtonRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="card w-full max-w-sm p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()} // Clicks inside shouldn't close it
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
