// Small building blocks shared by all layouts.
// Colours come from CSS variables set by TemplateRenderer: --accent, --text, --muted, --line
//
// Page breaks (see templates/pagination.js): mark each piece that must not be split
// across pages with data-block, add data-keep to headings so they stay with what follows,
// and keep blocks free of backgrounds/borders on top (blocks get extra top padding
// when they're moved to the next page).

// "email · phone · location ..." with clickable links where available
export function ContactLine({ contacts, separator = "·", className = "" }) {
  if (contacts.length === 0) return null;

  return (
    <p className={className}>
      {contacts.map((item, index) => (
        // whitespace-nowrap: wrap between items, never inside one (e.g. "Austin, / TX")
        <span key={item.text} className="whitespace-nowrap">
          {index > 0 && <span className="mx-[5pt] opacity-60">{separator}</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-(--accent)">
              {item.text}
            </a>
          ) : (
            item.text
          )}
        </span>
      ))}
    </p>
  );
}

// Section heading that follows the theme's heading style ("caps" or "title")
export function SectionTitle({ theme, size = "md", className = "", children, ...rest }) {
  const isCaps = theme.headingStyle === "caps";
  const sizeClass = {
    md: isCaps ? "text-[10.5pt] tracking-[0.12em]" : "text-[12.5pt]",
    sm: isCaps ? "text-[9pt] tracking-[0.12em]" : "text-[11pt]",
  }[size];

  return (
    <h2
      className={`font-bold break-after-avoid text-(--accent) ${isCaps ? "uppercase" : ""} ${sizeClass} ${className}`}
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

// Bullet points: each one is its own block, so long lists can continue on the next page
export function BulletList({ items, className = "", itemClassName = "", flow }) {
  if (items.length === 0) return null;

  return (
    <ul className={`list-disc ${className}`}>
      {items.map((item, index) => (
        <li key={index} data-block data-flow={flow} className={itemClassName}>
          {item}
        </li>
      ))}
    </ul>
  );
}
