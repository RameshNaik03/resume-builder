import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Loader2 } from "lucide-react";
import { originalBytes, originalPreviewHtml } from "../../utils/originalFile";
import getErrorMessage from "../../utils/getErrorMessage";

// The user's uploaded file, shown as it is: a PDF drawn page by page with pdf.js, a DOCX as
// the HTML the server converted it to (Word's exact layout can't be drawn in a browser).
//   resume - needs _id and original ({ kind, fileName })
//   pages  - "first" (a thumbnail or a side-by-side view) or "all"
//   width  - the page width in px; without it the page fills its container's width

// pdf.js is large: loaded only when an original is shown
let pdfjsPromise = null;
const loadPdfjs = () => {
  pdfjsPromise ??= Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
};

// Watches an element's width (for pages that fill their container)
function useWidth(ref, fixed) {
  const [width, setWidth] = useState(fixed ?? 0);
  useEffect(() => {
    if (fixed || !ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, fixed]);
  return fixed ?? width;
}

function PdfPages({ resumeId, pages, width, label }) {
  const holder = useRef(null);
  const [state, setState] = useState({ status: "loading", count: 0 });

  useEffect(() => {
    if (!width) return undefined;
    let cancelled = false;
    let doc = null;
    (async () => {
      try {
        const [pdfjs, bytes] = await Promise.all([loadPdfjs(), originalBytes(resumeId)]);
        // pdf.js may take over the buffer it's given, so it gets a copy (the cache keeps the original)
        doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
        if (cancelled) return;
        const count = pages === "first" ? 1 : doc.numPages;
        holder.current.replaceChildren();
        for (let n = 1; n <= count; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
          canvas.className = "block paper";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${label}, page ${n} of ${doc.numPages}`);
          canvas.dataset.originalPage = String(n);
          canvas.setAttribute("aria-busy", "true");
          holder.current.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          canvas.removeAttribute("aria-busy");
          canvas.dataset.drawn = "true"; // Drawn (tests wait for this)
        }
        if (!cancelled) setState({ status: "ready", count: doc.numPages });
      } catch (error) {
        if (!cancelled) setState({ status: "error", message: getErrorMessage(error) });
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [resumeId, pages, width, label]);

  return (
    <div>
      <div ref={holder} className="flex flex-col items-center gap-4" data-testid="original-pages" />
      <Status state={state} />
      {state.status === "ready" && pages === "first" && state.count > 1 && <p className="mt-2 text-center type-small text-fg-muted">Page 1 of {state.count}</p>}
    </div>
  );
}

function DocxPreview({ resumeId, label }) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    originalPreviewHtml(resumeId)
      .then((html) => !cancelled && setState({ status: "ready", html: DOMPurify.sanitize(html) }))
      .catch((error) => !cancelled && setState({ status: "error", message: getErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
  }, [resumeId]);
  if (state.status !== "ready") return <Status state={state} />;
  return (
    // A page of "paper": the file's text with plain document styles (see .original-docx in index.css)
    <article className="original-docx paper" aria-label={label} data-testid="original-docx" dangerouslySetInnerHTML={{ __html: state.html }} />
  );
}

function Status({ state }) {
  if (state.status === "loading") {
    return (
      <p className="flex items-center justify-center gap-2 py-10 type-small text-fg-muted" role="status">
        <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
        Opening your file...
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="py-10 text-center type-small text-danger" role="alert">
        We couldn't show your file: {state.message}
      </p>
    );
  }
  return null;
}

export default function OriginalDocument({ resume, pages = "all", width }) {
  const box = useRef(null);
  const measured = useWidth(box, width);
  const label = `Your original file, ${resume.original?.fileName ?? ""}`;
  return (
    <div ref={box} className="min-w-0" style={width ? { width } : undefined}>
      {resume.original?.kind === "docx" ? <DocxPreview resumeId={resume._id} label={label} /> : <PdfPages resumeId={resume._id} pages={pages} width={measured} label={label} />}
    </div>
  );
}
