import { useMemo, useState } from "react";
import Modal from "../Modal";
import TemplateThumbnail from "./TemplateThumbnail";
import { TEMPLATES, TIERS, getTemplate } from "../../templates/registry";
import withSampleContent from "../../templates/sampleResume";

// Modal with Basic / Advanced / Premium tabs and a live thumbnail of every template.
// Render it only while open: {isOpen && <TemplatePicker ... />}
//   fullScreen  - fill the whole window (used for the "choose a template" step after an import)
//   title, description - override the header text
//   closeLabel  - show a text button (e.g. "Skip for now") instead of the ✕ icon
//   savingId    - id of a template being saved: cards are disabled and that one shows a spinner
export default function TemplatePicker({
  resume,
  onSelect,
  onClose,
  fullScreen = false,
  title = "Choose a template",
  description = "Previews use your resume, with sample text for sections you haven't filled in yet. Click one to apply it.",
  closeLabel,
  savingId = null,
}) {
  // A resume without a template yet (just imported) has nothing selected
  const selectedId = resume.template ? getTemplate(resume.template).id : null; // Handles old ids like "classic"
  // Open on the tab of the template currently in use (Basic if there isn't one)
  const [activeTier, setActiveTier] = useState(() => (resume.template ? getTemplate(resume.template).tier : "basic"));

  // The user's data, with sample text in any empty sections so thumbnails aren't blank
  const previewResume = useMemo(() => withSampleContent(resume), [resume]);

  const tier = TIERS.find((t) => t.id === activeTier);
  const templates = TEMPLATES.filter((template) => template.tier === activeTier);
  const isSaving = savingId !== null;

  return (
    <Modal
      onClose={() => !isSaving && onClose()}
      labelledBy="template-picker-title"
      fullScreen={fullScreen}
      className={`flex flex-col ${fullScreen ? "" : "max-h-[90vh] max-w-5xl"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <h2 id="template-picker-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        {closeLabel ? (
          <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary shrink-0">
            {closeLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 px-5 sm:px-6" role="tablist">
        {TIERS.map((t) => {
          const count = TEMPLATES.filter((template) => template.tier === t.id).length;
          const isActive = t.id === activeTier;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTier(t.id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.name}
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid (only the active tab is rendered, which keeps the modal fast) */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6" role="tabpanel">
        <div className={fullScreen ? "mx-auto max-w-7xl" : ""}>
          <p className="mb-4 text-sm text-slate-500">{tier.description}</p>

          {templates.length > 0 ? (
            <div className={`grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 ${fullScreen ? "xl:grid-cols-4" : ""}`}>
              {templates.map((template) => (
                <TemplateThumbnail
                  key={template.id}
                  template={template}
                  resume={previewResume}
                  selected={template.id === selectedId}
                  onSelect={onSelect}
                  disabled={isSaving}
                  saving={template.id === savingId}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-14 text-center">
              <p className="font-medium text-slate-700">{tier.name} templates are coming soon</p>
              <p className="mt-1 text-sm text-slate-500">For now, pick any Basic template. They're all ATS-friendly.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
