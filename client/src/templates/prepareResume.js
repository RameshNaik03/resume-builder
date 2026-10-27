import formatDate, { joinRange } from "./formatDate";
import { PHOTO_SHAPES } from "./design";
import { toPlainText, toSafeHtml } from "../utils/richText";

// Cleans up resume data once, so every layout can simply render it:
// empty entries are removed, dates are joined and links are made clickable.
// It also applies the design's layout settings (see design.js):
//   sections      - the sections to show, in order: [{ id, title, column: "main" | "side" }]
//                   (hidden and empty sections are left out; headings can be renamed)
//   columns       - 1 or 2; sideRatio / sideRatioChanged - side column width in %
//   skillsDisplay - null (the layout's own style) | "comma" | "tags" | "bullets"
//   dates         - reformatted when a date format is chosen
//   photo         - null, or { url, alt, sizeMm, radius, border, borderColor, position }
// summary, job bullets and project descriptions become sanitized HTML (rich text; plain text
// from older resumes is converted), rendered with <RichText> / <BulletList rich>.

// True if at least one of the entry's text fields has something in it
const hasContent = (entry, fields) => fields.some((field) => entry[field]?.trim());

// "github.com/me" -> "https://github.com/me"
const toUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
// "https://www.github.com/me/" -> "github.com/me"
const toDisplayText = (value) => value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

// withLinks = false is used for thumbnails (links aren't allowed inside a button)
//   design   - the resolved design (template defaults + the resume's overrides)
//   changed  - the design settings the resume overrides (to tell a chosen value from a default)
export default function prepareResume(resume, withLinks = true, design, changed = {}) {
  const info = resume.personalInfo ?? {};
  const link = (href) => (withLinks ? href : undefined);
  const date = (text) => formatDate(text, design.dateFormat);
  // Rich text -> safe HTML (thumbnails get no links: they're inside a button)
  const richHtml = (value, inline = false) => toSafeHtml(value, { inline, links: withLinks });

  const contacts = [
    info.email && { text: info.email, href: link(`mailto:${info.email}`) },
    info.phone && { text: info.phone, href: link(`tel:${info.phone.replace(/[^\d+]/g, "")}`) },
    info.location && { text: info.location },
    info.linkedin && { text: toDisplayText(info.linkedin), href: link(toUrl(info.linkedin)) },
    info.github && { text: toDisplayText(info.github), href: link(toUrl(info.github)) },
  ].filter(Boolean);

  const data = {
    name: info.fullName?.trim() || "Your Name",
    headline: info.headline?.trim() ?? "", // e.g. "Full Stack Developer"
    contacts,
    summary: richHtml(resume.summary), // "" when empty
    skills: (resume.skills ?? []).filter((skill) => skill.trim()),

    experience: (resume.experience ?? [])
      .filter((job) => hasContent(job, ["role", "company", "startDate", "endDate"]))
      .map((job, index) => ({
        ...job,
        key: job._id ?? index,
        // With a date format, a range that starts and ends the same (e.g. "2022 – 2022") shows once
        dates: design.dateFormat
          ? joinRange([date(job.startDate), date(job.endDate)])
          : [job.startDate, job.endDate].filter(Boolean).join(" – "),
        bullets: (job.bullets ?? []).filter((bullet) => toPlainText(bullet).trim()).map((bullet) => richHtml(bullet, true)),
      })),

    education: (resume.education ?? [])
      .filter((entry) => hasContent(entry, ["school", "degree", "year"]))
      .map((entry, index) => ({ ...entry, key: entry._id ?? index, year: date(entry.year) })),

    projects: (resume.projects ?? [])
      .filter((project) => hasContent(project, ["name", "description", "link"]))
      .map((project, index) => ({
        ...project,
        key: project._id ?? index,
        description: richHtml(project.description),
        href: project.link ? link(toUrl(project.link)) : undefined,
        linkText: project.link ? toDisplayText(project.link) : "",
      })),

    // Extra sections such as Certifications or Languages
    additional: (resume.additional ?? [])
      .map((section, index) => ({
        key: section._id ?? index,
        heading: section.heading?.trim() || "Additional Information",
        items: (section.items ?? []).filter((item) => item.trim()),
      }))
      .filter((section) => section.items.length > 0),
  };

  // Sections with something to show, in the design's order, minus hidden ones
  const hasData = {
    summary: Boolean(data.summary),
    experience: data.experience.length > 0,
    education: data.education.length > 0,
    skills: data.skills.length > 0,
    projects: data.projects.length > 0,
    additional: data.additional.length > 0,
  };
  const twoColumns = design.columns === 2;
  data.sections = design.sectionOrder
    .filter((id) => hasData[id] && !design.hiddenSections.includes(id))
    .map((id) => ({
      id,
      key: id,
      title: design.sectionHeadings[id],
      column: twoColumns && design.sideSections.includes(id) ? "side" : "main",
    }));
  data.columns = design.columns;
  data.sideRatio = design.sideRatio;
  data.sideRatioChanged = "sideRatio" in changed; // Sidebar / Split Modern keep their own widths otherwise
  data.skillsDisplay = design.skillsDisplay;
  data.headerAlign = design.headerAlign; // Most layouts use the --header-align CSS variable instead

  // Profile photo: only when one was uploaded and "Show photo" is on
  data.photo =
    info.photoUrl && design.showPhoto
      ? {
          url: info.photoUrl,
          alt: `Photo of ${data.name}`,
          sizeMm: design.photoSize,
          radius: PHOTO_SHAPES[design.photoShape].radius,
          border: design.photoBorder,
          borderColor: design.photoBorderColor, // null = the layout's own colour
          position: design.photoPosition,
        }
      : null;

  return data;
}
