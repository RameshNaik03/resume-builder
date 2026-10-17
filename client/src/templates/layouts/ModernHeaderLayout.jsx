import { space } from "../themes";
import { ContactLine, MaybeLink, SectionTitle } from "./shared";

// Modern Header: a bold coloured band across the top with name, title and contacts,
// then a single column of sections (still easy for ATS systems to read).
// This layout is "full bleed", so it sets its own page margins.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 13) }}>
      {/* Heading with a short accent bar on the left */}
      <SectionTitle theme={theme} className="border-l-[3pt] border-(--accent) pl-[6pt] leading-none">
        {title}
      </SectionTitle>
      <div style={{ marginTop: space(theme, 7) }}>{children}</div>
    </section>
  );
}

export default function ModernHeaderLayout({ data, theme }) {
  return (
    <div className="text-[10pt] leading-[1.4]">
      <header className="bg-(--accent) px-[16mm] pt-[13mm] pb-[9mm] text-(--on-accent)">
        <h1 className="text-[26pt] leading-tight font-bold tracking-tight">{data.name}</h1>
        {data.headline && <p className="mt-[3pt] text-[12.5pt] opacity-90">{data.headline}</p>}
        <ContactLine contacts={data.contacts} className="mt-[9pt] text-[9pt] opacity-90" />
      </header>

      {/* box-decoration-clone repeats this padding at the top of page 2 */}
      <div className="box-decoration-clone px-[16mm] pt-[6mm] pb-[14mm]">
        {data.summary && (
          <Section title="Summary" theme={theme}>
            <p className="whitespace-pre-line">{data.summary}</p>
          </Section>
        )}

        {data.experience.length > 0 && (
          <Section title="Experience" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 9) }}>
              {data.experience.map((job) => (
                <div key={job.key} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-[12pt]">
                    <p>
                      <span className="font-bold">{job.role}</span>
                      {job.role && job.company && <span className="text-(--muted)"> at </span>}
                      <span className="font-semibold text-(--accent)">{job.company}</span>
                    </p>
                    {job.dates && <p className="shrink-0 text-[9pt] text-(--muted)">{job.dates}</p>}
                  </div>
                  {job.bullets.length > 0 && (
                    <ul className="mt-[3pt] list-disc space-y-[2pt] pl-[14pt] marker:text-(--accent)">
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
                  {entry.year && <p className="shrink-0 text-[9pt] text-(--muted)">{entry.year}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.skills.length > 0 && (
          <Section title="Skills" theme={theme}>
            <p>{data.skills.join("  ·  ")}</p>
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
                      <MaybeLink href={project.href} className="shrink-0 text-[9pt] text-(--accent)">
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
    </div>
  );
}
