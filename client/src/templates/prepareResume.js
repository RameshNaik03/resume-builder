// Cleans up resume data once, so every layout can simply render it:
// empty entries are removed, dates are joined and links are made clickable.

// True if at least one of the entry's text fields has something in it
const hasContent = (entry, fields) => fields.some((field) => entry[field]?.trim());

// "github.com/me" -> "https://github.com/me"
const toUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
// "https://www.github.com/me/" -> "github.com/me"
const toDisplayText = (value) => value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

// withLinks = false is used for thumbnails (links aren't allowed inside a button)
export default function prepareResume(resume, withLinks = true) {
  const info = resume.personalInfo ?? {};
  const link = (href) => (withLinks ? href : undefined);

  const contacts = [
    info.email && { text: info.email, href: link(`mailto:${info.email}`) },
    info.phone && { text: info.phone, href: link(`tel:${info.phone.replace(/[^\d+]/g, "")}`) },
    info.location && { text: info.location },
    info.linkedin && { text: toDisplayText(info.linkedin), href: link(toUrl(info.linkedin)) },
    info.github && { text: toDisplayText(info.github), href: link(toUrl(info.github)) },
  ].filter(Boolean);

  return {
    name: info.fullName?.trim() || "Your Name",
    headline: info.headline?.trim() ?? "", // e.g. "Full Stack Developer"
    contacts,
    summary: (resume.summary ?? "").trim(),
    skills: (resume.skills ?? []).filter((skill) => skill.trim()),

    experience: (resume.experience ?? [])
      .filter((job) => hasContent(job, ["role", "company", "startDate", "endDate"]))
      .map((job, index) => ({
        ...job,
        key: job._id ?? index,
        dates: [job.startDate, job.endDate].filter(Boolean).join(" – "),
        bullets: (job.bullets ?? []).filter((bullet) => bullet.trim()),
      })),

    education: (resume.education ?? [])
      .filter((entry) => hasContent(entry, ["school", "degree", "year"]))
      .map((entry, index) => ({ ...entry, key: entry._id ?? index })),

    projects: (resume.projects ?? [])
      .filter((project) => hasContent(project, ["name", "description", "link"]))
      .map((project, index) => ({
        ...project,
        key: project._id ?? index,
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
}
