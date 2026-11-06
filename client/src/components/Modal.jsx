import { DialogShell } from "./ui/Dialog";

// The dialog shell for modals with their own layout (the design system's DialogShell): a dimmed
// page, a plain panel, Escape / backdrop to close, focus moved in and given back.
//   labelledBy - the id of the modal's title; fullScreen - fill the whole window
//   className  - the panel's width and padding (e.g. "max-w-lg p-6")
// New code can use Dialog or DialogShell from components/ui directly.
// Render it only while it should be open: {isOpen && <Modal ...>}
export default function Modal({ onClose, labelledBy, fullScreen = false, className = "", children }) {
  return (
    <DialogShell onClose={onClose} labelledBy={labelledBy} size={fullScreen ? "full" : "custom"} className={className}>
      {children}
    </DialogShell>
  );
}
