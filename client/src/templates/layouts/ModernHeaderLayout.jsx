import { space } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionTitle } from "./shared";

// Modern Header: a bold coloured band across the top with name, title and contacts,
// then a single column of sections (still easy for ATS systems to read).
// This layout is "full bleed", so it sets its own page margins.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 13) }}>
      {/* Plain wrapper is the page-break block, so the accent bar never stretches */}
      <div data-block data-keep>
        <SectionTitle theme={theme} className="border-l-[3pt] border-(--accent) pl-[6pt] leading-none">
          {title}
        </SectionTitle>
      </div>
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

      <div className="px-[16mm] pt-[6mm] pb-[14mm]">
        {data.summary && (
          <Section title="Summary" theme={theme}>
            <p className="whitespace-pre-line" data-block>
              {data.summary}
            </p>
          </Section>
        )}

        {data.experience.length > 0 && (
          <Section title="Experience" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 9) }}>
              {data.experience.map((job) => (
                <div key={job.key}>
                  <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={job.bullets.length > 0}>
                    <p>
                      <span className="font-bold">{job.role}</span>
                      {job.role && job.company && <span className="text-(--muted)"> at </span>}
                      <span className="font-semibold text-(--accent)">{job.company}</span>
                    </p>
                    {job.dates && <p className="shrink-0 text-[9pt] text-(--muted)">{job.dates}</p>}
                  </div>
                  <BulletList
                    items={job.bullets}
                    className="mt-[3pt] space-y-[2pt] pl-[14pt] marker:text-(--accent)"
                    itemClassName="pl-[2pt]"
                  />
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.education.length > 0 && (
          <Section title="Education" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 5) }}>
              {data.education.map((entry) => (
                <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
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
            <p data-block>{data.skills.join("  ·  ")}</p>
          </Section>
        )}

        {data.projects.length > 0 && (
          <Section title="Projects" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 7) }}>
              {data.projects.map((project) => (
                <div key={project.key}>
                  <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={Boolean(project.description)}>
                    <p className="font-bold">{project.name}</p>
                    {project.linkText && (
                      <MaybeLink href={project.href} className="shrink-0 text-[9pt] text-(--accent)">
                        {project.linkText}
                      </MaybeLink>
                    )}
                  </div>
                  {project.description && (
                    <p className="mt-[2pt] whitespace-pre-line" data-block>
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.additional.map((section) => (
          <Section key={section.key} title={section.heading} theme={theme}>
            <BulletList items={section.items} className="space-y-[2pt] pl-[14pt] marker:text-(--accent)" itemClassName="pl-[2pt]" />
          </Section>
        ))}
      </div>
    </div>
  );
}
