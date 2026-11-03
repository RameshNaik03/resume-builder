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

// The root of a foundation layout.
//   vars - foundationVars(type, rhythm), computed once at module level by the layout
export function FoundationPage({ vars, className = "", children }) {
  return (
    <div className={`f-page ${className}`} style={vars}>
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

// A section heading.
//   variant - "plain", "underline" (the design's divider below) or "centered" (between two rules)
//   caps    - uppercase (no letter-spacing either way, so an ATS reads it as one word)
export function SectionHeading({ variant = "plain", caps = true, className = "", children }) {
  const variantClass = { plain: "", underline: "divider-b", centered: "f-heading-centered" }[variant];
  return (
    <h2 className={`f-heading ${caps ? "f-caps" : ""} ${variantClass} ${className}`} data-block data-keep>
      {children}
    </h2>
  );
}

// A section: the same gap above every heading, the same gap between heading and content.
//   heading - props for SectionHeading (variant, caps)
export function Section({ title, heading, children }) {
  return (
    <section className="f-section">
      <SectionHeading {...heading}>{title}</SectionHeading>
      <div className="f-section-body">{children}</div>
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
// (defaultDisplay) when the design doesn't choose
export function SkillsList({ skills, display, defaultDisplay = "comma" }) {
  const style = display ?? defaultDisplay;
  if (style === "bullets") return <BulletList items={skills} />;
  if (style === "tags") {
    return (
      <ul className="f-tags" data-block>
        {skills.map((skill, index) => (
          <li key={`${skill}-${index}`} className="f-tag">
            {skill}
          </li>
        ))}
      </ul>
    );
  }
  return <p data-block>{skills.join(", ")}</p>;
}

// Every section of the resume in the design's order (one or two columns), drawn with the
// foundation pieces. Layouts add their own header and choose:
//   heading       - SectionHeading props, e.g. { variant: "underline" }
//   orgInline     - "Role, Company" on one line instead of the company below
//   defaultSkills - the skills style when the design doesn't choose one
export function FoundationSections({ data, heading, orgInline = false, defaultSkills = "comma" }) {
  const body = {
    summary: () => <RichText html={data.summary} data-block />,
    experience: () => <ExperienceList jobs={data.experience} orgInline={orgInline} />,
    education: () => <EducationList entries={data.education} orgInline={orgInline} />,
    skills: () => <SkillsList skills={data.skills} display={data.skillsDisplay} defaultDisplay={defaultSkills} />,
    projects: () => <ProjectList projects={data.projects} />,
  };

  const render = (section) =>
    section.id === "additional" ? (
      // Each additional section (Certifications, Languages...) has its own heading
      data.additional.map((extra) => (
        <Section key={`${section.key}-${extra.key}`} title={extra.heading} heading={heading}>
          <BulletList items={extra.items} />
        </Section>
      ))
    ) : (
      <Section key={section.key} title={section.title} heading={heading}>
        {body[section.id]()}
      </Section>
    );

  return <SectionColumns data={data} render={render} />;
}
