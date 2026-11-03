import { PAGE_SIZES } from "../templates/design";

// A blank page (A4 or US Letter), or several pages stacked (pages={2} -> two pages tall).
// Used by the live preview (whose hidden full-length sheet is printed to PDF) and by
// template thumbnails. Page margins are added by TemplateRenderer and the layouts.
// When printing it's 1mm shorter than its pages, so rounding never adds a blank page.
//   background - the design's page colour (white by default)
export default function ResumeSheet({ ref, pages = 1, pageSize = "A4", background = "#ffffff", className = "", children }) {
  const page = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;

  return (
    <div
      ref={ref}
      style={{
        "--sheet-height": `calc(${pages} * ${page.heightMm}mm)`,
        "--page-height": `${page.heightMm}mm`, // For decorations repeated on every page
        width: `${page.widthMm}mm`,
        backgroundColor: background,
      }}
      className={`min-h-(--sheet-height) print:min-h-[calc(var(--sheet-height)-1mm)] ${className}`}
    >
      {children}
    </div>
  );
}
