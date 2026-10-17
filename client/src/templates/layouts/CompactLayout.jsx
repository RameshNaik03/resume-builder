import { space } from "../themes";
import { ContactLine, MaybeLink, SectionTitle } from "./shared";

// Compact: smaller text and tighter spacing to fit more on one page.
// Accent rule under the header; headings followed by a thin line to the edge.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 10) }}>
      <div className="flex items-center gap-[6pt]">
        <SectionTitle theme={theme} size="sm" className="shrink-0">
          {title}
        </SectionTitle>
        <span className="h-px flex-1 bg-(--line)" aria-hidden="true" />
      </div>
      <div style={{ marginTop: space(theme, 4) }}>{children}</div>
    </section>
  );
}

export default function CompactLayout({ data, theme }) {
  return (
    <div className="text-[9.5pt] leading-[1.35]">
      <header className="border-b-[1.5pt] border-(--accent) pb-[6pt]">
        <h1 className="text-[20pt] leading-tight font-bold tracking-tight">
          {data.name}
          {data.headline && <span className="ml-[8pt] text-[11pt] font-normal text-(--accent)">{data.headline}</span>}
        </h1>
        <ContactLine contacts={data.contacts} separator="|" className="mt-[3pt] text-[9pt] text-(--muted)" />
      </header>

      {data.summary && (
        <Section title="Summary" theme={theme}>
          <p className="whitespace-pre-line">{data.summary}</p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 6) }}>
            {data.experience.map((job) => (
              <div key={job.key} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-[10pt]">
                  <p>
                    <span className="font-bold">{job.role}</span>
                    {job.role && job.company && <span className="text-(--muted)"> | </span>}
                    {job.company}
                  </p>
                  {job.dates && <p className="shrink-0 text-[9pt] text-(--muted)">{job.dates}</p>}
                </div>
                {job.bullets.length > 0 && (
                  <ul className="mt-[2pt] list-disc space-y-[1pt] pl-[12pt] marker:text-(--muted)">
                    {job.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
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
          <div className="flex flex-col" style={{ gap: space(theme, 3) }}>
            {data.education.map((entry) => (
              <div key={entry.key} className="flex items-baseline justify-between gap-[10pt] break-inside-avoid">
                <p>
                  <span className="font-bold">{entry.degree}</span>
                  {entry.degree && entry.school && <span className="text-(--muted)"> | </span>}
                  {entry.school}
                </p>
                {entry.year && <p className="shrink-0 text-[9pt] text-(--muted)">{entry.year}</p>}
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
          <div className="flex flex-col" style={{ gap: space(theme, 5) }}>
            {data.projects.map((project) => (
              <div key={project.key} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-[10pt]">
                  <p className="font-bold">{project.name}</p>
                  {project.linkText && (
                    <MaybeLink href={project.href} className="shrink-0 text-[9pt] text-(--accent)">
                      {project.linkText}
                    </MaybeLink>
                  )}
                </div>
                {project.description && <p className="whitespace-pre-line">{project.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
