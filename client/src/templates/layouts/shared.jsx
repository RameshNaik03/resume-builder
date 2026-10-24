// Small building blocks shared by all layouts.
// Colours, fonts, sizes and spacing come from CSS variables set by TemplateRenderer
// (see templates/design.js), so every layout follows the resume's design settings:
//   colours   --accent, --text, --muted, --heading, --line, --bg ...
//   text      fs-10 = 10pt at the template's default size; hfs-* for headings and names
//   headings  font-heading + text-(--heading); dividers with divider-b / divider-l / divider-rule
//   spacing   sectionGap() / itemGap() from ../themes; root line height leading-(--lh)
//
// Page breaks (see templates/pagination.js): mark each piece that must not be split
// across pages with data-block, add data-keep to headings so they stay with what follows,
// and keep blocks free of backgrounds/borders on top (blocks get extra top padding
// when they're moved to the next page).

import { Fragment } from "react";
import { splitSections } from "./sectionLayout";

// "email · phone · location ..." with clickable links where available
export function ContactLine({ contacts, separator = "·", className = "" }) {
  if (contacts.length === 0) return null;

  return (
    <p className={className}>
      {contacts.map((item, index) => (
        // whitespace-nowrap: never wrap inside an item (e.g. "Austin, / TX");
        // <wbr> lets the line wrap between items when larger text or margins need it.
        // The separator sits at the end of each item, so a wrapped line never starts with one.
        <Fragment key={item.text}>
          {index > 0 && <wbr />}
          <span className="whitespace-nowrap">
            {item.href ? (
              <a href={item.href} className="hover:text-(--accent)">
                {item.text}
              </a>
            ) : (
              item.text
            )}
            {index < contacts.length - 1 && <span className="mx-[5pt] opacity-60">{separator}</span>}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

// Section heading that follows the theme's heading style ("caps" or "title")
export function SectionTitle({ theme, size = "md", className = "", children, ...rest }) {
  const isCaps = theme.headingStyle === "caps";
  const sizeClass = {
    md: isCaps ? "hfs-10.5 tracking-[0.12em]" : "hfs-12.5",
    sm: isCaps ? "hfs-9 tracking-[0.12em]" : "hfs-11",
  }[size];

  return (
    <h2
      className={`font-heading font-bold break-after-avoid text-(--heading) ${isCaps ? "uppercase" : ""} ${sizeClass} ${className}`}
      {...rest}
    >
      {children}
    </h2>
  );
}

// A link if there's an href, plain text otherwise (thumbnails have no links)
export function MaybeLink({ href, className = "", children }) {
  return href ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  );
}

// Bullet points: each one is its own block, so long lists can continue on the next page.
// The marker (•, –, ▸ or none) comes from the design's --bullet variable.
export function BulletList({ items, className = "", itemClassName = "", flow }) {
  if (items.length === 0) return null;

  return (
    <ul className={`list-(--bullet) ${className}`}>
      {items.map((item, index) => (
        <li key={index} data-block data-flow={flow} className={itemClassName}>
          {item}
        </li>
      ))}
    </ul>
  );
}

// Skills in the design's chosen style ("comma", "tags" or "bullets"). When the design
// doesn't choose (display = null), the layout's own style is used:
//   defaultDisplay - "list" (joined with `separator`) or "tags"
//   listClassName / tagsClassName / tagClassName / bulletClassName - the layout's styling
export function Skills({
  skills,
  display,
  defaultDisplay = "list",
  separator = ", ",
  listClassName,
  tagsClassName = "flex flex-wrap gap-[4pt]",
  tagClassName = "rounded-[3pt] bg-(--soft) px-[5pt] py-[1pt] fs-9 text-(--accent)",
  bulletClassName = "space-y-[calc(2pt*var(--bullet-space,1))] pl-[13pt] marker:text-(--accent)",
  flow,
}) {
  const style = display ?? defaultDisplay;

  if (style === "bullets") return <BulletList items={skills} className={bulletClassName} flow={flow} />;
  if (style === "tags") {
    return (
      <ul className={tagsClassName} data-block data-flow={flow}>
        {skills.map((skill, index) => (
          <li key={`${skill}-${index}`} className={tagClassName}>
            {skill}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className={listClassName} data-block data-flow={flow}>
      {skills.join(style === "comma" ? ", " : separator)}
    </p>
  );
}

// Section placement for single-column layouts: in order, or in two columns
// (side column first, at the design's width ratio) when the design asks for them.
//   render(section, column) - draws one section; column is "main", "side" or "all" (spans both)
// data-column tells pagination which column a block is in, so each one breaks independently.
export function SectionColumns({ data, render }) {
  const { twoColumns, lead, main, side } = splitSections(data);
  if (!twoColumns) return main.map((section) => render(section, "main"));

  return (
    <>
      {lead && <div data-column="all">{render(lead, "all")}</div>}
      <div className="grid gap-x-[6mm]" style={{ gridTemplateColumns: `${data.sideRatio}fr ${100 - data.sideRatio}fr` }}>
        <div className="min-w-0" data-column="side">
          {side.map((section) => render(section, "side"))}
        </div>
        <div className="divider-l min-w-0 pl-[6mm]" data-column="main">
          {main.map((section) => render(section, "main"))}
        </div>
      </div>
    </>
  );
}
