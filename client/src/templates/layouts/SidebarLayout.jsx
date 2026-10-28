import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, MaybeLink, Photo, RichText, SectionTitle, Skills, WithPhoto, JobSubtitle } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Sidebar: two columns. A coloured left sidebar holds name, contact details and the
// side-column sections (skills and education by default); the main column holds the rest.
// The design can move any section between the columns, or switch to one column (then the
// sidebar keeps just the name and contact details). Two columns look great but can confuse
// some ATS systems (marked as not ATS-friendly). This layout is "full bleed", so it sets its
// own page margins. data-column="side" / "main" gives each column its own page breaks.

// Inside the sidebar, the regular colours are swapped for tints of the sidebar text colour,
// so any section moved there stays readable on the accent background
const SIDEBAR_COLORS = {
  "--accent": "var(--on-accent)",
  "--heading": "var(--on-accent)",
  "--deep": "var(--on-accent)",
  "--text": "var(--on-accent)",
  "--muted": "color-mix(in oklab, var(--on-accent) 80%, transparent)",
  "--soft": "color-mix(in oklab, var(--on-accent) 15%, transparent)",
  "--line": "color-mix(in oklab, var(--on-accent) 30%, transparent)",
};

// Heading inside the coloured sidebar. Its divider follows the design's divider style,
// but stays a light tint of the sidebar text colour so it's visible on the accent background.
function SideSection({ title, children }) {
  return (
    <section style={{ marginTop: sectionGap(16) }}>
      <h2
        className="font-heading divider-b [--divider-pad:3pt] [--line:color-mix(in_oklab,var(--on-accent)_30%,transparent)] hfs-8.5 font-bold text-current/90 uppercase"
        data-block
        data-keep
        data-flow="side"
      >
        {title}
      </h2>
      <div style={{ marginTop: itemGap(6) }}>{children}</div>
    </section>
  );
}

// Heading in the main (white) column
function MainSection({ title, theme, children }) {
  return (
    // first:mt-0! = no top margin on the first section ("!" lets it override the inline style)
    <section className="first:mt-0!" style={{ marginTop: sectionGap(14) }}>
      <SectionTitle theme={theme} className="divider-b" data-block data-keep>
        {title}
      </SectionTitle>
      <div style={{ marginTop: itemGap(6) }}>{children}</div>
    </section>
  );
}

