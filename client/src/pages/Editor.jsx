import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import { getTemplate } from "../templates/registry";
import useResume from "../hooks/useResume";
import usePageTitle from "../hooks/usePageTitle";
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

// Text and dot colour for each save status
const STATUS_STYLES = {
  saved: { text: "Saved", dot: "bg-emerald-500" },
  unsaved: { text: "Unsaved changes", dot: "bg-amber-500" },
  saving: { text: "Saving...", dot: "bg-indigo-500 animate-pulse" },
  error: { text: "Couldn't save", dot: "bg-red-500" },
};

// Print settings for the PDF: A4 paper, no page margins (the sheet has its own padding).
// Zero margins also stop the browser from adding its date/URL headers and footers.
const PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 0; }
  @media print {
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// e.g. "Jobs and internships · 2 added"
const withCount = (text, list) => (list.length > 0 ? `${text} · ${list.length} added` : text);

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, loading, loadError, status, updateResume, save } = useResume(id);
  const [activeTab, setActiveTab] = useState("edit"); // Mobile only: "edit" or "preview"
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // After importing a file, the dashboard sends us here with { imported: true }
  const location = useLocation();
  const [showImportBanner, setShowImportBanner] = useState(Boolean(location.state?.imported));
  const dismissImportBanner = () => {
    setShowImportBanner(false);
    // Clear the flag so the banner doesn't come back when the page is refreshed
    navigate(location.pathname, { replace: true, state: null });
  };

  usePageTitle(resume?.title?.trim() || "Editor");

  // The A4 sheet inside ResumePreview; react-to-print turns it into the PDF.
  // The PDF file name comes from documentTitle.
  const printRef = useRef(null);
  const handleDownloadPdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: resume?.title?.trim() || "Resume",
    pageStyle: PRINT_PAGE_STYLE,
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
      <div className="sticky top-16 z-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-lg font-semibold text-slate-900 dark:text-white outline-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30"
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

      {/* Two columns on large screens; tabs decide which one shows on small screens */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2">
        {/* Left: form */}
        <div className={`space-y-4 ${activeTab === "edit" ? "block" : "hidden"} lg:block`}>
          <CollapsibleSection title="Personal info" description="Name and contact details" defaultOpen>
            <PersonalInfoForm
              data={resume.personalInfo}
              onChange={(personalInfo) => updateResume({ personalInfo })}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Summary" description="A short introduction about you">
            <SummaryForm value={resume.summary} onChange={(summary) => updateResume({ summary })} />
          </CollapsibleSection>

          <CollapsibleSection title="Skills" description="Tools, languages and technologies">
            <SkillsForm skills={resume.skills} onChange={(skills) => updateResume({ skills })} />
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
            <ResumePreview resume={resume} printRef={printRef} />
          </div>
        </div>
      </div>

      {isPickerOpen && (
        <TemplatePicker resume={resume} onSelect={handleSelectTemplate} onClose={() => setIsPickerOpen(false)} />
      )}
    </div>
  );
}
