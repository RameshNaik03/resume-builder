import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, RichText, SectionColumns, SectionTitle, Skills, WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Modern Header: a bold coloured band across the top with name, title and contacts,
// then a single column of sections (still easy for ATS systems to read).
// This layout is "full bleed", so it sets its own page margins.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: sectionGap(13) }}>
      {/* Plain wrapper is the page-break block, so the accent bar never stretches */}
      <div className="divider-b" data-block data-keep>
        <SectionTitle theme={theme} className="border-l-[3pt] border-(--accent) pl-[6pt] leading-none">
          {title}
        </SectionTitle>
      </div>
      <div style={{ marginTop: itemGap(7) }}>{children}</div>
    </section>
  );
}

export default function ModernHeaderLayout({ data, theme }) {
  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    summary: (title) => (
      <Section title={title} theme={theme}>
        <RichText html={data.summary} data-block />
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
                  {job.role && job.company && <span className="text-(--muted)"> at </span>}
                  <span className="font-semibold text-(--accent)">{job.company}</span>
                </p>
                {job.dates && <p className="shrink-0 fs-9 text-(--muted)">{job.dates}</p>}
              </div>
              <BulletList
                items={job.bullets} rich
                className="mt-[3pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
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
          separator="  ·  "
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
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
                  <MaybeLink href={project.href} className="shrink-0 fs-9 text-(--accent)">
                    {project.linkText}
                  </MaybeLink>
                )}
              </div>
              {project.description && (
                <RichText html={project.description} className="mt-[2pt]" data-block />
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
            className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[14pt] marker:text-(--accent)"
            itemClassName="pl-[2pt]"
          />
        </Section>
      )),
  };

  return (
    <div className="fs-10 leading-(--lh)">
      {/* Page margins come from the design (--m-top etc.) */}
      <header className="bg-(--accent) pt-(--m-top) pr-(--m-right) pb-[9mm] pl-(--m-left) text-(--on-accent)" style={HEADER_ALIGN}>
        {/* On the coloured band the photo's border defaults to the band's text colour */}
        <WithPhoto photo={data.photo} align={data.headerAlign} defaultBorderColor="var(--on-accent)">
          <h1 className="font-heading hfs-26 leading-tight font-bold tracking-tight">{data.name}</h1>
          {data.headline && <p className="mt-[3pt] fs-12.5 opacity-90">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[9pt] fs-9 opacity-90" />
        </WithPhoto>
      </header>

      <div className="pt-[6mm] pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
      </div>
    </div>
  );
}
