import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, MaybeLink, RichText, Skills, WithPhoto } from "./shared";
import { splitSections } from "./sectionLayout";

// Split Modern: a gradient strip across the top, name on the left with contacts
// stacked on the right, a highlighted summary box, then an asymmetric split:
// a wide main column (experience, projects) and a narrow side column
// (skills, education, additional sections by default; the design can change this).
// Two columns, so not ATS-friendly.
// This layout is "full bleed", so it sets its own page margins.
// Page-break flows: header/summary span both columns ("all"), then "main" and "side".

const GRADIENT = { backgroundImage: "var(--gradient)" };

// Header layout for each alignment: name and contacts side by side, or stacked when centred
const HEADER_STYLES = {
  left: { header: "flex items-end justify-between gap-[10mm]", name: "", contacts: "text-right" },
  center: { header: "flex flex-col items-center gap-[6pt] text-center", name: "", contacts: "text-center" },
  right: { header: "flex flex-row-reverse items-end justify-between gap-[10mm]", name: "text-right", contacts: "text-left" },
};

function Heading({ theme, children }) {
  const isCaps = theme.headingStyle === "caps";
  return (
    <div data-block data-keep>
      <h2 className={`font-heading font-bold text-(--heading) ${isCaps ? "hfs-10 uppercase" : "hfs-12.5"}`}>
        {children}
      </h2>
      <div className="mt-[3pt] h-[2pt] w-[22pt] rounded-full" style={GRADIENT} aria-hidden="true" />
    </div>
  );
}

function Section({ title, theme, children }) {
  return (
    <section className="first:mt-0!" style={{ marginTop: sectionGap(14) }}>
      <Heading theme={theme}>{title}</Heading>
      <div style={{ marginTop: itemGap(7) }}>{children}</div>
    </section>
  );
}

export default function SplitModernLayout({ data, theme }) {
  // The highlighted summary box (its label is the section heading)
  const summaryBox = (title) => (
    <div className="rounded-[6pt] border-l-[3pt] border-(--accent) bg-(--soft) px-[11pt] py-[8pt]">
      <p className="font-heading hfs-8 font-bold text-(--accent) uppercase">{title}</p>
      <RichText html={data.summary} className="mt-[3pt] fs-10" />
    </div>
  );

  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    // Inside a column the box sits where a section would (the plain wrapper is the page-break block)
    summary: (title) => (
      <section className="first:mt-0!" style={{ marginTop: sectionGap(14) }}>
        <div data-block>{summaryBox(title)}</div>
      </section>
    ),
    experience: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(10) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div data-block data-keep={job.bullets.length > 0}>
                <p className="fs-10.5 font-bold">{job.role || job.company}</p>
                <div className="flex items-baseline justify-between gap-[8pt] fs-9">
                  <p className="font-semibold text-(--accent)">{job.role && job.company}</p>
                  {job.dates && <p className="shrink-0 text-(--muted)">{job.dates}</p>}
                </div>
              </div>
              <BulletList items={job.bullets} rich className="mt-[3pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--accent)" />
            </div>
          ))}
        </div>
      </Section>
    ),
    projects: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(8) }}>
          {data.projects.map((project) => (
            <div key={project.key}>
              <div data-block data-keep={Boolean(project.description)}>
                <p className="font-bold">{project.name}</p>
                {project.linkText && (
                  <MaybeLink href={project.href} className="fs-8.5 text-(--accent)">
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
    skills: (title) => (
      <Section title={title} theme={theme}>
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          defaultDisplay="tags"
          listClassName="fs-9"
          tagsClassName="flex flex-wrap gap-[4pt]"
          tagClassName="rounded-[4pt] border border-(--line) px-[6pt] py-[1.5pt] fs-8.5 font-medium"
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[11pt] fs-9 marker:text-(--accent)"
        />
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(7) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="fs-9" data-block>
              {entry.degree && <p className="font-bold">{entry.degree}</p>}
              {entry.school && <p>{entry.school}</p>}
              {entry.year && <p className="text-(--muted)">{entry.year}</p>}
            </div>
          ))}
        </div>
      </Section>
    ),
    additional: () =>
      data.additional.map((section) => (
        <Section key={section.key} title={section.heading} theme={theme}>
          <BulletList items={section.items} className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[11pt] fs-9 marker:text-(--accent)" />
        </Section>
      )),
  };
  const render = (section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>;

  // A Summary at the very top gets the full-width box above the columns (also with one column)
  const { twoColumns, lead, main, side } = splitSections(data);
  const first = data.sections[0];
  const topSummary = lead ?? (!twoColumns && first?.id === "summary" ? first : null);
  const mainSections = twoColumns ? main : data.sections.filter((section) => section !== topSummary);

  // Column widths: the design's ratio if chosen, otherwise a 56mm side column
  const gridColumns = data.sideRatioChanged ? { gridTemplateColumns: `${100 - data.sideRatio}fr ${data.sideRatio}fr` } : undefined;
  const headerStyle = HEADER_STYLES[data.headerAlign];

  return (
    <div className="fs-9.75 leading-(--lh)">
      <div className="h-[5mm]" style={GRADIENT} aria-hidden="true" />

      {/* Page margins come from the design (--m-top etc.) */}
      <div className="pt-(--m-top) pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        {/* Header: name on one side, contacts stacked on the other (or both centred) */}
        <header data-block data-flow="all">
          <WithPhoto photo={data.photo} align={data.headerAlign}>
            <div className={headerStyle.header}>
              <div className={`min-w-0 ${headerStyle.name}`}>
                <h1 className="font-heading hfs-28 leading-[1.05] font-extrabold tracking-tight text-(--deep)">{data.name}</h1>
                {data.headline && <p className="mt-[4pt] fs-12 font-semibold text-(--accent)">{data.headline}</p>}
              </div>
              {data.contacts.length > 0 && (
                <ul className={`shrink-0 space-y-[calc(1.5pt*var(--bullet-space,1))] ${headerStyle.contacts} fs-8.5 text-(--muted)`}>
                  {data.contacts.map((item) => (
                    <li key={item.text}>
                      <MaybeLink href={item.href}>{item.text}</MaybeLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </WithPhoto>
        </header>

        {/* Highlighted summary (the plain wrapper is the page-break block) */}
        {topSummary && (
          <div className="mt-[12pt]" data-block data-flow="all">
            {summaryBox(topSummary.title)}
          </div>
        )}

        {/* Asymmetric two columns (one column if the design asks, or a side is empty) */}
        {(mainSections.length > 0 || side.length > 0) && (
          <div className={`mt-[14pt] grid gap-[8mm] ${twoColumns ? "grid-cols-[1fr_56mm]" : "grid-cols-1"}`} style={twoColumns ? gridColumns : undefined}>
            {mainSections.length > 0 && (
              <div className="min-w-0" data-column="main">
                {mainSections.map(render)}
              </div>
            )}

            {twoColumns && (
              <div className="divider-l min-w-0 pl-[6mm]" data-column="side">
                {side.map(render)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
