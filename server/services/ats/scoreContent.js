import resumeToText from "./resumeToText.js";
import savedResumeLayout from "./savedResumeLayout.js";
import scoreResume from "./scoreResume.js";
import parseWithRules from "../import/parseWithRules.js";
import sanitizeResume from "../import/sanitizeResume.js";

// The ATS score of resume content as it would be laid out in a template (rules only).
// Used for saved resumes, the optimizer's before/after and tailored resumes.
export default function scoreContent(content, { template, design }, { jobDescription, jobTitle }) {
  const text = resumeToText(content);
  const inspection = savedResumeLayout({ template, design }, text);
  const { score, grade } = scoreResume({ text, inspection, parsed: sanitizeResume(parseWithRules(text)), jobDescription, jobTitle });
  return { score, grade };
}
