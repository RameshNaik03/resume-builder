import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import Menu from "./ui/Menu";
import ResumeThumbnail from "./ui/ResumeThumbnail";

// The dashboard's card for a resume or an application: the resume's real first page on top,
// then its title (the whole card opens `to`), one line of detail, a badge and an actions menu.
//   resume   - the resume drawn in the thumbnail (with its template and design)
//   title / meta / badge - the text under the thumbnail (badge: an element, e.g. <Badge>)
//   menuItems - the Menu's items (see ui/Menu.jsx); selected / onSelect - the bulk checkbox
//   linkProps - extra props for the title link (e.g. a title attribute)
//   thumbnail - something else to show in place of the resume's page (e.g. an uploaded original)
export default function DocumentCard({ resume, to, title, meta, badge, menuItems, selected = false, onSelect, linkProps = {}, thumbnail, ...props }) {
  return (
    <article
      className={`group relative flex flex-col rounded-xl border bg-surface shadow-soft transition hover:border-line-strong hover:shadow-raised ${selected ? "border-accent" : "border-line"}`}
      {...props}
    >
      <div className="flex h-52 justify-center overflow-hidden rounded-t-xl border-b border-line bg-surface-2 px-6 pt-6">
        {thumbnail ?? (resume && <ResumeThumbnail resume={resume} templateId={resume.template} design={resume.design} width={196} className="transition-transform duration-300 motion-safe:group-hover:-translate-y-1" />)}
      </div>

      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          className="absolute top-3 left-3 z-10 size-4 accent-accent"
          aria-label={`Select ${title}`}
        />
      )}
      {badge && <div className="absolute top-3 right-3 z-10">{badge}</div>}

      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          {/* The ::after layer stretches this link over the whole card */}
          <Link to={to} className="block truncate type-label text-fg after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent" {...linkProps}>
            {title}
          </Link>
          {meta && <p className="mt-0.5 truncate type-small text-fg-muted">{meta}</p>}
        </div>
        <div className="relative z-10 -mt-1 -mr-1">
          <Menu
            label={`Actions for ${title}`}
            trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
            triggerClassName="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            items={menuItems}
          />
        </div>
      </div>
    </article>
  );
}

// A grey card with the same shape, shown while loading
export function DocumentCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface" aria-hidden="true">
      <div className="h-52 rounded-t-xl bg-surface-2 motion-safe:animate-pulse" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-surface-2" />
        <div className="h-3 w-1/3 rounded bg-surface-2" />
      </div>
    </div>
  );
}
