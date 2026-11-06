import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TemplateRenderer from "../../templates/TemplateRenderer";
import { TEMPLATES, TIERS } from "../../templates/registry";
import ResumeSheet from "../../templates/ResumeSheet";
import usePageTitle from "../../hooks/usePageTitle";
import galleryResume from "../../templates/galleryResume";

const A4_WIDTH_PX = 794; // 210mm at 96 DPI

// Development-only gallery (/dev/templates, see App.jsx): every template's first page with
// the same sample resume, grouped by tier and layout, for comparing designs side by side.
// ?photo=0 hides the sample photo.
export default function DevTemplates() {
  usePageTitle("Template gallery (dev)");
  const [searchParams, setSearchParams] = useSearchParams();
  const withPhoto = searchParams.get("photo") !== "0";

  // tier -> layout -> templates, in registry order
  const groups = useMemo(
    () =>
      TIERS.map((tier) => {
        const templates = TEMPLATES.filter((template) => template.tier === tier.id);
        const layouts = [...new Set(templates.map((template) => template.layout))];
        return { ...tier, layouts: layouts.map((layout) => templates.filter((template) => template.layout === layout)) };
      }),
    []
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Template gallery</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Development only. {TEMPLATES.length} templates, first page of each.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={withPhoto} onChange={(event) => setSearchParams(event.target.checked ? {} : { photo: "0" })} />
          Show photo
        </label>
      </div>

      {groups.map((tier) => (
        <section key={tier.id} className="mt-10">
          <h2 className="border-b border-slate-200 pb-2 text-xl font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
            {tier.name}
          </h2>
          {tier.layouts.map((templates) => (
            <div key={templates[0].layout} className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{templates[0].layout}</h3>
              <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {templates.map((template) => (
                  <GalleryCard key={template.id} template={template} withPhoto={withPhoto} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// One template: its first page scaled to the card, rendered once it scrolls near view
function GalleryCard({ template, withPhoto }) {
  const boxRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const resume = useMemo(() => galleryResume(template.id, withPhoto), [template.id, withPhoto]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const observer = new ResizeObserver(() => setScale(box.clientWidth / A4_WIDTH_PX));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={boxRef} className="relative aspect-[210/297] overflow-hidden rounded-md bg-white shadow-md ring-1 ring-slate-200">
        {isVisible && scale > 0 ? (
          <div style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <ResumeSheet>
              <TemplateRenderer resume={resume} withLinks={false} />
            </ResumeSheet>
          </div>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-slate-100 dark:bg-slate-800" />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{template.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {template.id} · {template.atsFriendly ? "ATS-friendly" : "not ATS-friendly"}
          </p>
        </div>
        <Link
          to={`/dev/templates/${template.id}${withPhoto ? "" : "?photo=0"}`}
          target="_blank"
          className="btn-secondary shrink-0 text-xs"
        >
          Open full size
        </Link>
      </div>
    </div>
  );
}
