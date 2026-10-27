import { htmlToText } from "../../utils/richText.js";

// Turns a saved resume (from MongoDB) into plain text with section headings,
// roughly what an ATS would read from the exported PDF.
// Rich text fields (summary, bullets, project descriptions) are converted from HTML to text.
export default function resumeToText(resume) {
  const { personalInfo = {}, experience = [], education = [], skills = [], projects = [], additional = [] } = resume;
  const summary = htmlToText(resume.summary);
  const lines = [];
  const section = (heading, body) => {
    const content = body.filter(Boolean);
    if (content.length) lines.push("", heading.toUpperCase(), ...content);
  };

  lines.push(
    personalInfo.fullName,
    personalInfo.headline,
    [personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join(" | "),
    [personalInfo.linkedin, personalInfo.github].filter(Boolean).join(" | ")
  );

  section("Summary", [summary]);
  section(
    "Experience",
    experience.flatMap((job) => [
      [job.role, job.company].filter(Boolean).join(" - "),
      [job.startDate, job.endDate].filter(Boolean).join(" - "),
      ...job.bullets.map((bullet) => `• ${htmlToText(bullet)}`),
    ])
  );
  section(
    "Education",
    education.map((entry) => [entry.degree, entry.school, entry.year].filter(Boolean).join(", "))
  );
  section("Skills", [skills.join(", ")]);
  section(
    "Projects",
    projects.flatMap((project) => [project.name, htmlToText(project.description), project.link])
  );
  for (const extra of additional) section(extra.heading || "Additional", extra.items);

  return lines.filter((line) => line !== undefined).join("\n").trim();
}
