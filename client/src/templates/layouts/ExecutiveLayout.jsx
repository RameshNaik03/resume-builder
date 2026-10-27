import { Fragment } from "react";
import { FONTS, itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionColumns, Skills, WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Executive: elegant and understated. Centred serif name, a fine double rule,
// centred serif headings between thin lines, and generous spacing.
// Single column, so it stays ATS-friendly.

// Headings are serif in this layout (unless the design picks a heading font)
const SERIF = { fontFamily: `var(--font-heading, ${FONTS.SERIF})` };

function Section({ title, children }) {
  return (
    <section style={{ marginTop: sectionGap(16) }}>
      {/* Centred heading with a thin line on each side */}
      <div className="flex items-center gap-[10pt]" data-block data-keep>
        <span className="divider-rule flex-1" aria-hidden="true" />
        <h2 className="hfs-11 tracking-[0.2em] text-(--heading) uppercase" style={SERIF}>
          {title}
        </h2>
        <span className="divider-rule flex-1" aria-hidden="true" />
      </div>
      <div style={{ marginTop: itemGap(9) }}>{children}</div>
    </section>
  );
}

export default function ExecutiveLayout({ data }) {
  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    summary: (title) => (
      <Section title={title}>
        <p className="text-center whitespace-pre-line italic" style={SERIF} data-block>
          {data.summary}
        </p>
      </Section>
    ),
    experience: (title) => (
      <Section title={title}>
        <div className="flex flex-col" style={{ gap: itemGap(11) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div data-block data-keep={job.bullets.length > 0}>
                <div className="flex items-baseline justify-between gap-[12pt]">
                  <p className="fs-11 font-bold" style={SERIF}>
                    {job.role || job.company}
                  </p>
                  {job.dates && <p className="shrink-0 fs-9 text-(--muted) italic">{job.dates}</p>}
                </div>
                {job.role && job.company && <p className="text-(--accent) italic">{job.company}</p>}
              </div>
              <BulletList
                items={job.bullets}
                className="mt-[4pt] space-y-[calc(2.5pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
                itemClassName="pl-[2pt]"
              />
            </div>
          ))}
        </div>
      </Section>
    ),
    education: (title) => (
      <Section title={title}>
        <div className="flex flex-col" style={{ gap: itemGap(6) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
              <p>
                <span className="font-bold" style={SERIF}>
                  {entry.degree}
                </span>
                {entry.degree && entry.school && ", "}
                <span className="italic">{entry.school}</span>
              </p>
              {entry.year && <p className="shrink-0 fs-9 text-(--muted) italic">{entry.year}</p>}
            </div>
          ))}
        </div>
      </Section>
    ),
    skills: (title) => (
      <Section title={title}>
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          separator="   ·   "
          listClassName="text-center"
          tagsClassName="flex flex-wrap justify-center gap-[4pt]"
          bulletClassName="space-y-[calc(2.5pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
        />
      </Section>
    ),
    projects: (title) => (
      <Section title={title}>
        <div className="flex flex-col" style={{ gap: itemGap(8) }}>
          {data.projects.map((project) => (
            <div key={project.key}>
              <div className="flex items-baseline justify-between gap-[12pt]" data-block data-keep={Boolean(project.description)}>
                <p className="font-bold" style={SERIF}>
                  {project.name}
                </p>
                {project.linkText && (
                  <MaybeLink href={project.href} className="shrink-0 fs-9 text-(--accent) italic">
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
        <Section key={section.key} title={section.heading}>
          <BulletList
            items={section.items}
            className="space-y-[calc(2.5pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
            itemClassName="pl-[2pt]"
          />
        </Section>
      )),
  };

  return (
    <div className="fs-10 leading-(--lh)">
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="hfs-28 leading-tight tracking-[0.04em]" style={SERIF}>
            {data.name}
          </h1>
          {data.headline && <p className="mt-[4pt] fs-9.5 tracking-[0.28em] text-(--accent) uppercase">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt] fs-9 text-(--muted)" />
        </WithPhoto>
        {/* Fine double rule (full width, below the photo too) */}
        <div className="mt-[10pt] h-[3pt] border-y border-(--accent)" aria-hidden="true" />
      </header>

      <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
    </div>
  );
}
