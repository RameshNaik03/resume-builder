import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import usePageTitle from "../hooks/usePageTitle";
import Button from "../components/ui/Button";
import { pageClass } from "../components/ui/pageLayout";

// Shown for any URL that doesn't match a route
export default function NotFound() {
  usePageTitle("Page not found");

  return (
    <div className={pageClass("narrow", "text-center")}>
      <p className="type-eyebrow text-fg-muted">Error 404</p>
      <h1 className="mt-3 type-h1 text-fg">This page doesn't exist</h1>
      <p className="mt-3 type-body text-fg-muted">The link may be old, or the address mistyped. Everything you've saved is still where you left it.</p>
      <Button as={Link} to="/" variant="primary" icon={ArrowLeft} className="mt-8">
        Back to home
      </Button>
    </div>
  );
}
