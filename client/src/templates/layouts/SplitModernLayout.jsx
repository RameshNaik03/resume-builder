import { space } from "../themes";
import { MaybeLink } from "./shared";

// Split Modern: a gradient strip across the top, name on the left with contacts
// stacked on the right, a highlighted summary box, then an asymmetric split:
// a wide main column (experience, projects) and a narrow side column (skills, education).
// Two columns, so it's marked as not ATS-friendly.
// This layout is "full bleed", so it sets its own page margins.

const GRADIENT = { backgroundImage: "var(--gradient)" };

function Heading({ theme, children }) {
  const isCaps = theme.headingStyle === "caps";
  return (
    <div className="break-after-avoid">
      <h2 className={`font-bold text-(--deep) ${isCaps ? "text-[10pt] tracking-[0.12em] uppercase" : "text-[12.5pt]"}`}>
        {children}
      </h2>
      <div className="mt-[3pt] h-[2pt] w-[22pt] rounded-full" style={GRADIENT} aria-hidden="true" />
    </div>
  );
}

function Section({ title, theme, children }) {
  return (
    <section className="first:mt-0!" style={{ marginTop: space(theme, 14) }}>
      <Heading theme={theme}>{title}</Heading>
      <div style={{ marginTop: space(theme, 7) }}>{children}</div>
    </section>
  );
}

export default function SplitModernLayout({ data, theme }) {
  const hasMain = data.experience.length > 0 || data.projects.length > 0;
  const hasSide = data.skills.length > 0 || data.education.length > 0;

  return (
    <div className="text-[9.75pt] leading-[1.4]">
      <div className="h-[5mm]" style={GRADIENT} aria-hidden="true" />

      <div className="box-decoration-clone px-[14mm] pt-[10mm] pb-[14mm]">
        {/* Header: name left, contacts stacked on the right */}
        <header className="flex items-end justify-between gap-[10mm]">
          <div className="min-w-0">
            <h1 className="text-[28pt] leading-[1.05] font-extrabold tracking-tight text-(--deep)">{data.name}</h1>
            {data.headline && <p className="mt-[4pt] text-[12pt] font-semibold text-(--accent)">{data.headline}</p>}
          </div>
          {data.contacts.length > 0 && (
            <ul className="shrink-0 space-y-[1.5pt] text-right text-[8.5pt] text-(--muted)">
              {data.contacts.map((item) => (
                <li key={item.text}>
                  <MaybeLink href={item.href}>{item.text}</MaybeLink>
                </li>
              ))}
            </ul>
          )}
        </header>

        {/* Highlighted summary */}
        {data.summary && (
          <div className="mt-[12pt] rounded-[6pt] border-l-[3pt] border-(--accent) bg-(--soft) px-[11pt] py-[8pt]">
            <p className="text-[8pt] font-bold tracking-[0.14em] text-(--accent) uppercase">Summary</p>
            <p className="mt-[3pt] text-[10pt] whitespace-pre-line">{data.summary}</p>
          </div>
        )}

        {/* Asymmetric two columns (falls back to one column if a side is empty) */}
        {(hasMain || hasSide) && (
          <div
            className={`mt-[14pt] grid gap-[8mm] ${hasMain && hasSide ? "grid-cols-[1fr_56mm]" : "grid-cols-1"}`}
          >
            {hasMain && (
              <div className="min-w-0">
                {data.experience.length > 0 && (
                  <Section title="Experience" theme={theme}>
                    <div className="flex flex-col" style={{ gap: space(theme, 10) }}>
                      {data.experience.map((job) => (
                        <div key={job.key} className="break-inside-avoid">
                          <p className="text-[10.5pt] font-bold">{job.role || job.company}</p>
                          <div className="flex items-baseline justify-between gap-[8pt] text-[9pt]">
                            <p className="font-semibold text-(--accent)">{job.role && job.company}</p>
                            {job.dates && <p className="shrink-0 text-(--muted)">{job.dates}</p>}
                          </div>
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
                  </Section>
                )}

                {data.projects.length > 0 && (
                  <Section title="Projects" theme={theme}>
                    <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
                      {data.projects.map((project) => (
                        <div key={project.key} className="break-inside-avoid">
                          <p className="font-bold">{project.name}</p>
                          {project.linkText && (
                            <MaybeLink href={project.href} className="text-[8.5pt] text-(--accent)">
                              {project.linkText}
                            </MaybeLink>
                          )}
                          {project.description && (
                            <p className="mt-[2pt] whitespace-pre-line">{project.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {hasSide && (
              <div className={`min-w-0 ${hasMain ? "border-l border-(--line) pl-[6mm]" : ""}`}>
                {data.skills.length > 0 && (
                  <Section title="Skills" theme={theme}>
                    <ul className="flex flex-wrap gap-[4pt]">
                      {data.skills.map((skill) => (
                        <li
                          key={skill}
                          className="rounded-[4pt] border border-(--line) px-[6pt] py-[1.5pt] text-[8.5pt] font-medium"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {data.education.length > 0 && (
                  <Section title="Education" theme={theme}>
                    <div className="flex flex-col" style={{ gap: space(theme, 7) }}>
                      {data.education.map((entry) => (
                        <div key={entry.key} className="break-inside-avoid text-[9pt]">
                          {entry.degree && <p className="font-bold">{entry.degree}</p>}
                          {entry.school && <p>{entry.school}</p>}
                          {entry.year && <p className="text-(--muted)">{entry.year}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
