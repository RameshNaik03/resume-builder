import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// The quiet "← Somewhere" link above a page's title: a Link (to) or a button (onClick)
export default function BackLink({ to, onClick, children }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-sm type-small font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const content = (
    <>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </>
  );
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
