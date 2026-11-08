import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Download, FileText, LayoutTemplate } from "lucide-react";
import toast from "../utils/toast";
import { getTemplate } from "../templates/registry";
import { resolveDesign } from "../templates/design";
import printPageStyle, { printWhenFontsReady, reportPrintError } from "../utils/printPageStyle";
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
import OriginalDialog from "../components/original/OriginalDialog";
import Switch from "../components/Switch";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import { Alert, Badge } from "../components/ui/Display";
import { pageClass } from "../components/ui/pageLayout";
import { fitSuggestions } from "../templates/fit";

// Text and dot colour for each save status
const STATUS_STYLES = {
  saved: { text: "Saved", dot: "bg-success" },
  unsaved: { text: "Unsaved changes", dot: "bg-warning" },
  saving: { text: "Saving...", dot: "bg-accent motion-safe:animate-pulse" },
  error: { text: "Couldn't save", dot: "bg-danger" },
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
  const [isOriginalOpen, setIsOriginalOpen] = useState(false); // "View original" (imported resumes)

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

  const handleDownloadPdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: resume?.title?.trim() || "Resume",
    pageStyle: printPageStyle(pageSize),
    print: printWhenFontsReady(() => resume?.title?.trim() || "Resume"), // Waits for the fonts in use, then prints
    onPrintError: reportPrintError, // Never fail silently
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
      <div className={pageClass("narrow", "text-center")}>
        <h1 className="type-h2 text-fg">Couldn't open this resume</h1>
        <p className="mt-2 type-body text-fg-muted">{loadError}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button as={Link} to="/dashboard" variant="primary">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[status];
  // Fit to one page and the page count (in the top bar, or the row below it on phones)
  const fitControl = (testId, phone = false) => (
    <>
      {phone ? (
        <span className="type-small text-fg-muted" aria-hidden="true">
          One page
        </span>
      ) : (
        <span className="hidden type-small text-fg-muted xl:inline">Fit to one page</span>
      )}
      <Switch checked={fitOn} onChange={setFitOnePage} label="Fit to one page" />
      <span aria-live="polite" data-testid={testId}>
        <Badge tone={previewStatus.pageCount > 1 ? "warning" : "neutral"}>
          {fitOn && fitStatus?.pending ? "Fitting…" : `${previewStatus.pageCount} ${previewStatus.pageCount === 1 ? "page" : "pages"}`}
        </Badge>
      </span>
    </>
  );
  const saveStatus = (
    <span className="flex items-center gap-1.5 type-small text-fg-muted" aria-live="polite" title={statusStyle.text}>
      <span className={`size-2 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
      <span className="max-sm:sr-only">{statusStyle.text}</span>
    </span>
  );

  return (
    <div>
      {/* Top bar (sits just below the AppShell's 4rem bar) */}
      <div className="sticky top-16 z-10 border-b border-line bg-surface" data-testid="editor-toolbar">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
          <Button variant="ghost" iconOnly icon={ArrowLeft} onClick={handleBack} aria-label="Back to dashboard" title="Back to dashboard" />
          <input
            type="text"
            value={resume.title}
            onChange={(event) => updateResume({ title: event.target.value })}
            onBlur={() => !resume.title.trim() && updateResume({ title: "Untitled Resume" })}
            maxLength={100}
            aria-label="Resume title"
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 type-h3 text-ellipsis text-fg outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-3 focus:ring-accent/15"
          />
          <div className="hidden sm:block">{saveStatus}</div>

          {resume.original && (
            <Button icon={FileText} onClick={() => setIsOriginalOpen(true)} aria-label="View original" title="View original" className="max-xl:w-9 max-xl:px-0">
              <span className="hidden xl:inline">View original</span>
            </Button>
          )}
          <Button icon={LayoutTemplate} onClick={() => setIsPickerOpen(true)} aria-label="Templates" className="max-md:w-9 max-md:px-0">
            <span className="hidden md:inline">Templates</span>
          </Button>
          {/* Fit to one page, with the page count always shown (on phones: in the row below) */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">{fitControl("page-count")}</div>
          <Button icon={Download} onClick={() => handleDownloadPdf()} aria-label="Download PDF" className="max-md:w-9 max-md:px-0">
            <span className="hidden md:inline">Download PDF</span>
          </Button>
          <Button variant="primary" onClick={save} disabled={status === "saved" || status === "saving"}>
            {status === "saving" ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Phones and tablets: Edit / Preview, and (phones) Fit to one page and the save status */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-2.5 lg:hidden">
          <Tabs
            variant="segmented"
            label="Show"
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "edit", label: "Edit" },
              { id: "preview", label: "Preview" },
            ]}
          />
          <div className="flex items-center gap-3 sm:hidden">
            <div className="flex items-center gap-2">{fitControl("page-count-phone", true)}</div>
            {saveStatus}
          </div>
        </div>
      </div>

      {/* Notices: after an import, after the ATS optimizer, and while placeholders are left */}
      {(showImportBanner || optimized || placeholders.length > 0) && (
        <div className="mx-auto max-w-7xl space-y-3 px-4 pt-6 sm:px-6">
          {showImportBanner && (
            <Alert
              tone="info"
              title="We imported your resume"
              onDismiss={dismissImportBanner}
              action={
                <Button size="sm" icon={LayoutTemplate} onClick={() => setIsPickerOpen(true)}>
                  Change template
                </Button>
              }
            >
              Please check each section, as imports aren't always perfect. You can change the template anytime.
              {bulletsUnassigned && <span className="mt-1 block font-medium text-warning">We couldn't tell which bullets belong to which job. Please check your Experience section.</span>}
            </Alert>
          )}

          {optimized && (
            <Alert
              tone="success"
              title={`ATS-optimized copy created${optimized.after > optimized.before ? `: your score went up ${optimized.after - optimized.before} points (${optimized.before} → ${optimized.after})` : ""}`}
              onDismiss={dismissOptimizedBanner}
            >
              We made {optimized.changes} change{optimized.changes === 1 ? "" : "s"}; your original resume is unchanged. Please check each section before you use it.
              {optimized.skillsToConsider > 0 &&
                ` ${optimized.skillsToConsider} keyword${optimized.skillsToConsider === 1 ? " from the job wasn't" : "s from the job weren't"} added because your resume doesn't show ${optimized.skillsToConsider === 1 ? "it" : "them"} yet. Add only the ones you really have.`}
              <span className="mt-1 block">Fonts and layout were reset for ATS compatibility. You can still change colors in the Design tab.</span>
            </Alert>
          )}

          {placeholders.length > 0 && (
            <Alert tone="warning" role="status" title={`${placeholders.length} placeholder${placeholders.length === 1 ? "" : "s"} still need${placeholders.length === 1 ? "s" : ""} real numbers`}>
              ({[...new Set(placeholders)].slice(0, 3).join(", ")}). Replace each with your actual figure, or remove it. They're highlighted in yellow in the preview (not in the PDF).
            </Alert>
          )}
        </div>
      )}

      {/* Two columns on large screens; Edit / Preview decides which one shows on smaller ones */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2">
        {/* Left: content form or design settings */}
        <div className={`min-w-0 space-y-4 ${activeTab === "edit" ? "block" : "hidden"} lg:block`}>
          <Tabs
            variant="segmented"
            fullWidth
            label="Editor panels"
            value={formPanel}
            onChange={setFormPanel}
            tabs={[
              { id: "content", label: "Content" },
              { id: "design", label: "Design" },
            ]}
          />

          {formPanel === "design" ? (
            <DesignPanel resume={resume} onChange={(design) => updateResume({ design })} />
          ) : (
            <>
              <CollapsibleSection title="Personal info" description="Name and contact details" defaultOpen>
                <PersonalInfoForm data={resume.personalInfo} onChange={(personalInfo) => updateResume({ personalInfo })} resumeId={resume._id} onPhotoChange={setPhotoUrl} />
              </CollapsibleSection>

              <CollapsibleSection title="Summary" description="A short introduction about you">
                <SummaryForm value={resume.summary} onChange={(summary) => updateResume({ summary })} />
              </CollapsibleSection>

              <CollapsibleSection title="Skills" description="Tools, languages and technologies">
                <SkillsForm skills={resume.skills} skillLevels={resume.skillLevels ?? []} onChange={(changes) => updateResume(changes)} />
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

              <CollapsibleSection title="Additional sections" description={withCount("Certifications, languages, awards…", resume.additional ?? [])}>
                <AdditionalForm items={resume.additional ?? []} onChange={(additional) => updateResume({ additional })} />
              </CollapsibleSection>
            </>
          )}
        </div>

        {/* Right: live preview (the visual focus; on large screens it stays in view and scrolls on its own) */}
        <div className={`min-w-0 ${activeTab === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-36 lg:max-h-workspace lg:overflow-y-auto lg:p-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="hidden type-eyebrow text-fg-muted lg:block">Live preview</p>
              <Button variant="link" className="type-small" onClick={() => setIsPickerOpen(true)}>
                {getTemplate(resume.template).name} · Change
              </Button>
            </div>
            {tooLong && (
              <div className="mb-3" data-testid="fit-too-long">
                <Alert
                  tone="warning"
                  role="status"
                  title={`Your resume is still ${fitStatus.overflowLines} ${fitStatus.overflowLines === 1 ? "line" : "lines"} too long for one page.`}
                  action={
                    <Button size="sm" onClick={showHideSections}>
                      Hide sections in the Design tab
                    </Button>
                  }
                >
                  Everything is already at the smallest readable size, so some content has to go. A few ideas:
                  {suggestions.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </Alert>
              </div>
            )}
            <ResumePreview resume={resume} printRef={printRef} highlightPlaceholders onStatus={setPreviewStatus} />
          </div>
        </div>
      </div>

      {isPickerOpen && <TemplatePicker resume={resume} onSelect={handleSelectTemplate} onClose={() => setIsPickerOpen(false)} />}
      {isOriginalOpen && <OriginalDialog resume={resume} onClose={() => setIsOriginalOpen(false)} />}
    </div>
  );
}
