import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionColumns, SectionTitle, Skills } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Minimal: left-aligned, lots of white space, no divider lines.
// Name in the accent colour; company and dates sit on a quieter second line.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: sectionGap(16) }}>
      {/* No divider by default; one appears if the design picks a divider style */}
      <SectionTitle theme={theme} className="divider-b" data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: itemGap(6) }}>{children}</div>
    </section>
  );
}

export default function MinimalLayout({ data, theme }) {
  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    summary: (title) => (
      <Section title={title} theme={theme}>
        <p className="whitespace-pre-line" data-block>
          {data.summary}
        </p>
      </Section>
    ),
    experience: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(10) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div data-block data-keep={job.bullets.length > 0}>
                <p className="font-bold">{job.role || job.company}</p>
                <p className="fs-9.5 text-(--muted)">
                  {job.role && job.company}
                  {job.role && job.company && job.dates && "  ·  "}
                  {job.dates}
                </p>
              </div>
              <BulletList
                items={job.bullets}
                className="mt-[4pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)"
                itemClassName="pl-[2pt]"
              />
            </div>
          ))}
        </div>
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(6) }}>
          {data.education.map((entry) => (
            <div key={entry.key} data-block>
              <p className="font-bold">{entry.degree || entry.school}</p>
              <p className="fs-9.5 text-(--muted)">
                {entry.degree && entry.school}
                {entry.degree && entry.school && entry.year && "  ·  "}
                {entry.year}
              </p>
            </div>
          ))}
        </div>
      </Section>
    ),
    skills: (title) => (
      <Section title={title} theme={theme}>
        <Skills skills={data.skills} display={data.skillsDisplay} separator="  ·  " />
      </Section>
    ),
    projects: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(8) }}>
          {data.projects.map((project) => (
            <div key={project.key}>
              <p data-block data-keep={Boolean(project.description)}>
                <span className="font-bold">{project.name}</span>
                {project.name && project.linkText && <span className="text-(--muted)">  —  </span>}
                {project.linkText && (
                  <MaybeLink href={project.href} className="fs-9.5 text-(--muted)">
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
    ),
    additional: () =>
      data.additional.map((section) => (
        <Section key={section.key} title={section.heading} theme={theme}>
          <BulletList
            items={section.items}
            className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)"
            itemClassName="pl-[2pt]"
          />
        </Section>
      )),
  };

  return (
    <div className="fs-10 leading-(--lh)">
      <header style={HEADER_ALIGN} data-block>
        <h1 className="font-heading hfs-26 leading-tight font-semibold tracking-tight text-(--accent)">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] fs-12 text-(--muted)">{data.headline}</p>}
        {/* Short decorative rule under the name (follows the header alignment) */}
        <div className="mt-[6pt] mr-(--header-mr) ml-(--header-ml) h-[2pt] w-[32pt] bg-(--accent)" aria-hidden="true" />
        <ContactLine contacts={data.contacts} separator="|" className="mt-[7pt] fs-9.5 text-(--muted)" />
      </header>

      <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
    </div>
  );
}
