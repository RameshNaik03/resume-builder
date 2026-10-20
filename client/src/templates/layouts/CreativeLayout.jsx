import { space } from "../themes";
import { BulletList, ContactLine, MaybeLink } from "./shared";

// Creative: bold and colourful. Gradient shapes in the top corner, a big name,
// bold section headings with a gradient marker, skills as tags and dates as pills.
// The shapes are pure CSS (no images). Marked as not ATS-friendly.
// This layout is "full bleed", so it sets its own page margins.

const GRADIENT = { backgroundImage: "var(--gradient)" };

function Section({ title, theme, children }) {
  const isCaps = theme.headingStyle === "caps";
  return (
    <section style={{ marginTop: space(theme, 15) }}>
      <h2
        className={`flex items-center gap-[7pt] font-extrabold text-(--deep) ${
          isCaps ? "text-[11.5pt] tracking-[0.1em] uppercase" : "text-[14pt]"
        }`}
        data-block
        data-keep
      >
        {/* Small rotated gradient square as a marker */}
        <span className="size-[8pt] shrink-0 rotate-45 rounded-[2pt]" style={GRADIENT} aria-hidden="true" />
        {title}
      </h2>
      <div style={{ marginTop: space(theme, 7) }}>{children}</div>
    </section>
  );
}

export default function CreativeLayout({ data, theme }) {
  return (
    <div className="relative overflow-hidden text-[10pt] leading-[1.4]">
      {/* ---------- Decorative shapes (top right corner of page 1) ---------- */}
      <div aria-hidden="true">
        <div className="absolute -top-[42mm] -right-[34mm] size-[100mm] rounded-full" style={GRADIENT} />
        <div className="absolute top-[40mm] right-[58mm] size-[12mm] rounded-full bg-(--soft)" />
        <div className="absolute top-[8mm] right-[78mm] size-[5mm] rounded-full opacity-70" style={GRADIENT} />
      </div>

      {/* relative keeps the content above the shapes */}
      <div className="relative px-[16mm] py-[15mm]">
        <header className="max-w-[118mm]" data-block>
          <h1 className="text-[32pt] leading-[1.05] font-extrabold tracking-tight text-(--deep)">{data.name}</h1>
          {data.headline && <p className="mt-[5pt] text-[13pt] font-semibold text-(--accent)">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="/" className="mt-[8pt] text-[9pt] text-(--muted)" />
        </header>

        {data.summary && (
          <Section title="About Me" theme={theme}>
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
                  <div className="flex items-center justify-between gap-[12pt]" data-block data-keep={job.bullets.length > 0}>
                    <p>
                      <span className="text-[10.5pt] font-bold">{job.role}</span>
                      {job.role && job.company && <span className="text-(--muted)"> @ </span>}
                      <span className="font-semibold text-(--accent)">{job.company}</span>
                    </p>
                    {job.dates && (
                      <p className="shrink-0 rounded-full bg-(--soft) px-[7pt] py-[1.5pt] text-[8.5pt] font-semibold text-(--accent)">
                        {job.dates}
                      </p>
                    )}
                  </div>
                  <BulletList items={job.bullets} className="mt-[4pt] space-y-[2pt] pl-[13pt] marker:text-(--accent)" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.projects.length > 0 && (
          <Section title="Projects" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 8) }}>
              {data.projects.map((project) => (
                <div key={project.key}>
                  <p data-block data-keep={Boolean(project.description)}>
                    <span className="font-bold">{project.name}</span>
                    {project.name && project.linkText && <span className="text-(--muted)"> — </span>}
                    {project.linkText && (
                      <MaybeLink href={project.href} className="text-[9pt] text-(--accent)">
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

        {data.skills.length > 0 && (
          <Section title="Skills" theme={theme}>
            <ul className="flex flex-wrap gap-[5pt]" data-block>
              {data.skills.map((skill) => (
                <li key={skill} className="rounded-full bg-(--soft) px-[8pt] py-[2.5pt] text-[9pt] font-semibold text-(--deep)">
                  {skill}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {data.education.length > 0 && (
          <Section title="Education" theme={theme}>
            <div className="flex flex-col" style={{ gap: space(theme, 6) }}>
              {data.education.map((entry) => (
                <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
                  <p>
                    <span className="font-bold">{entry.degree}</span>
                    {entry.degree && entry.school && <span className="text-(--muted)"> · </span>}
                    {entry.school}
                  </p>
                  {entry.year && <p className="shrink-0 text-[9pt] text-(--muted)">{entry.year}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.additional.map((section) => (
          <Section key={section.key} title={section.heading} theme={theme}>
            <BulletList items={section.items} className="space-y-[2pt] pl-[13pt] marker:text-(--accent)" />
          </Section>
        ))}
      </div>
    </div>
  );
}
