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

// "email · phone · location ..." with clickable links where available.
// ATS-safe text (applies to every layout): no letter-spacing on text an ATS must read
// (PDF text extraction turns it into "S U M M A R Y"), and no `opacity`, `relative` or
// `absolute` on text: those make the browser paint it in a later layer, so PDF text
// extraction reads it out of order (e.g. all separators at the end of the page).
// Fade text with a semi-transparent colour (text-current/60) instead.
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
            {index < contacts.length - 1 && <Separator type={separator} />}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

// Contact line separators are drawn shapes, not text characters: a "·" or "|" in the text
// would end up in what an ATS reads (stray at the end of a wrapped line, for example).
//   type - "·" (dot), "|" (bar) or "/" (slash)
const SEPARATOR_SHAPES = {
  "·": "size-[2.5pt] rounded-full",
  "|": "h-[0.85em] w-[0.75pt]",
  "/": "h-[0.95em] w-[0.75pt] rotate-[20deg]",
};
function Separator({ type }) {
  const shape = SEPARATOR_SHAPES[type.trim()] ?? SEPARATOR_SHAPES["·"];
  return <span aria-hidden="true" className={`mx-[5pt] inline-block bg-current align-middle opacity-60 ${shape}`} />;
}

// Section heading that follows the theme's heading style ("caps" or "title").
// No letter-spacing, so an ATS reads "SUMMARY" rather than "S U M M A R Y".
export function SectionTitle({ theme, size = "md", className = "", children, ...rest }) {
  const isCaps = theme.headingStyle === "caps";
  const sizeClass = {
    md: isCaps ? "hfs-10.5" : "hfs-12.5",
    sm: isCaps ? "hfs-9" : "hfs-11",
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

// Rich text (summary, project descriptions): HTML that prepareResume already sanitized.
// A <div>, because the HTML can contain paragraphs.
export function RichText({ html, className = "", ...rest }) {
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} {...rest} />;
}

// The optional line under a job header naming the product or project, e.g.
// "Acme Pay, a payments app (React, Node.js)". It's a block that stays with the first bullet.
export function JobSubtitle({ text, className = "" }) {
  if (!text) return null;
  return (
    <p className={`mt-[1pt] fs-9.5 text-(--muted) italic ${className}`} data-block data-keep>
      {text}
    </p>
  );
}

// Bullet points: each one is its own block, so long lists can continue on the next page.
// The marker (•, –, ▸ or none) comes from the design's --bullet variable.
//   rich - the items are sanitized HTML (job bullet points) rather than plain text
export function BulletList({ items, className = "", itemClassName = "", flow, rich = false }) {
  if (items.length === 0) return null;

  return (
    <ul className={`list-(--bullet) ${className}`}>
      {items.map((item, index) =>
        rich ? (
          <li
            key={index}
            data-block
            data-flow={flow}
            className={`rich-text ${itemClassName}`}
            dangerouslySetInnerHTML={{ __html: item }}
          />
        ) : (
          <li key={index} data-block data-flow={flow} className={itemClassName}>
            {item}
          </li>
        )
      )}
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

// The profile photo. It has a fixed size, so it never moves the layout (or the page
// breaks) while it loads, and object-fit: cover crops it neatly into its shape.
//   defaultBorderColor - used when the border is on but the design didn't pick a colour
export function Photo({ photo, defaultBorderColor = "var(--accent)", className = "", style }) {
  const size = `${photo.sizeMm}mm`;
  return (
    <img
      src={photo.url}
      alt={photo.alt}
      className={`block shrink-0 object-cover ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: photo.radius,
        border: photo.border ? `1.5pt solid ${photo.borderColor ?? defaultBorderColor}` : undefined,
        ...style,
      }}
    />
  );
}

// Puts the photo next to the header's text: to the left or right of it, or - when the
// header is centred - above it, so the name stays centred on the page.
// Renders just the children when there's no photo.
export function WithPhoto({ photo, align, defaultBorderColor, children }) {
  if (!photo) return children;

  if (align === "center") {
    return (
      <>
        <Photo photo={photo} defaultBorderColor={defaultBorderColor} className="mx-auto mb-[8pt]" />
        {children}
      </>
    );
  }

  return (
    <div className={`flex items-center gap-[6mm] ${photo.position === "right" ? "flex-row-reverse" : ""}`}>
      <Photo photo={photo} defaultBorderColor={defaultBorderColor} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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
