import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import { useAuth } from "../../context/AuthContext";
import { getTemplate } from "../../templates/registry";
import withSampleContent from "../../templates/sampleResume";
import Button from "../ui/Button";
import { Card } from "../ui/Display";
import ResumeThumbnail from "../ui/ResumeThumbnail";
import SegmentedControl from "../ui/SegmentedControl";
import TemplatePicker from "../editor/TemplatePicker";
import SettingsSection from "./SettingsSection";

// Settings > Preferences. Each choice applies as soon as it's made (no Save button): the theme
// switches at once, the others are the defaults for what you create next.

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];
const DATE_FORMATS = [
  { value: null, label: "Template", ariaLabel: "Template's own" },
  { value: "short", label: "Jan 2024" },
  { value: "numeric", label: "01/2024" },
  { value: "year", label: "2024" },
];
const SAMPLE = withSampleContent({ personalInfo: {} }); // Template previews show the sample resume

export default function PreferencesSection() {
  const { user, updateUser } = useAuth();
  const prefs = user.preferences ?? {};
  const [picking, setPicking] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(null);

  // Shown at once (the theme applies from the user, see AuthContext), then saved; undone if
  // saving fails
  const save = async (patch) => {
    const before = user;
    updateUser({ ...user, preferences: { ...prefs, ...patch } });
    try {
      const { data } = await api.patch("/account/preferences", patch);
      updateUser(data.user);
      toast.success("Preferences saved", { id: "preferences-saved" });
      return true;
    } catch (error) {
      updateUser(before);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const chooseTemplate = async (template) => {
    setSavingTemplate(template.id);
    const saved = await save({ defaultTemplate: template.id });
    setSavingTemplate(null);
    if (saved) setPicking(false);
  };

  const template = getTemplate(prefs.defaultTemplate);

  return (
    <SettingsSection title="Preferences" description="Changes apply right away and follow you to every device you log in on.">
      <Card className="divide-y divide-line" padding="none">
        <Row title="Theme" description="System follows your device's light or dark setting." labelId="pref-theme">
          <SegmentedControl size="sm" labelledBy="pref-theme" options={THEMES} value={prefs.theme ?? "system"} onChange={(theme) => save({ theme })} />
        </Row>
        <Row title="Language" description="For new cover letters and tailored resumes. You can still pick another each time." labelId="pref-language">
          <SegmentedControl size="sm" labelledBy="pref-language" options={LANGUAGES} value={prefs.language ?? "en"} onChange={(language) => save({ language })} />
        </Row>
        <Row title="Date format" description="How dates appear on new resumes (Template: each template's own). Each resume can still change it in its Design tab." labelId="pref-date-format">
          <SegmentedControl size="sm" labelledBy="pref-date-format" options={DATE_FORMATS} value={prefs.dateFormat ?? null} onChange={(dateFormat) => save({ dateFormat })} />
        </Row>
        <Row title="Default template" description="New resumes start with this template." labelId="pref-template">
          <div className="flex items-center gap-4">
            <ResumeThumbnail resume={SAMPLE} templateId={template.id} width={72} className="shrink-0 ring-1 ring-line" />
            <div className="min-w-0">
              <p className="type-label text-fg" data-testid="default-template">
                {template.name}
              </p>
              <Button variant="link" icon={LayoutTemplate} onClick={() => setPicking(true)} className="mt-1 type-small">
                Change template
              </Button>
            </div>
          </div>
        </Row>
      </Card>

      {picking && (
        <TemplatePicker
          resume={{ ...SAMPLE, template: template.id }}
          title="Choose your default template"
          description="New resumes start with this template. Use the swatches to try its colours, then click a template to choose it."
          onSelect={chooseTemplate}
          onClose={() => setPicking(false)}
          savingId={savingTemplate}
        />
      )}
    </SettingsSection>
  );
}

// A setting: its name and a line of explanation, with the control beside it (below on phones)
function Row({ title, description, labelId, children }) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-xs">
        <h3 id={labelId} className="type-label text-fg">
          {title}
        </h3>
        <p className="mt-0.5 type-small text-fg-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
