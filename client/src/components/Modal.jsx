import { useEffect } from "react";

// Shared modal shell: dark backdrop, centred panel, closes on Escape or a
// click on the backdrop, and stops the page behind it from scrolling.
// Render it only while it should be open: {isOpen && <Modal ...>}
export default function Modal({ onClose, labelledBy, className = "", children }) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock page scrolling while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`card w-full shadow-xl ${className}`}
        onClick={(event) => event.stopPropagation()} // Clicks inside shouldn't close it
      >
        {children}
      </div>
    </div>
  );
}
