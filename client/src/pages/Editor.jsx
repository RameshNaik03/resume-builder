import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import { getTemplate } from "../templates/registry";
import { resolveDesign, usedFontIds } from "../templates/design";
import { getPrintFonts } from "../templates/fonts";
import printPageStyle from "../utils/printPageStyle";
import useResume from "../hooks/useResume";
import usePageTitle from "../hooks/usePageTitle";
import { placeholdersIn } from "../utils/placeholders";
import Loader from "../components/Loader";
import ResumePreview from "../components/ResumePreview";
import CollapsibleSection from "../components/editor/CollapsibleSection";
import PersonalInfoForm from "../components/editor/PersonalInfoForm";
import SummaryForm from "../components/editor/SummaryForm";
import SkillsForm from "../components/editor/SkillsForm";
import ExperienceForm from "../components/editor/ExperienceForm";
import EducationForm from "../components/editor/EducationForm";
import ProjectsForm from "../components/editor/ProjectsForm";
import AdditionalForm from "../components/editor/AdditionalForm";
import TemplatePicker from "../components/editor/TemplatePicker";
import DesignPanel from "../components/editor/DesignPanel";
import Switch from "../components/Switch";
import { fitSuggestions } from "../templates/fit";

// Text and dot colour for each save status
const STATUS_STYLES = {
  saved: { text: "Saved", dot: "bg-emerald-500" },
  unsaved: { text: "Unsaved changes", dot: "bg-amber-500" },
  saving: { text: "Saving...", dot: "bg-indigo-500 animate-pulse" },
  error: { text: "Couldn't save", dot: "bg-red-500" },
};


