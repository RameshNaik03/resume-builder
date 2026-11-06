import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import { getTemplate } from "../../templates/registry";
import { MM_TO_PX, PAGE_SIZES, resolveDesign } from "../../templates/design";
import ResumeSheet from "../../templates/ResumeSheet";

const normalize = (text) => text.replace(/\s+/g, " ").trim();

// Adds `className` to the smallest elements whose text contains `text` (works with any layout,
// whatever HTML it uses: a bullet, a date, a heading...)
function markText(root, text, className) {
  const target = normalize(text);
  if (target.length < 2) return;
  const matches = [...root.querySelectorAll("*")].filter((element) => normalize(element.textContent).includes(target));
  const matchSet = new Set(matches);
  for (const element of matches) {
    const hasMatchingChild = [...element.children].some((child) => matchSet.has(child));
    if (!hasMatchingChild) element.classList.add(className);
  }
}

// A whole resume (one continuous sheet), shrunk to the width of its box.
//   highlights - texts to mark; tone "new" (green, what was added) or "old" (red, what changed)
export default function ResumeSnapshot({ resume, highlights = [], tone = "new" }) {
  const boxRef = useRef(null);
  const sheetRef = useRef(null);
  const [scale, setScale] = useState(0.4);
  const [height, setHeight] = useState(0);

  const pageSize = resolveDesign(getTemplate(resume.template), resume.design).resolved.pageSize;
  const widthPx = (PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4).widthMm * MM_TO_PX;

  // Shrink the sheet to the box's width
  useEffect(() => {
    const box = boxRef.current;
    const observer = new ResizeObserver(() => box.clientWidth > 0 && setScale(box.clientWidth / widthPx));
    observer.observe(box);
    return () => observer.disconnect();
  }, [widthPx]);

  // After each render: mark the changed texts, then measure the sheet for the box's height
  const className = tone === "old" ? "ats-changed-old" : "ats-changed-new";
  const highlightKey = highlights.join("\u0000");
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    for (const element of sheet.querySelectorAll(".ats-changed-new, .ats-changed-old")) element.classList.remove("ats-changed-new", "ats-changed-old");
    for (const text of highlightKey ? highlightKey.split("\u0000") : []) markText(sheet, text, className);
    setHeight(sheet.offsetHeight);
  }, [resume, highlightKey, className]);

  return (
    <div ref={boxRef} className="relative overflow-hidden rounded-lg border border-line shadow-soft" style={{ height: height * scale }}>
      <div style={{ width: widthPx, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ResumeSheet ref={sheetRef} pageSize={pageSize}>
          <TemplateRenderer resume={resume} design={resume.design} withLinks={false} highlightPlaceholders />
        </ResumeSheet>
      </div>
    </div>
  );
}
