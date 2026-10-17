// A white A4 page (210 × 297 mm), or several pages stacked (pages={2} -> 594 mm tall).
// Used by the live preview (whose hidden full-length sheet is printed to PDF) and by
// template thumbnails. Page margins are added by TemplateRenderer and the layouts.
// When printing it's 1mm shorter than its pages, so rounding never adds a blank page.
export default function ResumeSheet({ ref, pages = 1, className = "", children }) {
  return (
    <div
      ref={ref}
      style={{ "--sheet-height": `calc(${pages} * 297mm)` }}
      className={`min-h-(--sheet-height) w-[210mm] bg-white print:min-h-[calc(var(--sheet-height)-1mm)] ${className}`}
    >
      {children}
    </div>
  );
}
