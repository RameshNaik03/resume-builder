import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TemplateRenderer from "../templates/TemplateRenderer";
import { applyGaps, paginate } from "../templates/pagination";
import { getTemplate } from "../templates/registry";
import { pageMetrics, resolveDesign, usedFontIds } from "../templates/design";
import { loadFonts } from "../templates/fonts";
import ResumeSheet from "./ResumeSheet";

const PAGE_GAP_PX = 24; // Space between pages in the preview

// Shows the resume as separate pages (A4 or US Letter, from its design), shrunk to fit the panel.
//   printRef - points at a hidden full-length copy of the resume. It's used to work out
//              the page breaks, and it's what gets printed to PDF.
export default function ResumePreview({ resume, printRef }) {
  const containerRef = useRef(null);
  const pagesRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [fontsLoaded, setFontsLoaded] = useState(0); // Goes up each time web fonts finish loading

  // Page size, margins and colours from the template + the resume's design
  const { resolved } = useMemo(() => resolveDesign(getTemplate(resume.template), resume.design), [resume.template, resume.design]);
  const metrics = pageMetrics(resolved);

  // Load the Google Fonts the design uses
  const fontIds = usedFontIds(resolved).join(",");
  useEffect(() => {
    if (fontIds) loadFonts(fontIds.split(","));
  }, [fontIds]);

  // A web font arriving changes text widths, so page breaks must be worked out again
  useEffect(() => {
    const handleFontsLoaded = () => setFontsLoaded((count) => count + 1);
    document.fonts.addEventListener("loadingdone", handleFontsLoaded);
    return () => document.fonts.removeEventListener("loadingdone", handleFontsLoaded);
  }, []);

  // Shrink the pages to the width of the panel
  useEffect(() => {
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      // Width is 0 while the panel is hidden (mobile "Edit" tab), so skip that
      if (container.clientWidth > 0) setScale(Math.min(container.clientWidth / metrics.widthPx, 1));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [metrics.widthPx]);

  // Whenever the resume (or the number of pages) changes, before the browser paints:
  // find the page breaks on the hidden sheet, then apply the same gaps to it and to
  // each visible page so they match exactly
  const { heightPx, marginTopPx, marginBottomPx } = metrics;
  useLayoutEffect(() => {
    const { gaps, pageCount: pagesNeeded } = paginate(printRef.current, { heightPx, marginTopPx, marginBottomPx });
    applyGaps(printRef.current, gaps);
    for (const page of pagesRef.current.querySelectorAll("[data-page]")) applyGaps(page, gaps);
    if (pagesNeeded !== pageCount) setPageCount(pagesNeeded); // Re-runs once with the new page count
  }, [resume, pageCount, printRef, heightPx, marginTopPx, marginBottomPx, fontsLoaded]);

  const totalHeight = pageCount * heightPx + (pageCount - 1) * PAGE_GAP_PX;
  const sheetProps = { pages: pageCount, pageSize: resolved.pageSize, background: resolved.backgroundColor };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden full-length resume: measured for page breaks and printed to PDF */}
      <div aria-hidden="true" className="invisible absolute top-0 left-0 h-0 overflow-hidden">
        <ResumeSheet ref={printRef} {...sheetProps}>
          <TemplateRenderer resume={resume} design={resume.design} />
        </ResumeSheet>
      </div>

      {/* Visible pages: each one shows a one-page "window" onto a copy of the resume */}
      <div style={{ height: totalHeight * scale }}>
        <div ref={pagesRef} style={{ width: metrics.widthPx, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {Array.from({ length: pageCount }, (_, index) => (
            <div
              key={index}
              data-page
              aria-hidden={index > 0} // Screen readers read the whole resume from page 1's copy
              className="relative overflow-hidden shadow-lg ring-1 ring-slate-200"
              style={{ height: heightPx, marginTop: index > 0 ? PAGE_GAP_PX : 0, backgroundColor: resolved.backgroundColor }}
            >
              <div style={{ transform: `translateY(${-index * heightPx}px)` }}>
                <ResumeSheet {...sheetProps}>
                  <TemplateRenderer resume={resume} design={resume.design} />
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
