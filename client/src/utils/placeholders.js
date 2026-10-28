import { toPlainText } from "./richText";

// Placeholders the ATS optimizer puts where a real number belongs, e.g. "[X%]" or "[N users]"
// (square brackets, no digits inside). The user should replace them before sending the resume.
const PLACEHOLDER = /\[[^\]\d<>]{1,30}\]/g;

export const findPlaceholders = (text) => (text ?? "").match(PLACEHOLDER) ?? [];

// Every placeholder still in the resume (summary, job subtitles and bullets, project descriptions)
export function placeholdersIn(resume) {
  const texts = [
    resume.summary,
    ...(resume.experience ?? []).flatMap((job) => [job.subtitle, ...(job.bullets ?? [])]),
    ...(resume.projects ?? []).map((project) => project.description),
  ];
  return texts.flatMap((text) => findPlaceholders(toPlainText(text ?? "")));
}

// Wraps placeholders in sanitized HTML in <mark class="ats-placeholder"> (text only, never
// inside a tag). For the on-screen preview; the printed PDF doesn't get the highlight.
export const markPlaceholders = (html) =>
  html
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith("<") ? part : part.replace(PLACEHOLDER, (match) => `<mark class="ats-placeholder">${match}</mark>`)))
    .join("");
