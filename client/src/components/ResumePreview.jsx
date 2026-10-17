import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TemplateRenderer from "../templates/TemplateRenderer";
import { PAGE_HEIGHT, applyGaps, paginate } from "../templates/pagination";
import ResumeSheet from "./ResumeSheet";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI (how browsers convert mm to pixels)
const PAGE_GAP_PX = 24; // Space between pages in the preview

// Shows the resume as separate A4 pages, shrunk to fit the panel.
//   printRef - points at a hidden full-length copy of the resume. It's used to work out
//              the page breaks, and it's what gets printed to PDF.
export default function ResumePreview({ resume, printRef }) {
  const containerRef = useRef(null);
  const pagesRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  // Shrink the pages to the width of the panel
  useEffect(() => {
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      // Width is 0 while the panel is hidden (mobile "Edit" tab), so skip that
      if (container.clientWidth > 0) setScale(Math.min(container.clientWidth / A4_WIDTH_PX, 1));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Whenever the resume (or the number of pages) changes, before the browser paints:
  // find the page breaks on the hidden sheet, then apply the same gaps to it and to
  // each visible page so they match exactly
  useLayoutEffect(() => {
    const { gaps, pageCount: pagesNeeded } = paginate(printRef.current);
    applyGaps(printRef.current, gaps);
    for (const page of pagesRef.current.querySelectorAll("[data-page]")) applyGaps(page, gaps);
    if (pagesNeeded !== pageCount) setPageCount(pagesNeeded); // Re-runs once with the new page count
  }, [resume, pageCount, printRef]);

  const totalHeight = pageCount * PAGE_HEIGHT + (pageCount - 1) * PAGE_GAP_PX;

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden full-length resume: measured for page breaks and printed to PDF */}
      <div aria-hidden="true" className="invisible absolute top-0 left-0 h-0 overflow-hidden">
        <ResumeSheet ref={printRef} pages={pageCount}>
          <TemplateRenderer resume={resume} />
        </ResumeSheet>
      </div>

      {/* Visible pages: each one shows a 297mm "window" onto a copy of the resume */}
      <div style={{ height: totalHeight * scale }}>
        <div ref={pagesRef} style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {Array.from({ length: pageCount }, (_, index) => (
            <div
              key={index}
              data-page
              aria-hidden={index > 0} // Screen readers read the whole resume from page 1's copy
              className="relative overflow-hidden bg-white shadow-lg ring-1 ring-slate-200"
              style={{ height: PAGE_HEIGHT, marginTop: index > 0 ? PAGE_GAP_PX : 0 }}
            >
              <div style={{ transform: `translateY(${-index * PAGE_HEIGHT}px)` }}>
                <ResumeSheet pages={pageCount}>
                  <TemplateRenderer resume={resume} />
                </ResumeSheet>
              </div>
              {pageCount > 1 && (
                <span className="absolute right-4 bottom-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-white">
                  Page {index + 1} of {pageCount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
