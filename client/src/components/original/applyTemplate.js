import { useMemo } from "react";
import api from "../../api/axios";
import { contentSettings, matchDesign } from "../../templates/matchDesign";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "../../templates/registry";

// The match for a resume's original design (see templates/matchDesign.js), or a plain default
// template when the file's design couldn't be read (fallback: true)
export function useMatchedDesign(resume) {
  const detected = resume?.original?.design;
  return useMemo(
    () => matchDesign(detected) ?? { templateId: DEFAULT_TEMPLATE_ID, design: {}, notes: [], templateName: getTemplate(DEFAULT_TEMPLATE_ID).name, fallback: true },
    [detected]
  );
}

// Turning an imported resume into an editable one: saves the template (and design) it will be
// edited in. The original file is kept either way.
//   "Use this": the matched template with the full matched design
//   "Choose a different template": the chosen template, keeping only the user's section order,
//   heading names and page size (the chosen template sets the look)
export const saveMatchedTemplate = (resumeId, match) => api.put(`/resumes/${resumeId}`, { template: match.templateId, design: match.design }).then(({ data }) => data);

export const saveChosenTemplate = (resumeId, templateId, match) =>
  api.put(`/resumes/${resumeId}`, { template: templateId, design: contentSettings(match?.design) }).then(({ data }) => data);
