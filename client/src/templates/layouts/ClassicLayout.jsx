import { space } from "../themes";
import { ContactLine, MaybeLink, SectionTitle } from "./shared";

// Classic: centred header, headings with a thin line underneath,
// role/company on the left and dates on the right.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 13) }}>
      <SectionTitle theme={theme} className="border-b border-(--line) pb-[2pt]">
        {title}
      </SectionTitle>
      <div style={{ marginTop: space(theme, 6) }}>{children}</div>
    </section>
  );
}

export default function ClassicLayout({ data, theme }) {
  return (
    <div className="text-[10pt] leading-[1.4]">
      <header className="text-center">
        <h1 className="text-[24pt] leading-tight font-bold tracking-tight">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] text-[11pt] text-(--accent)">{data.headline}</p>}
        <ContactLine contacts={data.contacts} className="mt-[4pt] text-[9.5pt] text-(--muted)" />
      </header>

      {data.summary && (
        <Section title="Summary" theme={theme}>
          <p className="whitespace-pre-line">{data.summary}</p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 9) }}>
            {data.experience.map((job) => (
              // break-inside-avoid keeps one job on the same page when printing
              <div key={job.key} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-[12pt]">
                  <p>
                    <span className="font-bold">{job.role}</span>
                    {job.role && job.company && ", "}
                    {job.company}
                  </p>
                  {job.dates && <p className="shrink-0 text-[9.5pt] text-(--muted)">{job.dates}</p>}
                </div>
                {job.bullets.length > 0 && (
                  <ul className="mt-[3pt] list-disc space-y-[2pt] pl-[14pt] marker:text-(--muted)">
                    {job.bullets.map((bullet, i) => (
                      <li key={i} className="pl-[2pt]">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.education.length > 0 && (
        <Section title="Education" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 5) }}>
            {data.education.map((entry) => (
              <div key={entry.key} className="flex items-baseline justify-between gap-[12pt] break-inside-avoid">
                <p>
                  <span className="font-bold">{entry.degree}</span>
                  {entry.degree && entry.school && ", "}
                  {entry.school}
                </p>
                {entry.year && <p className="shrink-0 text-[9.5pt] text-(--muted)">{entry.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills" theme={theme}>
          <p>{data.skills.join(", ")}</p>
        </Section>
      )}

      {data.projects.length > 0 && (
        <Section title="Projects" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 7) }}>
            {data.projects.map((project) => (
              <div key={project.key} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-[12pt]">
                  <p className="font-bold">{project.name}</p>
                  {project.linkText && (
                    <MaybeLink href={project.href} className="shrink-0 text-[9.5pt] text-(--accent)">
                      {project.linkText}
                    </MaybeLink>
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
