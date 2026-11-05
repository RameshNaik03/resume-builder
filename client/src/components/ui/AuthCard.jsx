import { Alert, Card } from "./Display";

// One sign-in page's card (inside AuthLayout): the title (serif), one line under it, an error
// from the server (if any), the form, and a footer line (e.g. "Don't have an account? Sign up").
//   icon - optional, for message screens ("Check your email"): a quiet circle above the title
export default function AuthCard({ title, description, icon: Icon, error, footer, children }) {
  return (
    <>
      <Card className={Icon ? "text-center" : ""}>
        {Icon && (
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <h1 className="type-h2 text-fg">{title}</h1>
        {description && <div className="mt-1.5 type-body text-fg-muted">{description}</div>}
        {error && (
          <div className="mt-5 text-left">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </Card>
      {footer && <p className="mt-6 text-center type-body text-fg-muted">{footer}</p>}
    </>
  );
}
