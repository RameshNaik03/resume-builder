import { useMemo, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ResumePreview from "../../components/ResumePreview";
import { TEMPLATES } from "../../templates/registry";
import usePageTitle from "../../hooks/usePageTitle";
import galleryResume from "../../templates/galleryResume";

// Development only (/dev/templates/:templateId): one template at full size, every page,
// paginated exactly like the editor preview. ?photo=0 hides the sample photo; ?long=1 uses a
// longer sample;
// ?design={...} applies Design tab overrides, e.g. ?design={"columns":2,"bulletStyle":"dash"}
export default function DevTemplatePreview() {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const withPhoto = searchParams.get("photo") !== "0";
  const designParam = searchParams.get("design");
  const long = searchParams.get("long") === "1";
  const printRef = useRef(null);
  const template = TEMPLATES.find((candidate) => candidate.id === templateId);
  usePageTitle(`${template?.name ?? templateId} (dev)`);

  const resume = useMemo(() => {
    let design = {};
    try {
      design = designParam ? JSON.parse(designParam) : {};
    } catch {
      // Ignore a malformed ?design= and show the template defaults
    }
    return { ...galleryResume(templateId, withPhoto, long), design };
  }, [templateId, withPhoto, long, designParam]);

  if (!template) {
    return (
      <p className="p-8 type-body text-fg">
        Unknown template "{templateId}". <Link to="/dev/templates" className="underline">Back to the gallery</Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[842px] px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="type-h2 text-fg">{template.name}</h1>
          <p className="type-small text-fg-muted">
            {template.id} · {template.tier} · {template.atsFriendly ? "ATS-friendly" : "not ATS-friendly"}
          </p>
        </div>
        <Link to={`/dev/templates${withPhoto ? "" : "?photo=0"}`} className="btn-secondary text-xs">
          All templates
        </Link>
      </div>
      <ResumePreview resume={resume} printRef={printRef} />
    </div>
  );
}
