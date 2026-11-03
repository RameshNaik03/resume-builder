// Small building blocks shared by the layouts (the rest lives in templates/foundation).
// Colours and sizes come from CSS variables set by TemplateRenderer (see templates/design.js).
//
// Page breaks (see templates/pagination.js): mark each piece that must not be split
// across pages with data-block, add data-keep to headings so they stay with what follows,
// and keep blocks free of backgrounds/borders on top (blocks get extra top padding
// when they're moved to the next page).

import { splitSections } from "./sectionLayout";

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
// The column divider is drawn by the side column (data-fill-page: it reaches the bottom of the
// last page its content is on, never an empty page after it, see templates/pagination.js).
export function SectionColumns({ data, render }) {
  const { twoColumns, lead, main, side } = splitSections(data);
  if (!twoColumns) return main.map((section) => render(section, "main"));

  return (
    <>
      {lead && <div data-column="all">{render(lead, "all")}</div>}
      <div className="grid" style={{ gridTemplateColumns: `${data.sideRatio}fr ${100 - data.sideRatio}fr` }}>
        <div className="divider-r min-w-0 self-start pr-[6mm]" data-column="side" data-fill-page>
          {side.map((section) => render(section, "side"))}
        </div>
        <div className="min-w-0 pl-[6mm]" data-column="main">
          {main.map((section) => render(section, "main"))}
        </div>
      </div>
    </>
  );
}
