import { useEffect, useRef, useState } from "react";
import TemplateRenderer from "../templates/TemplateRenderer";
import ResumeSheet from "./ResumeSheet";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI (how browsers convert mm to pixels)
const A4_HEIGHT_PX = 1123; // 297mm

// Shows the resume on a real-size A4 sheet, shrunk to fit the panel.
// printRef points at the sheet itself, which is what gets printed to PDF.
export default function ResumePreview({ resume, printRef }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(A4_HEIGHT_PX);

  // Recalculate the scale whenever the panel or the sheet changes size
  useEffect(() => {
    const container = containerRef.current;
    const sheet = printRef.current;

    const observer = new ResizeObserver(() => {
      const availableWidth = container.clientWidth;
      // Width is 0 while the panel is hidden (mobile "Edit" tab), so skip that
      if (availableWidth > 0) setScale(Math.min(availableWidth / A4_WIDTH_PX, 1));
      setSheetHeight(sheet.offsetHeight); // Taller than A4 if the content needs 2 pages
    });

    observer.observe(container);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [printRef]);

  return (
    <div ref={containerRef}>
      {/* transform: scale() doesn't change layout size, so reserve the scaled height ourselves */}
      <div style={{ height: sheetHeight * scale }}>
        <div style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <ResumeSheet ref={printRef} className="shadow-lg ring-1 ring-slate-200 print:shadow-none print:ring-0">
            <TemplateRenderer resume={resume} />
          </ResumeSheet>
        </div>
      </div>
    </div>
  );
}
