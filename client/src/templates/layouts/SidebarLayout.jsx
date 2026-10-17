import { space } from "../themes";
import { BulletList, MaybeLink, SectionTitle } from "./shared";

// Sidebar: two columns. A coloured left sidebar holds name, contact details,
// skills and education; the main column holds summary, experience, projects and
// any additional sections. Two columns look great but can confuse some ATS systems
// (marked as not ATS-friendly). This layout is "full bleed", so it sets its own page margins.
// Sidebar blocks use data-flow="side" so each column gets its own page breaks.

// Heading inside the coloured sidebar
function SideSection({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 16) }}>
      <h2
        className="border-b border-(--on-accent)/30 pb-[3pt] text-[8.5pt] font-bold tracking-[0.14em] uppercase opacity-90"
        data-block
        data-keep
        data-flow="side"
      >
        {title}
      </h2>
      <div style={{ marginTop: space(theme, 6) }}>{children}</div>
    </section>
  );
}

// Heading in the main (white) column
function MainSection({ title, theme, children }) {
  return (
    // first:mt-0! = no top margin on the first section ("!" lets it override the inline style)
    <section className="first:mt-0!" style={{ marginTop: space(theme, 14) }}>
      <SectionTitle theme={theme} className="border-b border-(--line) pb-[2pt]" data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: space(theme, 6) }}>{children}</div>
    </section>
  );
}

export default function SidebarLayout({ data, theme }) {
  return (
    // min-h fills every page (--sheet-height comes from ResumeSheet) so the sidebar
    // colour reaches the bottom; 1mm less when printing so it never adds a blank page
    <div className="flex min-h-(--sheet-height) text-[9.5pt] leading-[1.4] print:min-h-[calc(var(--sheet-height)-1mm)]">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-[66mm] shrink-0 bg-(--accent) px-[8mm] py-[14mm] text-(--on-accent)">
        <div data-block data-flow="side">
          <h1 className="text-[20pt] leading-[1.15] font-bold tracking-tight wrap-break-word">{data.name}</h1>
          {data.headline && <p className="mt-[5pt] text-[10.5pt] leading-snug opacity-85">{data.headline}</p>}
        </div>

        {data.contacts.length > 0 && (
          <SideSection title="Contact" theme={theme}>
            <ul className="space-y-[4pt] text-[8.5pt] wrap-break-word" data-block data-flow="side">
              {data.contacts.map((item) => (
                <li key={item.text}>
                  <MaybeLink href={item.href}>{item.text}</MaybeLink>
                </li>
              ))}
            </ul>
          </SideSection>
        )}

        {data.skills.length > 0 && (
          <SideSection title="Skills" theme={theme}>
            <ul className="flex flex-wrap gap-[4pt] text-[8.5pt]" data-block data-flow="side">
              {data.skills.map((skill) => (
                <li key={skill} className="rounded-[3pt] bg-(--on-accent)/15 px-[5pt] py-[1.5pt]">
                  {skill}
                </li>
              ))}
            </ul>
          </SideSection>
        )}

        {data.education.length > 0 && (
          <SideSection title="Education" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 7) }}>
              {data.education.map((entry) => (
                <div key={entry.key} className="text-[8.5pt]" data-block data-flow="side">
                  {entry.degree && <p className="text-[9pt] font-bold">{entry.degree}</p>}
                  {entry.school && <p className="opacity-90">{entry.school}</p>}
                  {entry.year && <p className="opacity-75">{entry.year}</p>}
                </div>
              ))}
            </div>
          </SideSection>
        )}
      </aside>

      {/* ---------- Main column ---------- */}
      <main className="min-w-0 flex-1 px-[10mm] py-[14mm]">
        {data.summary && (
          <MainSection title="Profile" theme={theme}>
            <p className="whitespace-pre-line" data-block>
              {data.summary}
            </p>
          </MainSection>
        )}

        {data.experience.length > 0 && (
          <MainSection title="Experience" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 10) }}>
              {data.experience.map((job) => (
                <div key={job.key}>
                  <div data-block data-keep={job.bullets.length > 0}>
                    <p className="text-[10.5pt] font-bold">{job.role || job.company}</p>
                    <p className="text-[9pt] text-(--muted)">
                      {job.role && job.company && <span className="font-semibold text-(--accent)">{job.company}</span>}
                      {job.role && job.company && job.dates && "  ·  "}
                      {job.dates}
                    </p>
                  </div>
                  <BulletList items={job.bullets} className="mt-[3pt] space-y-[2pt] pl-[12pt] marker:text-(--accent)" />
                </div>
              ))}
            </div>
          </MainSection>
        )}

        {data.projects.length > 0 && (
          <MainSection title="Projects" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
              {data.projects.map((project) => (
                <div key={project.key}>
                  <div data-block data-keep={Boolean(project.description)}>
                    <p className="font-bold">{project.name}</p>
                    {project.linkText && (
                      <MaybeLink href={project.href} className="text-[8.5pt] text-(--accent)">
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
          </MainSection>
        )}

        {data.additional.map((section) => (
          <MainSection key={section.key} title={section.heading} theme={theme}>
            <BulletList items={section.items} className="space-y-[2pt] pl-[12pt] marker:text-(--accent)" />
          </MainSection>
        ))}
      </main>
    </div>
  );
}
