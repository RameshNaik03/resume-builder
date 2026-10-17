import { FONTS, space } from "../themes";
import { BulletList, ContactLine, MaybeLink } from "./shared";

// Executive: elegant and understated. Centred serif name, a fine double rule,
// centred serif headings between thin lines, and generous spacing.
// Single column, so it stays ATS-friendly.

const SERIF = { fontFamily: FONTS.SERIF }; // Headings are always serif in this layout

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 16) }}>
      {/* Centred heading with a thin line on each side */}
      <div className="flex items-center gap-[10pt]" data-block data-keep>
        <span className="h-px flex-1 bg-(--line)" aria-hidden="true" />
        <h2 className="text-[11pt] tracking-[0.2em] text-(--accent) uppercase" style={SERIF}>
          {title}
        </h2>
        <span className="h-px flex-1 bg-(--line)" aria-hidden="true" />
      </div>
      <div style={{ marginTop: space(theme, 9) }}>{children}</div>
    </section>
  );
}

export default function ExecutiveLayout({ data, theme }) {
  return (
    <div className="text-[10pt] leading-[1.45]">
      <header className="text-center" data-block>
        <h1 className="text-[28pt] leading-tight tracking-[0.04em]" style={SERIF}>
          {data.name}
        </h1>
        {data.headline && (
          <p className="mt-[4pt] text-[9.5pt] tracking-[0.28em] text-(--accent) uppercase">{data.headline}</p>
        )}
        <ContactLine contacts={data.contacts} className="mt-[8pt] text-[9pt] text-(--muted)" />
        {/* Fine double rule */}
        <div className="mt-[10pt] h-[3pt] border-y border-(--accent)" aria-hidden="true" />
      </header>

      {data.summary && (
        <Section title="Profile" theme={theme}>
          <p className="text-center whitespace-pre-line italic" style={SERIF} data-block>
            {data.summary}
          </p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 11) }}>
            {data.experience.map((job) => (
              <div key={job.key}>
                <div data-block data-keep={job.bullets.length > 0}>
                  <div className="flex items-baseline justify-between gap-[12pt]">
                    <p className="text-[11pt] font-bold" style={SERIF}>
                      {job.role || job.company}
                    </p>
                    {job.dates && <p className="shrink-0 text-[9pt] text-(--muted) italic">{job.dates}</p>}
                  </div>
                  {job.role && job.company && <p className="text-(--accent) italic">{job.company}</p>}
                </div>
                <BulletList
                  items={job.bullets}
                  className="mt-[4pt] space-y-[2.5pt] pl-[14pt] marker:text-(--accent)"
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
              <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
                <p>
                  <span className="font-bold" style={SERIF}>
                    {entry.degree}
                  </span>
                  {entry.degree && entry.school && ", "}
                  <span className="italic">{entry.school}</span>
                </p>
                {entry.year && <p className="shrink-0 text-[9pt] text-(--muted) italic">{entry.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Expertise" theme={theme}>
          <p className="text-center" data-block>
            {data.skills.join("   ·   ")}
          </p>
        </Section>
      )}

      {data.projects.length > 0 && (
        <Section title="Selected Projects" theme={theme}>
          <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
            {data.projects.map((project) => (
              <div key={project.key}>
                <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={Boolean(project.description)}>
                  <p className="font-bold" style={SERIF}>
                    {project.name}
                  </p>
                  {project.linkText && (
                    <MaybeLink href={project.href} className="shrink-0 text-[9pt] text-(--accent) italic">
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
          <BulletList items={section.items} className="space-y-[2.5pt] pl-[14pt] marker:text-(--accent)" itemClassName="pl-[2pt]" />
        </Section>
      ))}
    </div>
  );
}
