import { space } from "../themes";
import { ContactLine, MaybeLink, SectionTitle } from "./shared";

// Timeline: experience and education are drawn on a vertical line with a dot per entry,
// dates shown as small labels above each role. Skills appear as tags.
// The graphic elements are marked as not ATS-friendly.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: space(theme, 14) }}>
      <SectionTitle theme={theme}>{title}</SectionTitle>
      <div style={{ marginTop: space(theme, 7) }}>{children}</div>
    </section>
  );
}

// The vertical line with one dot per item.
// Line: 1.5pt left border. Dot: 7.5pt circle centred on the line.
function Timeline({ items, theme, renderItem }) {
  return (
    <div className="ml-[4pt] flex flex-col border-l-[1.5pt] border-(--line) pl-[14pt]" style={{ gap: space(theme, 10) }}>
      {items.map((item) => (
        <div key={item.key} className="relative break-inside-avoid">
          <span
            aria-hidden="true"
            className="absolute top-[2.5pt] -left-[18.5pt] size-[7.5pt] rounded-full border-[1.5pt] border-(--accent) bg-white"
          />
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export default function TimelineLayout({ data, theme }) {
  return (
    <div className="text-[10pt] leading-[1.4]">
      <header className="border-b-[2pt] border-(--accent) pb-[8pt]">
        <h1 className="text-[25pt] leading-tight font-bold tracking-tight">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] text-[12pt] font-semibold text-(--accent)">{data.headline}</p>}
        <ContactLine contacts={data.contacts} separator="|" className="mt-[6pt] text-[9pt] text-(--muted)" />
      </header>

      {data.summary && (
        <Section title="Summary" theme={theme}>
          <p className="whitespace-pre-line">{data.summary}</p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience" theme={theme}>
          <Timeline
            items={data.experience}
            theme={theme}
            renderItem={(job) => (
              <>
                {job.dates && (
                  <p className="text-[8.5pt] font-semibold tracking-wide text-(--accent) uppercase">{job.dates}</p>
                )}
                <p>
                  <span className="font-bold">{job.role}</span>
                  {job.role && job.company && <span className="text-(--muted)"> · </span>}
                  <span className={job.role ? "text-(--muted)" : "font-bold"}>{job.company}</span>
                </p>
                {job.bullets.length > 0 && (
                  <ul className="mt-[3pt] list-disc space-y-[2pt] pl-[12pt] marker:text-(--muted)">
                    {job.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          />
        </Section>
      )}

      {data.education.length > 0 && (
        <Section title="Education" theme={theme}>
          <Timeline
            items={data.education}
            theme={theme}
            renderItem={(entry) => (
              <>
                {entry.year && (
                  <p className="text-[8.5pt] font-semibold tracking-wide text-(--accent) uppercase">{entry.year}</p>
                )}
                <p>
                  <span className="font-bold">{entry.degree}</span>
                  {entry.degree && entry.school && <span className="text-(--muted)"> · </span>}
                  <span className={entry.degree ? "text-(--muted)" : "font-bold"}>{entry.school}</span>
                </p>
              </>
            )}
          />
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills" theme={theme}>
          <ul className="flex flex-wrap gap-[5pt]">
            {data.skills.map((skill) => (
              <li key={skill} className="rounded-full bg-(--soft) px-[7pt] py-[2pt] text-[9pt] text-(--accent)">
                {skill}
              </li>
            ))}
          </ul>
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
  );
}
