// A clean, one-column, ATS-friendly resume layout.
// Sizes use pt (points), the unit printers use, so the PDF matches the preview.

// Standard fonts every computer has, so the PDF looks the same as the preview
const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// True if at least one of the entry's text fields has something in it
const hasContent = (entry, fields) => fields.some((field) => entry[field]?.trim());

// "github.com/me" -> "https://github.com/me" (so it's clickable in the PDF)
const toUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
// "https://www.github.com/me/" -> "github.com/me" (shorter text to display)
const toDisplayText = (value) => value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

function Section({ title, children }) {
  return (
    <section className="mt-[13pt]">
      <h2 className="break-after-avoid border-b border-slate-300 pb-[2pt] text-[10.5pt] font-bold tracking-[0.12em] text-indigo-900 uppercase">
        {title}
      </h2>
      <div className="mt-[6pt]">{children}</div>
    </section>
  );
}

export default function ClassicTemplate({ resume }) {
  const { personalInfo = {}, summary = "", skills = [] } = resume;

  const experience = (resume.experience ?? []).filter((job) => hasContent(job, ["role", "company", "startDate", "endDate"]));
  const education = (resume.education ?? []).filter((entry) => hasContent(entry, ["school", "degree", "year"]));
  const projects = (resume.projects ?? []).filter((project) => hasContent(project, ["name", "description", "link"]));

  // Contact details: only the filled-in ones, each with a link where it makes sense
  const contacts = [
    personalInfo.email && { text: personalInfo.email, href: `mailto:${personalInfo.email}` },
    personalInfo.phone && { text: personalInfo.phone, href: `tel:${personalInfo.phone.replace(/[^\d+]/g, "")}` },
    personalInfo.location && { text: personalInfo.location },
    personalInfo.linkedin && { text: toDisplayText(personalInfo.linkedin), href: toUrl(personalInfo.linkedin) },
    personalInfo.github && { text: toDisplayText(personalInfo.github), href: toUrl(personalInfo.github) },
  ].filter(Boolean);

  return (
    <div className="text-[10pt] leading-[1.4] text-slate-800" style={{ fontFamily: FONT_FAMILY }}>
      {/* Header */}
      <header className="text-center">
        <h1 className="text-[24pt] leading-tight font-bold tracking-tight text-slate-900">
          {personalInfo.fullName || "Your Name"}
        </h1>
        {contacts.length > 0 && (
          <p className="mt-[4pt] text-[9.5pt] text-slate-600">
            {contacts.map((item, index) => (
              <span key={item.text}>
                {index > 0 && <span className="mx-[5pt] text-slate-400">·</span>}
                {item.href ? (
                  <a href={item.href} className="text-slate-700 hover:text-indigo-800">
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </span>
            ))}
          </p>
        )}
      </header>

      {summary.trim() && (
        <Section title="Summary">
          <p className="whitespace-pre-line">{summary}</p>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-[9pt]">
            {experience.map((job, index) => {
              const dates = [job.startDate, job.endDate].filter(Boolean).join(" – ");
              const bullets = (job.bullets ?? []).filter((bullet) => bullet.trim());

              return (
                // break-inside-avoid keeps one job on the same page when printing
                <div key={job._id ?? index} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-[12pt]">
                    <p>
                      <span className="font-bold text-slate-900">{job.role}</span>
                      {job.role && job.company && ", "}
                      {job.company}
                    </p>
                    {dates && <p className="shrink-0 text-[9.5pt] text-slate-600">{dates}</p>}
                  </div>
                  {bullets.length > 0 && (
                    <ul className="mt-[3pt] list-disc space-y-[2pt] pl-[14pt] marker:text-slate-400">
                      {bullets.map((bullet, i) => (
                        <li key={i} className="pl-[2pt]">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          <div className="space-y-[5pt]">
            {education.map((entry, index) => (
              <div key={entry._id ?? index} className="flex items-baseline justify-between gap-[12pt] break-inside-avoid">
                <p>
                  <span className="font-bold text-slate-900">{entry.degree}</span>
                  {entry.degree && entry.school && ", "}
                  {entry.school}
                </p>
                {entry.year && <p className="shrink-0 text-[9.5pt] text-slate-600">{entry.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills">
          <p>{skills.join(", ")}</p>
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-[7pt]">
            {projects.map((project, index) => (
              <div key={project._id ?? index} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-[12pt]">
                  <p className="font-bold text-slate-900">{project.name}</p>
                  {project.link && (
                    <a href={toUrl(project.link)} className="shrink-0 text-[9.5pt] text-indigo-800">
                      {toDisplayText(project.link)}
                    </a>
                  )}
                </div>
                {project.description && <p className="mt-[2pt] whitespace-pre-line">{project.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
