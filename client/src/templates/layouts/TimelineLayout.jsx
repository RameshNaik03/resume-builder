import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, SectionColumns, SectionTitle, Skills } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Timeline: experience and education are drawn on a vertical line with a dot per entry,
// dates shown as small labels above each role. Skills appear as tags.
// The graphic elements are marked as not ATS-friendly.

function Section({ title, theme, children }) {
  return (
    <section style={{ marginTop: sectionGap(14) }}>
      {/* No divider by default; one appears if the design picks a divider style */}
      <SectionTitle theme={theme} className="divider-b" data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: itemGap(7) }}>{children}</div>
    </section>
  );
}

// The vertical line with one dot per item.
// Line: 1.5pt left border. Dot: 7.5pt circle centred on the line, placed inside the
// item's first block so it moves with it to the next page (--gap = the extra space added).
function Timeline({ items, renderItem }) {
  return (
    <div className="ml-[4pt] flex flex-col border-l-[1.5pt] border-(--line) pl-[14pt]" style={{ gap: itemGap(10) }}>
      {items.map((item) => (
        <div key={item.key}>{renderItem(item)}</div>
      ))}
    </div>
  );
}

function TimelineDot() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-[calc(2.5pt+var(--gap,0px))] -left-[18.5pt] size-[7.5pt] rounded-full border-[1.5pt] border-(--accent) bg-(--bg)"
    />
  );
}

export default function TimelineLayout({ data, theme }) {
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
        <Timeline
          items={data.experience}
          renderItem={(job) => (
            <>
              <div className="relative" data-block data-keep={job.bullets.length > 0}>
                <TimelineDot />
                {job.dates && <p className="fs-8.5 font-semibold tracking-wide text-(--accent) uppercase">{job.dates}</p>}
                <p>
                  <span className="font-bold">{job.role}</span>
                  {job.role && job.company && <span className="text-(--muted)"> · </span>}
                  <span className={job.role ? "text-(--muted)" : "font-bold"}>{job.company}</span>
                </p>
              </div>
              <BulletList items={job.bullets} className="mt-[3pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)" />
            </>
          )}
        />
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <Timeline
          items={data.education}
          renderItem={(entry) => (
            <div className="relative" data-block>
              <TimelineDot />
              {entry.year && <p className="fs-8.5 font-semibold tracking-wide text-(--accent) uppercase">{entry.year}</p>}
              <p>
                <span className="font-bold">{entry.degree}</span>
                {entry.degree && entry.school && <span className="text-(--muted)"> · </span>}
                <span className={entry.degree ? "text-(--muted)" : "font-bold"}>{entry.school}</span>
              </p>
            </div>
          )}
        />
      </Section>
    ),
    skills: (title) => (
      <Section title={title} theme={theme}>
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          defaultDisplay="tags"
          tagsClassName="flex flex-wrap gap-[5pt]"
          tagClassName="rounded-full bg-(--soft) px-[7pt] py-[2pt] fs-9 text-(--accent)"
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)"
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
          <BulletList items={section.items} className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--muted)" />
        </Section>
      )),
  };

  return (
    <div className="fs-10 leading-(--lh)">
      <header className="border-b-[2pt] border-(--accent) pb-[8pt]" style={HEADER_ALIGN} data-block>
        <h1 className="font-heading hfs-25 leading-tight font-bold tracking-tight">{data.name}</h1>
        {data.headline && <p className="mt-[2pt] fs-12 font-semibold text-(--accent)">{data.headline}</p>}
        <ContactLine contacts={data.contacts} separator="|" className="mt-[6pt] fs-9 text-(--muted)" />
      </header>

      <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
    </div>
  );
}