export default function SidebarLayout({ data, theme }) {
  // Section contents; skills and education have a compact version for the sidebar
  const CONTENT = {
    summary: () => (
      <RichText html={data.summary} data-block />
    ),
    experience: () => (
      <div className="flex flex-col" style={{ gap: itemGap(10) }}>
        {data.experience.map((job) => (
          <div key={job.key}>
            <div data-block data-keep={job.bullets.length > 0}>
              <p className="fs-10.5 font-bold">{job.role || job.company}</p>
              <p className="fs-9 text-(--muted)">
                {job.role && job.company && <span className="font-semibold text-(--accent)">{job.company}</span>}
                {job.role && job.company && job.dates && "  ·  "}
                {job.dates}
              </p>
            </div>
            <JobSubtitle text={job.subtitle} />
            <BulletList items={job.bullets} rich className="mt-[3pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--accent)" />
          </div>
        ))}
      </div>
    ),
    education: (column) =>
      column === "side" ? (
        <div className="flex flex-col" style={{ gap: itemGap(7) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="fs-8.5" data-block data-flow="side">
              {entry.degree && <p className="fs-9 font-bold">{entry.degree}</p>}
              {entry.school && <p className="text-current/90">{entry.school}</p>}
              {entry.year && <p className="text-current/75">{entry.year}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: itemGap(7) }}>
          {data.education.map((entry) => (
            <div key={entry.key} data-block>
              <p className="fs-10.5 font-bold">{entry.degree || entry.school}</p>
              <p className="fs-9 text-(--muted)">
                {entry.degree && entry.school && <span className="font-semibold text-(--accent)">{entry.school}</span>}
                {entry.degree && entry.school && entry.year && "  ·  "}
                {entry.year}
              </p>
            </div>
          ))}
        </div>
      ),
    skills: (column) =>
      column === "side" ? (
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          defaultDisplay="tags"
          listClassName="fs-8.5"
          tagsClassName="flex flex-wrap gap-[4pt] fs-8.5"
          tagClassName="rounded-[3pt] bg-(--on-accent)/15 px-[5pt] py-[1.5pt]"
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] fs-8.5"
        />
      ) : (
        <Skills
          skills={data.skills}
          display={data.skillsDisplay}
          defaultDisplay="tags"
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] marker:text-(--accent)"
        />
      ),
    projects: () => (
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
    ),
  };

  // One section (or, for "additional", one per additional section) in either column
  const renderSection = (section, column) => {
    const Wrapper = column === "side" ? SideSection : MainSection;
    if (section.id === "additional") {
      return data.additional.map((extra) => (
        <Wrapper key={extra.key} title={extra.heading} theme={theme}>
          <BulletList
            items={extra.items}
            className={`space-y-[calc(2pt*var(--bullet-space,1))] pl-[12pt] ${column === "side" ? "" : "marker:text-(--accent)"}`}
          />
        </Wrapper>
      ));
    }
    return (
      <Wrapper key={section.key} title={section.title} theme={theme}>
        {CONTENT[section.id](column)}
      </Wrapper>
    );
  };

  // The sidebar is always there (it holds the name), so side sections go in it even when
  // the main column is empty; with one column, everything goes in the main column
  const sideSections = data.sections.filter((section) => section.column === "side");
  const mainSections = data.sections.filter((section) => section.column === "main");

  // Sidebar width: the design's ratio if chosen, otherwise 58mm + the left margin (66mm by default)
  const asideWidth = data.sideRatioChanged ? { width: `${data.sideRatio}%` } : undefined;

  return (
    // min-h fills every page (--sheet-height comes from ResumeSheet) so the sidebar
    // colour reaches the bottom; 1mm less when printing so it never adds a blank page
    <div className="flex min-h-(--sheet-height) fs-9.5 leading-(--lh) print:min-h-[calc(var(--sheet-height)-1mm)]">
      {/* ---------- Sidebar ---------- */}
      {/* Outer page margins come from the design (--m-left etc.); the gaps beside the sidebar edge are fixed.
          By default the sidebar grows with the left margin, so its content keeps its width (66mm at the default 8mm). */}
      <aside
        className="w-[calc(58mm+var(--m-left))] shrink-0 bg-(--accent) pt-(--m-top) pr-[8mm] pb-(--m-bottom) pl-(--m-left) text-(--on-accent)"
        style={asideWidth}
        data-column="side"
      >
        <div style={SIDEBAR_COLORS}>
          <div style={HEADER_ALIGN} data-block data-flow="side">
            {/* Photo: on its own at the top of the sidebar (the default), or beside the name */}
            {data.photo?.position === "sidebar" && (
              <Photo photo={data.photo} className="mr-(--header-mr) mb-[10pt] ml-(--header-ml)" />
            )}
            <WithPhoto photo={data.photo?.position === "sidebar" ? null : data.photo} align={data.headerAlign}>
              <h1 className="font-heading hfs-20 leading-[1.15] font-bold tracking-tight wrap-break-word">{data.name}</h1>
              {data.headline && <p className="mt-[5pt] fs-10.5 leading-snug text-current/85">{data.headline}</p>}
            </WithPhoto>
          </div>

          {data.contacts.length > 0 && (
            <SideSection title="Contact">
              <ul className="space-y-[calc(4pt*var(--bullet-space,1))] fs-8.5 wrap-break-word" data-block data-flow="side">
                {data.contacts.map((item) => (
                  <li key={item.text}>
                    <MaybeLink href={item.href}>{item.text}</MaybeLink>
                  </li>
                ))}
              </ul>
            </SideSection>
          )}

          {sideSections.map((section) => (
            <Fragment key={section.key}>{renderSection(section, "side")}</Fragment>
          ))}
        </div>
      </aside>

      {/* ---------- Main column ---------- */}
      <main className="min-w-0 flex-1 pt-(--m-top) pr-(--m-right) pb-(--m-bottom) pl-[10mm]" data-column="main">
        {mainSections.map((section) => (
          <Fragment key={section.key}>{renderSection(section, "main")}</Fragment>
        ))}
      </main>
    </div>
  );
}
