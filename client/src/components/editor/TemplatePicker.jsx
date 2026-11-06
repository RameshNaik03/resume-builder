import { useMemo, useState } from "react";
import LayoutCard from "./LayoutCard";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import Tabs from "../ui/Tabs";
import { LAYOUTS, TIERS, getTemplate } from "../../templates/registry";
import withSampleContent from "../../templates/sampleResume";

// The template picker (the shared Dialog): Basic / Advanced / Premium tabs and a live thumbnail
// of every layout, each with swatches for its colour palettes (see LayoutCard).
// Render it only while open: {isOpen && <TemplatePicker ... />}
//   fullScreen  - fill the whole window (the "choose a template" step after an import)
//   title, description - override the header text
//   closeLabel  - a text button (e.g. "Skip for now") instead of the close icon
//   savingId    - id of a template being saved: cards are disabled and that one shows a spinner
export default function TemplatePicker({
  resume,
  onSelect,
  onClose,
  fullScreen = false,
  title = "Choose a template",
  description = "Previews use your resume, with sample text for sections you haven't filled in yet. Use the swatches to try its colours, then click a template to apply it.",
  closeLabel,
  savingId = null,
}) {
  // A resume without a template yet (just imported) has nothing selected
  const current = resume.template ? getTemplate(resume.template) : null; // Handles old ids like "classic"
  // Open on the tab of the template currently in use (Basic if there isn't one)
  const [activeTier, setActiveTier] = useState(() => current?.tier ?? "basic");

  // The user's data, with sample text in any empty sections so thumbnails aren't blank
  const previewResume = useMemo(() => withSampleContent(resume), [resume]);

  const tier = TIERS.find((t) => t.id === activeTier);
  const layouts = LAYOUTS.filter((layout) => layout.tier === activeTier);
  const isSaving = savingId !== null;
  const close = () => !isSaving && onClose();

  return (
    <Dialog
      size={fullScreen ? "full" : "lg"}
      title={title}
      description={description}
      onClose={close}
      headerAction={
        closeLabel && (
          <Button onClick={close} disabled={isSaving} className="shrink-0">
            {closeLabel}
          </Button>
        )
      }
    >
      <div className={fullScreen ? "mx-auto max-w-7xl" : ""}>
        <Tabs
          label="Template tiers"
          value={activeTier}
          onChange={setActiveTier}
          tabs={TIERS.map((t) => ({ id: t.id, label: t.name, count: LAYOUTS.filter((layout) => layout.tier === t.id).length }))}
        />
        {/* Only the active tab is rendered, which keeps the picker fast */}
        <div role="tabpanel" aria-label={tier.name} className="pt-4">
          <p className="mb-4 type-small text-fg-muted">{tier.description}</p>
          {layouts.length > 0 ? (
            <div className={`grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 ${fullScreen ? "xl:grid-cols-4" : ""}`}>
              {layouts.map((layout) => (
                <LayoutCard
                  key={layout.id}
                  layout={layout}
                  resume={previewResume}
                  selectedId={current?.id ?? null}
                  paletteId={current?.theme.id}
                  onSelect={onSelect}
                  disabled={isSaving}
                  savingId={savingId}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
              <p className="type-label text-fg">{tier.name} templates are coming soon</p>
              <p className="mt-1 type-small text-fg-muted">For now, pick any Basic template. They're all ATS-friendly.</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
