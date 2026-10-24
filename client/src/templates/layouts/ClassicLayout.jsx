import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionColumns, SectionTitle, Skills } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Classic: centred header, headings with a thin line underneath,
// role/company on the left and dates on the right.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: sectionGap(13) }}>
      <SectionTitle theme={theme} className="divider-b" data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: itemGap(6) }}>{children}</div>
    </section>
  );
}

export default function ClassicLayout({ data, theme }) {
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
        <div className="flex flex-col" style={{ gap: itemGap(9) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={job.bullets.length > 0}>
                <p>
                  <span className="font-bold">{job.role}</span>
                  {job.role && job.company && ", "}
                  {job.company}
                </p>
                {job.dates && <p className="shrink-0 fs-9.5 text-(--muted)">{job.dates}</p>}
              </div>
              <BulletList
                items={job.bullets}
                className="mt-[3pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--muted)"
                itemClassName="pl-[2pt]"
              />
            </div>
          ))}
        </div>
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(5) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
              <p>
                <span className="font-bold">{entry.degree}</span>
                {entry.degree && entry.school && ", "}
                {entry.school}
              </p>
              {entry.year && <p className="shrink-0 fs-9.5 text-(--muted)">{entry.year}</p>}
            </div>
          ))}
        </div>
      </Section>
    ),
    skills: (title) => (
      <Section title={title} theme={theme}>
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--muted)"
        />
      </Section>
    ),
    projects: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(7) }}>
          {data.projects.map((project) => (
            <div key={project.key}>
              <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={Boolean(project.description)}>
                <p className="font-bold">{project.name}</p>
                {project.linkText && (
                  <MaybeLink href={project.href} className="shrink-0 fs-9.5 text-(--accent)">
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
    ),
    additional: () =>
      data.additional.map((section) => (
        <Section key={section.key} title={section.heading} theme={theme}>
          <BulletList
            items={section.items}
            className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--muted)"
            itemClassName="pl-[2pt]"
          />
        </Section>
      )),
  };

  return (
    <div className="fs-10 leading-(--lh)">
      <header style={HEADER_ALIGN} data-block>
        <h1 className="font-heading hfs-24 leading-tight font-bold tracking-tight">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] fs-11 text-(--accent)">{data.headline}</p>}
        <ContactLine contacts={data.contacts} className="mt-[4pt] fs-9.5 text-(--muted)" />
      </header>

      <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
    </div>
  );
}
