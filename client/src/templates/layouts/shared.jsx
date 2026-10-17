// Small building blocks shared by all layouts.
// Colours come from CSS variables set by TemplateRenderer: --accent, --text, --muted, --line

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
export function SectionTitle({ theme, size = "md", className = "", children }) {
  const isCaps = theme.headingStyle === "caps";
  const sizeClass = {
    md: isCaps ? "text-[10.5pt] tracking-[0.12em]" : "text-[12.5pt]",
    sm: isCaps ? "text-[9pt] tracking-[0.12em]" : "text-[11pt]",
  }[size];

  return (
    <h2 className={`font-bold break-after-avoid text-(--accent) ${isCaps ? "uppercase" : ""} ${sizeClass} ${className}`}>
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
