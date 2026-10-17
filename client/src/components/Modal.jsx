import { useEffect } from "react";

// Shared modal shell: dark backdrop, centred panel, closes on Escape or a
// click on the backdrop, and stops the page behind it from scrolling.
// fullScreen makes the panel fill the whole window.
// Render it only while it should be open: {isOpen && <Modal ...>}
export default function Modal({ onClose, labelledBy, fullScreen = false, className = "", children }) {
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm ${fullScreen ? "" : "p-4"}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full bg-white shadow-xl ${
          fullScreen ? "h-full" : "rounded-2xl border border-slate-200"
        } ${className}`}
        onClick={(event) => event.stopPropagation()} // Clicks inside shouldn't close it
      >
        {children}
      </div>
    </div>
  );
}
