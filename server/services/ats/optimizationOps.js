import { htmlToText } from "../../utils/richText.js";

// The changes the ATS optimizer makes, as small operations that can be replayed.
// The optimized resume = the original resume + every change that isn't rejected, applied in
// order (+ the skills the user ticked). Rebuilding from the original each time keeps accept,
// reject and accept-again exact, even when changes interact (e.g. rejecting "My Journey ->
// Experience" also drops the date fixes on those jobs). Jobs are found by id, never by
// position, because one of the changes reorders them.
//
// content: { personalInfo, summary, experience, education, skills, projects, additional, template, design }
// Operations ({ kind, ... }):
//   personalInfo   { field, value }          set a contact detail
//   convertSection { heading, jobs }         remove an "additional" section, add its jobs to Experience
//   heading        { section }               back to the standard heading (remove the custom one)
//   jobField       { jobId, field, value }   set a job's startDate / endDate
//   educationField { index, field, value }   set an education entry's field (they're never reordered)
//   order          { jobIds }                put the jobs in this order
//   bullet         { jobId, from, value }    replace the bullet that reads `from`
//   subtitle       { jobId, bullet, value }  move a bullet into the job's subtitle
//   addSkill       { value }                 add a skill (if it isn't there yet)
//   layout         { template }              ATS-friendly template; keep only page size, hidden
//                                            sections, accent color (and the headings, handled above)
// Also used by job tailoring (services/jobs/tailorResume.js):
//   summary        { value }                 replace the summary
//   bulletOrder    { jobId, bullets }        put a job's bullets in this order (matched by text)
//   projectOrder   { names }                 put the projects in this order (matched by name)
//   skillOrder     { skills }                put the skills in this order (others keep their place after)
//   design         { key, value }            set one design setting (e.g. fitOnePage)
//   addBullet      { jobId, value }          add a bullet to a job (a skill the user confirmed)
//   addProjectText { name, value }           add a sentence to a project's description (the same)

// Design settings kept when the layout is changed (none of them affect ATS parsing)
export const KEPT_DESIGN = ["pageSize", "hiddenSections", "accentColor"];

const findJob = (content, jobId) => content.experience.find((job) => String(job._id) === String(jobId));

// The items in the order given by `order` (matched with `same`); items it doesn't list keep
// their relative order after them, so a reorder never drops anything
function reorder(items, order, same) {
  const rank = (item) => {
    const index = order.findIndex((key) => same(item, key));
    return index < 0 ? Infinity : index;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}
const sameBullet = (a, b) => a === b || htmlToText(a).trim() === htmlToText(b).trim();

export function applyOp(content, op) {
  switch (op.kind) {
    case "personalInfo":
      content.personalInfo[op.field] = op.value;
      break;
    case "convertSection":
      content.additional = content.additional.filter((section) => section.heading !== op.heading);
      content.experience.push(...structuredClone(op.jobs));
      break;
    case "heading":
      if (content.design.sectionHeadings) {
        delete content.design.sectionHeadings[op.section];
        if (Object.keys(content.design.sectionHeadings).length === 0) delete content.design.sectionHeadings;
      }
      break;
    case "jobField": {
      const job = findJob(content, op.jobId);
      if (job) job[op.field] = op.value;
      break;
    }
    case "educationField": {
      const entry = content.education[op.index];
      if (entry) entry[op.field] = op.value;
      break;
    }
    case "order": {
      const rank = (job) => {
        const index = op.jobIds.indexOf(String(job._id));
        return index < 0 ? Infinity : index;
      };
      content.experience.sort((a, b) => rank(a) - rank(b)); // Stable: unknown jobs keep their order
      break;
    }
    case "bullet": {
      const job = findJob(content, op.jobId);
      const index = job ? job.bullets.findIndex((bullet) => sameBullet(bullet, op.from)) : -1;
      if (index >= 0) job.bullets[index] = op.value;
      break;
    }
    case "subtitle": {
      const job = findJob(content, op.jobId);
      if (!job) break;
      const index = job.bullets.findIndex((bullet) => sameBullet(bullet, op.bullet));
      if (index >= 0) job.bullets.splice(index, 1);
      job.subtitle = op.value;
      break;
    }
    case "addSkill":
      if (!content.skills.some((skill) => skill.toLowerCase() === op.value.toLowerCase())) content.skills.push(op.value);
      break;
    case "summary":
      content.summary = op.value;
      break;
    case "bulletOrder": {
      const job = findJob(content, op.jobId);
      if (job) job.bullets = reorder(job.bullets, op.bullets, sameBullet);
      break;
    }
    case "projectOrder":
      content.projects = reorder(content.projects, op.names, (project, name) => project.name === name);
      break;
    case "skillOrder":
      content.skills = reorder(content.skills, op.skills, (skill, name) => skill.toLowerCase() === name.toLowerCase());
      break;
    case "design":
      content.design[op.key] = op.value;
      break;
    case "addBullet": {
      const job = findJob(content, op.jobId);
      if (job && !job.bullets.some((bullet) => sameBullet(bullet, op.value))) job.bullets.push(op.value);
      break;
    }
    case "addProjectText": {
      const project = content.projects.find((entry) => entry.name === op.name);
      const paragraph = `<p>${op.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      if (project && !htmlToText(project.description ?? "").includes(op.value)) project.description = `${project.description ?? ""}${paragraph}`;
      break;
    }
    case "layout": {
      const headings = content.design.sectionHeadings;
      content.template = op.template;
      content.design = Object.fromEntries(KEPT_DESIGN.filter((key) => content.design[key] !== undefined).map((key) => [key, content.design[key]]));
      if (headings) content.design.sectionHeadings = headings;
      break;
    }
    default:
      throw new Error(`Unknown optimization step: ${op.kind}`);
  }
}

// The optimized resume for the current decisions
//   changes       - [{ status: "pending" | "accepted" | "rejected", op }]
//   selectedSkills - skills from "Skills to consider adding" the user ticked
export function buildContent(original, changes, selectedSkills = []) {
  const content = structuredClone(original);
  content.design ??= {};
  for (const change of changes) if (change.status !== "rejected") applyOp(content, change.op);
  for (const skill of selectedSkills) applyOp(content, { kind: "addSkill", value: skill });
  return content;
}
