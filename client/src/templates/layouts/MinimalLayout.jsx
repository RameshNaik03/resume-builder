import { space } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionTitle } from "./shared";

// Minimal: left-aligned, lots of white space, no divider lines.
// Name in the accent colour; company and dates sit on a quieter second line.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 16) }}>
      <SectionTitle theme={theme} data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: space(theme, 6) }}>{children}</div>
    </section>
  );
}

export default function MinimalLayout({ data, theme }) {
  return (
    <div className="text-[10pt] leading-[1.45]">
      <header data-block>
        <h1 className="text-[26pt] leading-tight font-semibold tracking-tight text-(--accent)">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] text-[12pt] text-(--muted)">{data.headline}</p>}
        {/* Short decorative rule under the name */}
        <div className="mt-[6pt] h-[2pt] w-[32pt] bg-(--accent)" aria-hidden="true" />
        <ContactLine contacts={data.contacts} separator="|" className="mt-[7pt] text-[9.5pt] text-(--muted)" />
      </header>

      {data.summary && (
        <Section title="Summary" theme={theme}>
          <p className="whitespace-pre-line" data-block>
            {data.summary}
          </p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 10) }}>
            {data.experience.map((job) => (
              <div key={job.key}>
                <div data-block data-keep={job.bullets.length > 0}>
                  <p className="font-bold">{job.role || job.company}</p>
                  <p className="text-[9.5pt] text-(--muted)">
                    {job.role && job.company}
                    {job.role && job.company && job.dates && "  ·  "}
                    {job.dates}
                  </p>
                </div>
                <BulletList
                  items={job.bullets}
                  className="mt-[4pt] space-y-[2pt] pl-[13pt] marker:text-(--accent)"
                  itemClassName="pl-[2pt]"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.education.length > 0 && (
        <Section title="Education" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 6) }}>
            {data.education.map((entry) => (
              <div key={entry.key} data-block>
                <p className="font-bold">{entry.degree || entry.school}</p>
                <p className="text-[9.5pt] text-(--muted)">
                  {entry.degree && entry.school}
                  {entry.degree && entry.school && entry.year && "  ·  "}
                  {entry.year}
                </p>
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
          <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
            {data.projects.map((project) => (
              <div key={project.key}>
                <p data-block data-keep={Boolean(project.description)}>
                  <span className="font-bold">{project.name}</span>
                  {project.name && project.linkText && <span className="text-(--muted)">  —  </span>}
                  {project.linkText && (
                    <MaybeLink href={project.href} className="text-[9.5pt] text-(--muted)">
                      {project.linkText}
                    </MaybeLink>
                  )}
                </p>
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
          <BulletList items={section.items} className="space-y-[2pt] pl-[13pt] marker:text-(--accent)" itemClassName="pl-[2pt]" />
        </Section>
      ))}
    </div>
  );
}
