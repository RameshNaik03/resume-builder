import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TemplateRenderer from "../templates/TemplateRenderer";
import { applyDecorations, applyGaps, pageDecorations, paginate } from "../templates/pagination";
import { getTemplate } from "../templates/registry";
import { pageMetrics, resolveDesign, usedFontIds } from "../templates/design";
import { findFit } from "../templates/fit";
import { loadFonts } from "../templates/fonts";
import ResumeSheet from "./ResumeSheet";

const PAGE_GAP_PX = 24; // Space between pages in the preview
const FIT_DELAY_MS = 250; // "Fit to one page" waits this long after the last change before re-fitting

// Shows the resume as separate pages (A4 or US Letter, from its design), shrunk to fit the panel.
//   printRef - points at a hidden full-length copy of the resume. It's used to work out
//              the page breaks, and it's what gets printed to PDF.
//   highlightPlaceholders - mark "[X%]"-style placeholders in yellow on the visible pages
//              (never on the printed copy)
//   letter   - a cover letter to show instead of the resume's sections (TemplateRenderer)
//   onStatus - called with { pageCount, fit } whenever they change. fit is null when "Fit to one
//              page" is off, else { pending } while re-fitting, then { fits, overflowLines, sections }
//
// "Fit to one page" (design.fitOnePage, see templates/fit.js): a third hidden copy, rendered with
// the user's own design, is measured to find the fitted settings. Those are added to the design
// used by the visible pages and the printed copy, so the preview and the PDF are identical. They
// aren't saved: with the option off, the resume's own design is used exactly.
export default function ResumePreview({ resume, printRef, highlightPlaceholders = false, letter, onStatus }) {
  const containerRef = useRef(null);
  const pagesRef = useRef(null);
  const measureRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [fontsLoaded, setFontsLoaded] = useState(0); // Goes up each time web fonts finish loading

  const template = getTemplate(resume.template);
  const fitOn = Boolean(resume.design?.fitOnePage);
  const [fit, setFit] = useState(null); // { source: the resume it was worked out for, overrides, fits... }

  // The design actually drawn: the resume's own, plus the fitted settings when fitting
  const design = useMemo(
    () => (fitOn && fit ? { ...resume.design, ...fit.overrides } : resume.design),
    [fitOn, fit, resume.design]
  );

  // Page size, margins and colours from the template + the design
  const { resolved } = useMemo(() => resolveDesign(template, design), [template, design]);
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

  // Re-fit (debounced) whenever the content, template or design changes, or fonts arrive
  useEffect(() => {
    if (!fitOn) return undefined;
    const timer = setTimeout(() => {
      if (measureRef.current) setFit({ source: resume, letter, ...findFit(measureRef.current, template, resume.design) });
    }, FIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [fitOn, resume, letter, template, fontsLoaded]);

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
    // Page-aware decorations (column rules, card tints...) are measured once the gaps are in
    const decorations = pageDecorations(printRef.current, { heightPx });
    applyDecorations(printRef.current, decorations);
    for (const page of pagesRef.current.querySelectorAll("[data-page]")) {
      applyGaps(page, gaps);
      applyDecorations(page, decorations);
    }
    if (pagesNeeded !== pageCount) setPageCount(pagesNeeded); // Re-runs once with the new page count
  }, [resume, letter, design, pageCount, printRef, heightPx, marginTopPx, marginBottomPx, fontsLoaded]);

  // Tell the editor the page count and how fitting went
  const fitStatus = !fitOn ? null : fit?.source === resume && fit?.letter === letter ? { pending: false, fits: fit.fits, overflowLines: fit.overflowLines, sections: fit.sections } : { pending: true };
  const statusKey = JSON.stringify({ pageCount, fitStatus });
  useEffect(() => {
    onStatus?.(JSON.parse(statusKey));
  }, [statusKey, onStatus]);

  const totalHeight = pageCount * heightPx + (pageCount - 1) * PAGE_GAP_PX;
  const sheetProps = { pages: pageCount, pageSize: resolved.pageSize, background: resolved.backgroundColor };

  return (
    <div
      ref={containerRef}
      className="relative"
      // For tests: "off", "pending", "fitted" or "too-long"
      data-fit-status={!fitStatus ? "off" : fitStatus.pending ? "pending" : fitStatus.fits ? "fitted" : "too-long"}
    >
      {/* Hidden full-length resume: measured for page breaks and printed to PDF */}
      <div aria-hidden="true" className="invisible absolute top-0 left-0 h-0 overflow-hidden">
        <ResumeSheet ref={printRef} {...sheetProps}>
          <TemplateRenderer resume={resume} design={design} letter={letter} />
        </ResumeSheet>
        {/* Fit to one page: a copy in the user's own design, measured by findFit */}
        {fitOn && (
          <ResumeSheet ref={measureRef} pageSize={resolved.pageSize} background={resolved.backgroundColor}>
            <TemplateRenderer resume={resume} design={resume.design} letter={letter} />
          </ResumeSheet>
        )}
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
                  <TemplateRenderer resume={resume} design={design} highlightPlaceholders={highlightPlaceholders} letter={letter} />
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
