import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useResume from "../hooks/useResume";
import Loader from "../components/Loader";
import ResumePreview from "../components/ResumePreview";
import CollapsibleSection from "../components/editor/CollapsibleSection";
import PersonalInfoForm from "../components/editor/PersonalInfoForm";
import SummaryForm from "../components/editor/SummaryForm";
import SkillsForm from "../components/editor/SkillsForm";

// Text and dot colour for each save status
const STATUS_STYLES = {
  saved: { text: "Saved", dot: "bg-emerald-500" },
  unsaved: { text: "Unsaved changes", dot: "bg-amber-500" },
  saving: { text: "Saving...", dot: "bg-indigo-500 animate-pulse" },
  error: { text: "Couldn't save", dot: "bg-red-500" },
};

// Sections that will be built in the next phase
const COMING_SOON = [
  { title: "Experience", description: "Jobs and internships" },
  { title: "Education", description: "Schools and degrees" },
  { title: "Projects", description: "Things you've built" },
];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, loading, loadError, status, updateResume, save } = useResume(id);
  const [activeTab, setActiveTab] = useState("edit"); // Mobile only: "edit" or "preview"

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
          <Link to="/dashboard" className="btn-primary mt-6">
            Back to dashboard
          </Link>
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

          {COMING_SOON.map((section) => (
            <CollapsibleSection key={section.title} title={section.title} description={section.description}>
              <p className="text-sm text-slate-400">Coming soon.</p>
            </CollapsibleSection>
          ))}
        </div>

        {/* Right: live preview */}
        <div className={`${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-36">
            <p className="mb-3 hidden text-xs font-medium tracking-wider text-slate-400 uppercase lg:block">
              Live preview
            </p>
            <ResumePreview resume={resume} />
          </div>
        </div>
      </div>
    </div>
  );
}
