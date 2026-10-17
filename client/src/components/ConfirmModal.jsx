import { useEffect, useRef } from "react";
import Modal from "./Modal";

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

  if (!open) return null;

  return (
    <Modal onClose={() => !loading && onCancel()} labelledBy="confirm-modal-title" className="max-w-sm p-6">
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
    </Modal>
  );
}