// e.g. "Jobs and internships · 2 added"
const withCount = (text, list) => (list.length > 0 ? `${text} · ${list.length} added` : text);

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, loading, loadError, status, updateResume, setPhotoUrl, save } = useResume(id);
  const [activeTab, setActiveTab] = useState("edit"); // Mobile only: "edit" or "preview"
  const [formPanel, setFormPanel] = useState("content"); // Left column: "content" or "design"
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // After importing a file, the dashboard sends us here with { imported: true }
  const location = useLocation();
  const [showImportBanner, setShowImportBanner] = useState(Boolean(location.state?.imported));
  // The import parser put several jobs' bullet points under the first job
  const bulletsUnassigned = Boolean(location.state?.importWarnings?.includes("experience-bullets-unassigned"));
  const dismissImportBanner = () => {
    setShowImportBanner(false);
    // Clear the flag so the banner doesn't come back when the page is refreshed
    navigate(location.pathname, { replace: true, state: null });
  };

  // After the ATS optimizer, the checker sends { optimized: { before, after, changes, skillsToConsider } }
  const [optimized, setOptimized] = useState(location.state?.optimized ?? null);
  const dismissOptimizedBanner = () => {
    setOptimized(null);
    navigate(location.pathname, { replace: true, state: null });
  };

  usePageTitle(resume?.title?.trim() || "Editor");

  // "[X%]"-style placeholders (from the ATS optimizer) that still need real numbers
  const placeholders = useMemo(() => (resume ? placeholdersIn(resume) : []), [resume]);

  // Page count and "Fit to one page" progress, reported by ResumePreview
  const [previewStatus, setPreviewStatus] = useState({ pageCount: 1, fitStatus: null });
  const fitOn = Boolean(resume?.design?.fitOnePage);
  // On: saved in the design. Off: the setting is removed, so the design is exactly as before.
  const setFitOnePage = (on) => {
    const { fitOnePage: _previous, ...rest } = resume.design ?? {};
    updateResume({ design: on ? { ...rest, fitOnePage: true } : rest });
  };
  const fitStatus = previewStatus.fitStatus;
  const tooLong = fitOn && fitStatus && !fitStatus.pending && !fitStatus.fits;
  const suggestions = useMemo(() => (tooLong && resume ? fitSuggestions(resume, fitStatus) : []), [tooLong, resume, fitStatus]);
  const showHideSections = () => {
    setFormPanel("design");
    setActiveTab("edit");
  };

  // The A4 sheet inside ResumePreview; react-to-print turns it into the PDF.
  // The PDF file name comes from documentTitle.
  const printRef = useRef(null);

  // The design's paper size and Google Fonts, so the PDF matches the preview
  const templateId = resume?.template;
  const design = resume?.design;
  const resolvedDesign = useMemo(
    () => (templateId === undefined ? null : resolveDesign(getTemplate(templateId), design).resolved),
    [templateId, design]
  );
  const pageSize = resolvedDesign?.pageSize ?? "A4";
  const fontIds = resolvedDesign ? usedFontIds(resolvedDesign).join(",") : "";
  const [printFonts, setPrintFonts] = useState([]);
  useEffect(() => {
    let ignore = false;
    getPrintFonts(fontIds ? fontIds.split(",") : []).then((fonts) => !ignore && setPrintFonts(fonts));
    return () => {
      ignore = true;
    };
  }, [fontIds]);

  const handleDownloadPdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: resume?.title?.trim() || "Resume",
    pageStyle: printPageStyle(pageSize),
    fonts: printFonts, // react-to-print waits for these font files before printing
  });

  // Ctrl+S / Cmd+S saves instead of opening the browser's "Save page" dialog
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  // Apply a template from the picker (autosave stores it in resume.template)
  const handleSelectTemplate = (template) => {
    updateResume({ template: template.id });
    setIsPickerOpen(false);
    if (showImportBanner) dismissImportBanner(); // They've seen the template option, so the banner can go
    toast.success(`Template changed to ${template.name}`, { id: "template-changed" });
  };

  // Save any pending changes before going back to the dashboard
  const handleBack = async () => {
    if (status !== "saved") await save();
    navigate("/dashboard");
  };

  if (loading) {
    return <Loader text="Loading your resume..." />;
  }

  if (loadError) {
    return (
      <div className="flex justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Couldn't open this resume</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
              Try again
            </button>
            <Link to="/dashboard" className="btn-primary">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[status];

  return (
    <div>
      {/* Top bar (sits just below the 4rem-tall Navbar) */}
      <div className="sticky top-16 z-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" data-testid="editor-toolbar">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <input
            type="text"
            value={resume.title}
            onChange={(event) => updateResume({ title: event.target.value })}
            onBlur={() => !resume.title.trim() && updateResume({ title: "Untitled Resume" })}
            maxLength={100}
            aria-label="Resume title"
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-lg font-semibold text-ellipsis text-slate-900 dark:text-white outline-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30"
          />

          <span className="hidden items-center gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex" aria-live="polite">
            <span className={`size-2 rounded-full ${statusStyle.dot}`} />
            {statusStyle.text}
          </span>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="btn-secondary shrink-0"
            aria-label="Templates"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            <span className="hidden md:inline">Templates</span>
          </button>

          {/* Fit to one page, with the page count always shown */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-slate-600 dark:text-slate-300 xl:inline">Fit to one page</span>
            <Switch checked={fitOn} onChange={setFitOnePage} label="Fit to one page" />
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                previewStatus.pageCount > 1
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
              aria-live="polite"
              data-testid="page-count"
            >
              {fitOn && fitStatus?.pending ? "Fitting…" : `${previewStatus.pageCount} ${previewStatus.pageCount === 1 ? "page" : "pages"}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadPdf()}
            className="btn-secondary shrink-0"
            aria-label="Download PDF"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="hidden md:inline">Download PDF</span>
          </button>

          <button
            type="button"
            onClick={save}
            disabled={status === "saved" || status === "saving"}
            className="btn-primary shrink-0"
          >
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Mobile: status + Edit/Preview tabs */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-3 lg:hidden">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1" role="tablist">
            {["edit", "preview"].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                  activeTab === tab ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 sm:hidden">
            <span className={`size-2 rounded-full ${statusStyle.dot}`} />
            {statusStyle.text}
          </span>
        </div>
      </div>

      {/* Shown once, right after importing a file */}
      {showImportBanner && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div
            className="flex flex-col gap-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/60 px-4 py-3 sm:flex-row sm:items-center"
            role="status"
          >
            <svg className="hidden size-5 shrink-0 text-indigo-600 dark:text-indigo-400 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <p className="flex-1 text-sm text-indigo-900 dark:text-indigo-100">
              <span className="font-semibold">We imported your resume.</span> Please check each section, as imports
              aren't always perfect. You can change the template anytime.
              {bulletsUnassigned && (
                <span className="mt-1 block font-semibold text-amber-800 dark:text-amber-300">
                  We couldn't tell which bullets belong to which job. Please check your Experience section.
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsPickerOpen(true)} className="btn-secondary px-3 py-1.5">
                Change template
              </button>
              <button
                type="button"
                onClick={dismissImportBanner}
                aria-label="Dismiss"
                className="grid size-8 place-items-center rounded-lg text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shown once, right after the ATS optimizer created this resume */}
      {optimized && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div
            className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center dark:border-emerald-900 dark:bg-emerald-950/50"
            role="status"
          >
            <span className="w-fit shrink-0 rounded-lg bg-white px-3 py-1.5 text-center font-display text-lg font-extrabold tabular-nums text-slate-900 dark:bg-slate-900 dark:text-white">
              {optimized.before} <span aria-hidden="true">→</span>
              <span className="sr-only">to</span> <span className="text-emerald-600 dark:text-emerald-400">{optimized.after}</span>
            </span>
            <p className="flex-1 text-sm text-emerald-900 dark:text-emerald-100">
              <span className="font-semibold">
                ATS-optimized copy created
                {optimized.after > optimized.before && `: your score went up ${optimized.after - optimized.before} points`}.
              </span>{" "}
              We made {optimized.changes} change{optimized.changes === 1 ? "" : "s"}; your original resume is unchanged.
              Please check each section before you use it.
              {optimized.skillsToConsider > 0 &&
                ` ${optimized.skillsToConsider} keyword${optimized.skillsToConsider === 1 ? " from the job wasn't" : "s from the job weren't"} added because your resume doesn't show ${optimized.skillsToConsider === 1 ? "it" : "them"} yet. Add only the ones you really have.`}
              <span className="mt-1 block text-emerald-800/80 dark:text-emerald-200/80">
                Fonts and layout were reset for ATS compatibility. You can still change colors in the Design tab.
              </span>
            </p>
            <button
              type="button"
              onClick={dismissOptimizedBanner}
              aria-label="Dismiss"
              className="grid size-8 shrink-0 place-items-center self-end rounded-lg text-emerald-500 hover:bg-emerald-100 hover:text-emerald-800 sm:self-auto dark:hover:bg-emerald-900 dark:hover:text-emerald-200"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Shown while placeholders like "[X%]" are left (highlighted in the preview, not in the PDF) */}
      {placeholders.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <p
            className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100"
            role="status"
          >
            <span className="font-semibold">
              {placeholders.length} placeholder{placeholders.length === 1 ? "" : "s"} still need{placeholders.length === 1 ? "s" : ""} real
              numbers
            </span>{" "}
            ({[...new Set(placeholders)].slice(0, 3).join(", ")}). Replace each with your actual figure, or remove it. They're
            highlighted in yellow in the preview (not in the PDF).
          </p>
        </div>
      )}

      {/* Two columns on large screens; tabs decide which one shows on small screens */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2">
        {/* Left: content form or design settings */}
        <div className={`space-y-4 ${activeTab === "edit" ? "block" : "hidden"} lg:block`}>
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Editor panels">
            {[
              { id: "content", label: "Content" },
              { id: "design", label: "Design" },
            ].map((panel) => (
              <button
                key={panel.id}
                type="button"
                role="tab"
                aria-selected={formPanel === panel.id}
                onClick={() => setFormPanel(panel.id)}
                className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  formPanel === panel.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>

          {formPanel === "design" ? (
            <DesignPanel resume={resume} onChange={(design) => updateResume({ design })} />
          ) : (
            <>
              <CollapsibleSection title="Personal info" description="Name and contact details" defaultOpen>
                <PersonalInfoForm
                  data={resume.personalInfo}
                  onChange={(personalInfo) => updateResume({ personalInfo })}
                  resumeId={resume._id}
                  onPhotoChange={setPhotoUrl}
                />
              </CollapsibleSection>

              <CollapsibleSection title="Summary" description="A short introduction about you">
                <SummaryForm value={resume.summary} onChange={(summary) => updateResume({ summary })} />
              </CollapsibleSection>

              <CollapsibleSection title="Skills" description="Tools, languages and technologies">
                <SkillsForm
                  skills={resume.skills}
                  skillLevels={resume.skillLevels ?? []}
                  onChange={(changes) => updateResume(changes)}
                />
              </CollapsibleSection>

              <CollapsibleSection title="Experience" description={withCount("Jobs and internships", resume.experience)}>
                <ExperienceForm items={resume.experience} onChange={(experience) => updateResume({ experience })} />
              </CollapsibleSection>

              <CollapsibleSection title="Education" description={withCount("Schools and degrees", resume.education)}>
                <EducationForm items={resume.education} onChange={(education) => updateResume({ education })} />
              </CollapsibleSection>

              <CollapsibleSection title="Projects" description={withCount("Things you've built", resume.projects)}>
                <ProjectsForm items={resume.projects} onChange={(projects) => updateResume({ projects })} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Additional sections"
                description={withCount("Certifications, languages, awards…", resume.additional ?? [])}
              >
                <AdditionalForm items={resume.additional ?? []} onChange={(additional) => updateResume({ additional })} />
              </CollapsibleSection>
            </>
          )}
        </div>

        {/* Right: live preview */}
        <div className={`${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
          {/* On large screens the preview stays in view and scrolls on its own */}
          <div className="lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:p-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="hidden text-xs font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase lg:block">Live preview</p>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                {getTemplate(resume.template).name} · Change
              </button>
            </div>
            {tooLong && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200" role="status" data-testid="fit-too-long">
                <p className="font-semibold">
                  Your resume is still {fitStatus.overflowLines} {fitStatus.overflowLines === 1 ? "line" : "lines"} too long for one page.
                </p>
                <p className="mt-1">Everything is already at the smallest readable size, so some content has to go. A few ideas:</p>
                {suggestions.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={showHideSections} className="mt-3 font-medium text-amber-900 underline underline-offset-2 dark:text-amber-100">
                  Hide sections in the Design tab
                </button>
              </div>
            )}
            <ResumePreview resume={resume} printRef={printRef} highlightPlaceholders onStatus={setPreviewStatus} />
          </div>
        </div>
      </div>

      {isPickerOpen && (
        <TemplatePicker resume={resume} onSelect={handleSelectTemplate} onClose={() => setIsPickerOpen(false)} />
      )}
    </div>
  );
}
