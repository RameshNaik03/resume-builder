import Dialog from "./ui/Dialog";
import Button from "./ui/Button";

// A simple "Are you sure?" dialog for a destructive action. Closes with Cancel, Escape or a
// click on the dimmed page; Cancel has focus first, so pressing Enter by accident doesn't delete.
export default function ConfirmModal({ open, title, message, confirmText = "Confirm", onConfirm, onCancel, loading = false }) {
  if (!open) return null;
  return (
    <Dialog
      title={title}
      description={message}
      onClose={() => !loading && onCancel()}
      footer={
        <>
          <Button onClick={onCancel} disabled={loading} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {loading ? "Please wait..." : confirmText}
          </Button>
        </>
      }
    />
  );
}
