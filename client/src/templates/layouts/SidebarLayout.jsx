import { space } from "../themes";
import { MaybeLink, SectionTitle } from "./shared";

// Sidebar: two columns. A coloured left sidebar holds name, contact details,
// skills and education; the main column holds summary, experience and projects.
// Two columns look great but can confuse some ATS systems (marked as not ATS-friendly).
// This layout is "full bleed", so it sets its own page margins.

// Heading inside the coloured sidebar
function SideSection({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 16) }}>
      <h2 className="border-b border-(--on-accent)/30 pb-[3pt] text-[8.5pt] font-bold tracking-[0.14em] uppercase opacity-90">
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
      <SectionTitle theme={theme} className="border-b border-(--line) pb-[2pt]">
        {title}
      </SectionTitle>
      <div style={{ marginTop: space(theme, 6) }}>{children}</div>
    </section>
  );
}

export default function SidebarLayout({ data, theme }) {
  return (
    // min-h fills the whole page so the sidebar colour reaches the bottom.
    // 296mm when printing leaves room for rounding, so it never spills onto a blank 2nd page.
    <div className="flex min-h-[297mm] text-[9.5pt] leading-[1.4] print:min-h-[296mm]">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-[66mm] shrink-0 box-decoration-clone bg-(--accent) px-[8mm] py-[14mm] text-(--on-accent)">
        <h1 className="text-[20pt] leading-[1.15] font-bold tracking-tight wrap-break-word">{data.name}</h1>
        {data.headline && <p className="mt-[5pt] text-[10.5pt] leading-snug opacity-85">{data.headline}</p>}

        {data.contacts.length > 0 && (
          <SideSection title="Contact" theme={theme}>
            <ul className="space-y-[4pt] text-[8.5pt] wrap-break-word">
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
            <ul className="flex flex-wrap gap-[4pt] text-[8.5pt]">
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
                <div key={entry.key} className="break-inside-avoid text-[8.5pt]">
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
      <main className="min-w-0 flex-1 box-decoration-clone px-[10mm] py-[14mm]">
        {data.summary && (
          <MainSection title="Profile" theme={theme}>
            <p className="whitespace-pre-line">{data.summary}</p>
          </MainSection>
        )}

        {data.experience.length > 0 && (
          <MainSection title="Experience" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 10) }}>
              {data.experience.map((job) => (
                <div key={job.key} className="break-inside-avoid">
                  <p className="text-[10.5pt] font-bold">{job.role || job.company}</p>
                  <p className="text-[9pt] text-(--muted)">
                    {job.role && job.company && <span className="font-semibold text-(--accent)">{job.company}</span>}
                    {job.role && job.company && job.dates && "  ·  "}
                    {job.dates}
                  </p>
                  {job.bullets.length > 0 && (
                    <ul className="mt-[3pt] list-disc space-y-[2pt] pl-[12pt] marker:text-(--accent)">
                      {job.bullets.map((bullet, i) => (
                        <li key={i}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </MainSection>
        )}

        {data.projects.length > 0 && (
          <MainSection title="Projects" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
              {data.projects.map((project) => (
                <div key={project.key} className="break-inside-avoid">
                  <p className="font-bold">{project.name}</p>
                  {project.linkText && (
                    <MaybeLink href={project.href} className="text-[8.5pt] text-(--accent)">
                      {project.linkText}
                    </MaybeLink>
                  )}
                  {project.description && <p className="mt-[2pt] whitespace-pre-line">{project.description}</p>}
                </div>
              ))}
            </div>
          </MainSection>
        )}
      </main>
    </div>
  );
}
