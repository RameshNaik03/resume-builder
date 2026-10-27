import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, RichText, SectionColumns, SectionTitle, Skills, WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Compact: smaller text and tighter spacing to fit more on one page.
// Accent rule under the header; headings followed by a thin line to the edge.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: sectionGap(10) }}>
      <div className="flex items-center gap-[6pt]" data-block data-keep>
        <SectionTitle theme={theme} size="sm" className="shrink-0">
          {title}
        </SectionTitle>
        <span className="divider-rule flex-1" aria-hidden="true" />
      </div>
      <div style={{ marginTop: itemGap(4) }}>{children}</div>
    </section>
  );
}

export default function CompactLayout({ data, theme }) {
  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    summary: (title) => (
      <Section title={title} theme={theme}>
        <RichText html={data.summary} data-block />
      </Section>
    ),
    experience: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(6) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div className="flex items-baseline justify-between gap-[10pt]" data-block data-keep={job.bullets.length > 0}>
                <p>
                  <span className="font-bold">{job.role}</span>
                  {job.role && job.company && <span className="text-(--muted)"> | </span>}
                  {job.company}
                </p>
                {job.dates && <p className="shrink-0 fs-9 text-(--muted)">{job.dates}</p>}
              </div>
              <BulletList items={job.bullets} rich className="mt-[2pt] space-y-[calc(1pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)" />
            </div>
          ))}
        </div>
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(3) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="flex items-baseline justify-between gap-[10pt]" data-block>
              <p>
                <span className="font-bold">{entry.degree}</span>
                {entry.degree && entry.school && <span className="text-(--muted)"> | </span>}
                {entry.school}
              </p>
              {entry.year && <p className="shrink-0 fs-9 text-(--muted)">{entry.year}</p>}
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
          bulletClassName="space-y-[calc(1pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)"
        />
      </Section>
    ),
    projects: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(5) }}>
          {data.projects.map((project) => (
            <div key={project.key}>
              <div className="flex items-baseline justify-between gap-[10pt]" data-block data-keep={Boolean(project.description)}>
                <p className="font-bold">{project.name}</p>
                {project.linkText && (
                  <MaybeLink href={project.href} className="shrink-0 fs-9 text-(--accent)">
                    {project.linkText}
                  </MaybeLink>
                )}
              </div>
              {project.description && (
                <RichText html={project.description} data-block />
              )}
            </div>
          ))}
        </div>
      </Section>
    ),
    additional: () =>
      data.additional.map((section) => (
        <Section key={section.key} title={section.heading} theme={theme}>
          <BulletList items={section.items} className="space-y-[calc(1pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)" />
        </Section>
      )),
  };

  return (
    <div className="fs-9.5 leading-(--lh)">
      <header className="border-b-[1.5pt] border-(--accent) pb-[6pt]" style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="font-heading hfs-20 leading-tight font-bold tracking-tight">
            {data.name}
            {data.headline && <span className="ml-[8pt] font-(family-name:--font-body) fs-11 font-normal text-(--accent)">{data.headline}</span>}
          </h1>
          <ContactLine contacts={data.contacts} separator="|" className="mt-[3pt] fs-9 text-(--muted)" />
        </WithPhoto>
      </header>

      <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
    </div>
  );
}
