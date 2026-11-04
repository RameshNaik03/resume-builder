// Building blocks every foundation template composes, so all of them share the same type
// scale, rhythm and details (see tokens.js for the scales, foundation.css for the styles).
//
// Page breaks (templates/pagination.js): every piece that must stay whole is a data-block;
// headings, job headers and subtitles are data-keep, so they move to the next page together
// with what follows and a heading is never left alone at the bottom of a page.
//
// Reading order: everything is in normal flow (no positioned or floated text), in the order
// it should be read: name and contact first, each job title directly above its bullets.

import { Fragment } from "react";
import "./foundation.css";
import { MaybeLink, RichText, SectionColumns } from "../layouts/shared";
import { SectionIcon } from "./icons";
import { DrawnText } from "./glyphs";
import { careerSpan } from "./career";

// The root of a foundation layout.
//   vars  - foundationVars(type, rhythm), computed once at module level by the layout
//   fill  - the root fills every page (for backgrounds drawn down the whole sheet)
//   style - extra inline styles (e.g. that background)
export function FoundationPage({ vars, fill = false, className = "", style, children }) {
  return (
    <div className={`f-page ${fill ? "f-page-fill" : ""} ${className}`} style={{ ...vars, ...style }}>
      {children}
    </div>
  );
}

// "email · phone · location ..." with drawn separators and subtly styled links.
//   separator - "dot" or "bar"
export function ContactLine({ contacts, separator = "dot", className = "" }) {
  if (contacts.length === 0) return null;

  return (
    <p className={`f-contact ${className}`}>
      {contacts.map((item, index) => (
        // Never wrap inside an item; <wbr> allows wrapping between items. The separator sits
        // at the end of an item, so a wrapped line never starts with one.
        <Fragment key={item.text}>
          {index > 0 && <wbr />}
          <span className="whitespace-nowrap">
            {item.href ? <a href={item.href}>{item.text}</a> : item.text}
            {index < contacts.length - 1 && <span aria-hidden="true" className={`f-sep f-sep-${separator}`} />}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

// Contact details one per line, for narrow columns such as a sidebar
export function ContactList({ contacts, className = "" }) {
  if (contacts.length === 0) return null;
  return (
    <ul className={`f-contact-list ${className}`} data-block>
      {contacts.map((item) => (
        <li key={item.text}>{item.href ? <a href={item.href}>{item.text}</a> : item.text}</li>
      ))}
    </ul>
  );
}

// A section heading.
//   variant - "plain", "underline" (the design's divider below), "ruled" (rules beside it,
//             placed by the header alignment), "bar" (a bar on its left) or "short" (a short
//             rule under it, aligned like the header)
//   caps    - uppercase (no letter-spacing either way, so an ATS reads it as one word)
//             Also "over" (a rule above it), "block" (a solid square before it) and "ornament"
//             (a small diamond under it, aligned like the header)
//   caps    - uppercase (no letter-spacing either way, so an ATS reads it as one word)
//   icon    - a section id: draws that section's icon before the text (see icons.jsx)
//   number  - "01", "02"...: drawn (not text) before the heading, so the heading an ATS reads
//             is just "Experience"; numberHeight sets its size
export function SectionHeading({ variant = "plain", caps = true, icon, number, numberHeight = "24pt", className = "", children }) {
  const variantClass = {
    plain: "",
    underline: "divider-b",
    ruled: "f-heading-ruled",
    bar: "f-heading-bar",
    short: "f-heading-short",
    over: "f-heading-over",
    block: "f-heading-block",
    ornament: "f-heading-ornament",
  }[variant];
  if (number) {
    return (
      <div className={`f-heading-numbered ${className}`} data-block data-keep>
        <span className="f-heading-number-box">
          <DrawnText text={number} height={numberHeight} weight={0.9} className="f-heading-number" />
        </span>
        <h2 className={`f-heading ${caps ? "f-caps" : ""} ${variantClass}`}>{children}</h2>
      </div>
    );
  }
  return (
    <h2 className={`f-heading ${caps ? "f-caps" : ""} ${variantClass} ${icon ? "f-heading-icon" : ""} ${className}`} data-block data-keep>
      {icon && <SectionIcon id={icon} />}
      {children}
    </h2>
  );
}

// A section: the same gap above every heading, the same gap between heading and content.
//   heading - props for SectionHeading (variant, caps, icon)
//   card    - draw the section as a softly tinted card (its tint is cut at page breaks)
//   bodyClassName - classes for the content wrapper (e.g. f-indent)
export function Section({ title, heading, card = false, bodyClassName = "", children }) {
  return (
    <section className={`f-section ${card ? "f-card" : ""}`} {...(card && { "data-segmented": "", "data-seg-pad": 16 })}>
      <SectionHeading {...heading}>{title}</SectionHeading>
      <div className={`f-section-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

// Title on the left with dates right-aligned on the same line, the organisation below
// (or after the title with orgInline).
//   aside        - shown on the right instead of dates (e.g. a project link)
//   keepWithNext - false when nothing follows (no bullets), so the block can end a page
export function JobHeader({ title, org, dates, aside, orgInline = false, keepWithNext = true }) {
  return (
    <div data-block data-keep={keepWithNext}>
      <div className="f-entry-head">
        <p className="f-job-title">
          {title}
          {orgInline && org && <span className="f-org-inline">, {org}</span>}
        </p>
        {dates ? <p className="f-meta f-date">{dates}</p> : aside}
      </div>
      {!orgInline && org && <p className="f-meta">{org}</p>}
    </div>
  );
}

// Bullet points with drawn markers and a hanging indent. Each one is its own block,
// so a long list can continue on the next page.
//   rich - the items are sanitized HTML (job bullets) rather than plain text
export function BulletList({ items, rich = false }) {
  if (items.length === 0) return null;
  return (
    <ul className="f-bullets">
      {items.map((item, index) => (
        <li key={index} className="f-bullet" data-block>
          {rich ? (
            <span className="f-bullet-text rich-text" dangerouslySetInnerHTML={{ __html: item }} />
          ) : (
            <span className="f-bullet-text">{item}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------- Section bodies ----------

export function ExperienceList({ jobs, orgInline = false }) {
  return (
    <div className="f-entries">
      {jobs.map((job) => (
        <div key={job.key}>
          <JobHeader
            title={job.role || job.company}
            org={job.role ? job.company : ""}
            dates={job.dates}
            orgInline={orgInline}
            keepWithNext={job.bullets.length > 0 || Boolean(job.subtitle)}
          />
          {job.subtitle && (
            <p className="f-subtitle" data-block data-keep={job.bullets.length > 0}>
              {job.subtitle}
            </p>
          )}
          <BulletList items={job.bullets} rich />
        </div>
      ))}
    </div>
  );
}

// A cover letter in place of the resume's sections (data.letter, see templates/prepareLetter.js):
// the date, the recipient, the subject line, the greeting, the body's paragraphs, then the
// sign-off and the name with room to sign. In the page source in that order, so the text reads
// like the letter. One block per part (the sign-off and name stay together).
export function LetterBlock({ letter }) {
  return (
    <section className="f-section f-letter">
      {letter.date && (
        <p className="f-letter-date" data-block>
          {letter.date}
        </p>
      )}
      {letter.recipient.length > 0 && (
        <div className="f-letter-recipient" data-block>
          {letter.recipient.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {letter.subject && <p className="f-letter-subject" data-block dangerouslySetInnerHTML={{ __html: letter.subject }} />}
      <div className="f-letter-body">
        {letter.greeting && <RichText html={letter.greeting} className="f-letter-greeting" data-block />}
        {letter.paragraphs.map((html, index) => (
          <RichText key={index} html={html} data-block />
        ))}
      </div>
      {letter.closing && (
        <div className="f-letter-closing" data-block>
          <p dangerouslySetInnerHTML={{ __html: letter.closing.signOff }} />
          {/* Room to sign, then a drawn line above the name */}
          <p className="f-letter-signature" dangerouslySetInnerHTML={{ __html: letter.closing.name }} />
        </div>
      )}
    </section>
  );
}

// Experience on a timeline: dates in the left column, a drawn dot on a vertical line, the job
// to the right. Needs .f-tl-root on the page (the column widths). In the page source the title
// comes first, then the dates (on the same line), then the company, so the text reads in order.
//   stacked - for narrow columns: no date column, the dates sit above the title (and come
//             before it in the page source, so the text still reads top to bottom)
export function TimelineList({ jobs, stacked = false }) {
  return (
    <div className={`f-entries f-timeline ${stacked ? "f-tl-stacked" : ""}`} data-segmented>
      {jobs.map((job) => (
        <div key={job.key}>
          <div className="f-tl-head" data-block data-keep={job.bullets.length > 0 || Boolean(job.subtitle)}>
            {stacked && job.dates && <p className="f-tl-date f-meta f-date">{job.dates}</p>}
            <p className="f-tl-main f-job-title">{job.role || job.company}</p>
            {!stacked && job.dates && <p className="f-tl-date f-meta f-date">{job.dates}</p>}
            <span className="f-tl-dot" aria-hidden="true" data-seg-start />
            {job.role && job.company && <p className="f-tl-org f-meta">{job.company}</p>}
          </div>
          <div className="f-tl-body">
            {job.subtitle && (
              <p className="f-subtitle" data-block data-keep={job.bullets.length > 0}>
                {job.subtitle}
              </p>
            )}
            <BulletList items={job.bullets} rich />
          </div>
        </div>
      ))}
    </div>
  );
}

// Education with the year in the timeline's date column (no dots or line)
//   stacked - the year above the degree, as in a stacked TimelineList
export function DatedEducationList({ entries, stacked = false }) {
  return (
    <div className={`f-entries ${stacked ? "f-tl-stacked f-tl-no-rail" : ""}`}>
      {entries.map((entry) => (
        <div key={entry.key} className="f-tl-head" data-block>
          {stacked && entry.year && <p className="f-tl-date f-meta f-date">{entry.year}</p>}
          <p className="f-tl-main f-job-title">{entry.degree || entry.school}</p>
          {!stacked && entry.year && <p className="f-tl-date f-meta f-date">{entry.year}</p>}
          {entry.degree && entry.school && <p className="f-tl-org f-meta">{entry.school}</p>}
        </div>
      ))}
    </div>
  );
}

export function EducationList({ entries, orgInline = false }) {
  return (
    <div className="f-entries">
      {entries.map((entry) => (
        <JobHeader
          key={entry.key}
          title={entry.degree || entry.school}
          org={entry.degree ? entry.school : ""}
          dates={entry.year}
          orgInline={orgInline}
          keepWithNext={false}
        />
      ))}
    </div>
  );
}

export function ProjectList({ projects }) {
  return (
    <div className="f-entries">
      {projects.map((project) => (
        <div key={project.key}>
          <JobHeader
            title={project.name}
            aside={
              project.linkText && (
                <MaybeLink href={project.href} className="f-meta f-link shrink-0">
                  {project.linkText}
                </MaybeLink>
              )
            }
            keepWithNext={Boolean(project.description)}
          />
          {project.description && <RichText html={project.description} className="f-entry-text" data-block />}
        </div>
      ))}
    </div>
  );
}

// Skills in the design's style ("comma", "tags" or "bullets"), or the layout's own
// (defaultDisplay) when the design doesn't choose. A layout can also default to "levels":
// skills the user rated show their level as drawn dots, the rest as tags after them.
//   items - [{ name, level }] (data.skillItems), for "levels"
export function SkillsList({ skills, items = [], display, defaultDisplay = "comma" }) {
  const style = display ?? defaultDisplay;
  if (style === "levels") {
    const rated = items.filter((item) => item.level);
    const unrated = items.filter((item) => !item.level).map((item) => item.name);
    if (rated.length === 0) return <SkillsList skills={skills} display="tags" />;
    return (
      <>
        <SkillLevels items={rated} />
        {unrated.length > 0 && <SkillsList skills={unrated} display="tags" />}
      </>
    );
  }
  if (style === "bullets") return <BulletList items={skills} />;
  if (style === "tags") return <TagList skills={skills} />;
  return <p data-block>{skills.join(", ")}</p>;
}

function TagList({ skills }) {
  return (
    <ul className="f-tags f-tags-after" data-block>
      {skills.map((skill, index) => (
        <li key={`${skill}-${index}`} className="f-tag">
          {skill}
        </li>
      ))}
    </ul>
  );
}

// Rated skills in two columns, each with five drawn dots (filled up to its level).
// One block per row, so a long list can continue on the next page.
export function SkillLevels({ items }) {
  const rows = [];
  for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));
  return (
    <div className="flex flex-col gap-[4pt]">
      {rows.map((row) => (
        <div key={row[0].name} className="f-levels" data-block>
          {row.map((item) => (
            <div key={item.name} className="f-level">
              <span className="min-w-0">{item.name}</span>
              <span className="f-level-dots" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((value) => (
                  <span key={value} className={`f-level-dot ${value <= item.level ? "f-level-dot-on" : ""}`} />
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// The summary as a pull quote: italic heading-font text after a drawn quote mark
export function PullQuote({ html }) {
  return (
    <div className="f-pull-quote" data-block>
      <svg className="f-quote-mark" viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
        <path d="M0 16V9.6C0 4.4 2.6 1.2 7.8 0l.9 2.2C5.9 3.1 4.6 5 4.4 7.6H8V16zm11.2 0V9.6c0-5.2 2.6-8.4 7.8-9.6l.9 2.2c-2.8.9-4.1 2.8-4.3 5.4h3.6V16z" />
      </svg>
      <RichText html={html} className="min-w-0 flex-1" />
    </div>
  );
}

// A drawn strip of the career's time span (see career.js): the first and last years drawn as
// strokes at the ends, each job's time as a segment of the bar. Nothing when no job has
// readable dates. Purely decorative: nothing in it is text.
export function CareerStrip({ jobs, className = "" }) {
  const span = careerSpan(jobs);
  if (!span) return null;
  const pct = (fraction) => `${(fraction * 100).toFixed(2)}%`;
  const stops = ["var(--soft) 0%"];
  span.segments.forEach(({ from, to }, index) => {
    const color = index % 2 === 0 ? "var(--line)" : "color-mix(in srgb, var(--line) 55%, var(--bg, #fff))";
    // A hairline gap between neighbouring jobs
    stops.push(`var(--soft) ${pct(from)}`, `${color} calc(${pct(from)} + ${index === 0 ? 0 : 1}pt)`, `${color} ${pct(to)}`, `var(--soft) ${pct(to)}`);
  });
  stops.push("var(--soft) 100%");
  return (
    <div className={`f-career ${className}`} aria-hidden="true" data-block>
      <DrawnText text={String(span.firstYear)} height="6pt" weight={1.4} />
      <div className="f-career-bar" style={{ backgroundImage: `linear-gradient(to right, ${stops.join(", ")})` }} />
      <DrawnText text={String(span.lastYear)} height="6pt" weight={1.4} />
    </div>
  );
}

// One section of the resume (or, for "additional", one section per extra heading), drawn with
// the foundation pieces. Options (the same for every section of a layout):
//   heading       - SectionHeading props, e.g. { variant: "underline" }
//   icons         - draw each section's icon in its heading
//   card          - draw each section as a tinted card
//   orgInline     - "Role, Company" on one line instead of the company below
//   defaultSkills - the skills style when the design doesn't choose one
//   bodies        - replacement bodies by section id, e.g. { experience: (data) => <TimelineList ... /> }
//   bodyClassName - classes for the standard bodies (not the replacements)
//   numbers       - drawn section numbers by key (sectionNumbers() in layouts/sectionLayout.js)
export function FoundationSection({ data, section, options = {} }) {
  if (section.id === "letter") return <LetterBlock letter={data.letter} />;
  const { heading, icons = false, card = false, orgInline = false, defaultSkills = "comma", bodies = {}, bodyClassName = "", numbers } =
    options;
  const standard = {
    summary: () => <RichText html={data.summary} data-block />,
    experience: () => <ExperienceList jobs={data.experience} orgInline={orgInline} />,
    education: () => <EducationList entries={data.education} orgInline={orgInline} />,
    skills: () => <SkillsList skills={data.skills} items={data.skillItems} display={data.skillsDisplay} defaultDisplay={defaultSkills} />,
    projects: () => <ProjectList projects={data.projects} />,
  };
  const headingFor = (id, numberKey = id) => ({ ...heading, icon: icons ? id : undefined, number: numbers?.[numberKey] });

  if (section.id === "additional") {
    // Each additional section (Certifications, Languages...) has its own heading
    return data.additional.map((extra) => (
      <Section
        key={extra.key}
        title={extra.heading}
        heading={headingFor("additional", `additional:${extra.key}`)}
        card={card}
        bodyClassName={bodyClassName}
      >
        <BulletList items={extra.items} />
      </Section>
    ));
  }
  const replacement = bodies[section.id];
  return (
    <Section title={section.title} heading={headingFor(section.id)} card={card} bodyClassName={replacement ? "" : bodyClassName}>
      {replacement ? replacement(data) : standard[section.id]()}
    </Section>
  );
}

// A list of sections, in order (e.g. one column of a custom two-column layout)
export function FoundationSectionList({ data, sections, options }) {
  return sections.map((section) => <FoundationSection key={section.key} data={data} section={section} options={options} />);
}

// Every section of the resume in the design's order, in one column or two (SectionColumns).
// Layouts add their own header; options as for FoundationSection.
export function FoundationSections({ data, ...options }) {
  return (
    <SectionColumns
      data={data}
      render={(section) => <FoundationSection key={section.key} data={data} section={section} options={options} />}
    />
  );
}
