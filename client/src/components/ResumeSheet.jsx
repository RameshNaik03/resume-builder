// A white A4 page (210 × 297 mm).
// Used by the live preview (which is printed to PDF) and by template thumbnails.
// Page margins are added by TemplateRenderer, because some layouts run colour to the edge.
export default function ResumeSheet({ ref, className = "", children }) {
  return (
    <div ref={ref} className={`min-h-[297mm] w-[210mm] bg-white print:min-h-0 ${className}`}>
      {children}
    </div>
  );
}
