import { Fragment } from "react";
import { itemGap, sectionGap } from "../themes";
import { BulletList, ContactLine, MaybeLink, RichText, SectionColumns, Skills, WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Creative: bold and colourful. Gradient shapes in the top corner, a big name,
// bold section headings with a gradient marker, skills as tags and dates as pills.
// The shapes are pure CSS (no images). Marked as not ATS-friendly.
// This layout is "full bleed", so it sets its own page margins.

const GRADIENT = { backgroundImage: "var(--gradient)" };

function Section({ title, theme, children }) {
  const isCaps = theme.headingStyle === "caps";
  return (
    <section style={{ marginTop: sectionGap(15) }}>
      <h2
        className={`font-heading divider-b flex items-center gap-[7pt] font-extrabold text-(--heading) ${
          isCaps ? "hfs-11.5 tracking-[0.1em] uppercase" : "hfs-14"
        }`}
        data-block
        data-keep
      >
        {/* Small rotated gradient square as a marker */}
        <span className="size-[8pt] shrink-0 rotate-45 rounded-[2pt]" style={GRADIENT} aria-hidden="true" />
        {title}
      </h2>
      <div style={{ marginTop: itemGap(7) }}>{children}</div>
    </section>
  );
}

export default function CreativeLayout({ data, theme }) {
  // One renderer per section; the design decides their order, headings and columns
  const SECTIONS = {
    summary: (title) => (
      <Section title={title} theme={theme}>
        <RichText html={data.summary} data-block />
      </Section>
    ),
    experience: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(10) }}>
          {data.experience.map((job) => (
            <div key={job.key}>
              <div className="flex items-center justify-between gap-[12pt]" data-block data-keep={job.bullets.length > 0}>
                <p>
                  <span className="fs-10.5 font-bold">{job.role}</span>
                  {job.role && job.company && <span className="text-(--muted)"> @ </span>}
                  <span className="font-semibold text-(--accent)">{job.company}</span>
                </p>
                {job.dates && (
                  <p className="shrink-0 rounded-full bg-(--soft) px-[7pt] py-[1.5pt] fs-8.5 font-semibold text-(--accent)">
                    {job.dates}
                  </p>
                )}
              </div>
              <BulletList items={job.bullets} rich className="mt-[4pt] space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)" />
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
              <p data-block data-keep={Boolean(project.description)}>
                <span className="font-bold">{project.name}</span>
                {project.name && project.linkText && <span className="text-(--muted)"> — </span>}
                {project.linkText && (
                  <MaybeLink href={project.href} className="fs-9 text-(--accent)">
                    {project.linkText}
                  </MaybeLink>
                )}
              </p>
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
          tagsClassName="flex flex-wrap gap-[5pt]"
          tagClassName="rounded-full bg-(--soft) px-[8pt] py-[2.5pt] fs-9 font-semibold text-(--deep)"
          bulletClassName="space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)"
        />
      </Section>
    ),
    education: (title) => (
      <Section title={title} theme={theme}>
        <div className="flex flex-col" style={{ gap: itemGap(6) }}>
          {data.education.map((entry) => (
            <div key={entry.key} className="flex items-baseline justify-between gap-[12pt]" data-block>
              <p>
                <span className="font-bold">{entry.degree}</span>
                {entry.degree && entry.school && <span className="text-(--muted)"> · </span>}
                {entry.school}
              </p>
              {entry.year && <p className="shrink-0 fs-9 text-(--muted)">{entry.year}</p>}
            </div>
          ))}
        </div>
      </Section>
    ),
    additional: () =>
      data.additional.map((section) => (
        <Section key={section.key} title={section.heading} theme={theme}>
          <BulletList items={section.items} className="space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)" />
        </Section>
      )),
  };

  return (
    <div className="relative overflow-hidden fs-10 leading-(--lh)">
      {/* ---------- Decorative shapes (top right corner of page 1) ---------- */}
      <div aria-hidden="true">
        <div className="absolute -top-[42mm] -right-[34mm] size-[100mm] rounded-full" style={GRADIENT} />
        <div className="absolute top-[40mm] right-[58mm] size-[12mm] rounded-full bg-(--soft)" />
        <div className="absolute top-[8mm] right-[78mm] size-[5mm] rounded-full opacity-70" style={GRADIENT} />
      </div>

      {/* relative keeps the content above the shapes */}
      {/* Page margins come from the design (--m-top etc.) */}
      <div className="relative pt-(--m-top) pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        {/* The header block (kept clear of the shapes) also follows the header alignment */}
        {/* The text stays clear of the corner shapes; with a photo the header is wider so a
            photo on the right sits over the gradient circles */}
        <header
          className={`mr-(--header-mr) ml-(--header-ml) ${data.photo ? "max-w-[160mm]" : "max-w-[118mm]"}`}
          style={HEADER_ALIGN}
          data-block
        >
          {/* On the right the photo sits over the gradient circles, where a white border reads best */}
          <WithPhoto
            photo={data.photo}
            align={data.headerAlign}
            defaultBorderColor={data.photo?.position === "right" && data.headerAlign !== "center" ? "#ffffff" : undefined}
          >
            <h1 className="font-heading hfs-32 leading-[1.05] font-extrabold tracking-tight text-(--deep)">{data.name}</h1>
            {data.headline && <p className="mt-[5pt] fs-13 font-semibold text-(--accent)">{data.headline}</p>}
            <ContactLine contacts={data.contacts} separator="/" className="mt-[8pt] fs-9 text-(--muted)" />
          </WithPhoto>
        </header>

        <SectionColumns data={data} render={(section) => <Fragment key={section.key}>{SECTIONS[section.id](section.title)}</Fragment>} />
      </div>
    </div>
  );
}
