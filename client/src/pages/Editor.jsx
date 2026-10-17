import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
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
          <h1 className="text-xl font-semibold text-slate-900">Couldn't open this resume</h1>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
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
      <div className="sticky top-16 z-5 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-lg font-semibold text-slate-900 outline-none hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/30"
          />

          <span className="hidden items-center gap-2 text-sm text-slate-500 sm:flex" aria-live="polite">
            <span className={`size-2 rounded-full ${statusStyle.dot}`} />
            {statusStyle.text}
          </span>

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
          <div className="flex rounded-lg bg-slate-100 p-1" role="tablist">
            {["edit", "preview"].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                  activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2 text-sm text-slate-500 sm:hidden">
            <span className={`size-2 rounded-full ${statusStyle.dot}`} />
            {statusStyle.text}
          </span>
        </div>
      </div>

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
        </div>

        {/* Right: live preview */}
        <div className={`${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
          {/* On large screens the preview stays in view and scrolls on its own */}
          <div className="lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:p-1">
            <p className="mb-3 hidden text-xs font-medium tracking-wider text-slate-400 uppercase lg:block">
              Live preview
            </p>
            <ResumePreview resume={resume} printRef={printRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
