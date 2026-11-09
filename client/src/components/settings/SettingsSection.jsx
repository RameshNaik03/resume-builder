import { useId } from "react";

// One settings section: its heading and one-line description, then its content (cards).
// The heading is an h2 (the page's h1 is "Settings").
export default function SettingsSection({ title, description, children }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="min-w-0">
      <h2 id={id} className="type-h2 text-fg">
        {title}
      </h2>
      {description && <p className="mt-1 type-body text-fg-muted">{description}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}
