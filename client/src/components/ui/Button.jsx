import { Loader2 } from "lucide-react";

// The "quiet professional" button.
//   variant - "primary" (one per view: the main action), "secondary", "ghost" (toolbars), "ghostDanger"
//             (a quiet remove icon in a list row),
//             "danger" (destructive, after a confirmation), "link" (inline text action)
//   size    - "sm" (32px: cards, toolbars), "md" (36px: default), "lg" (44px: page actions)
//   icon    - a lucide icon component shown before the label; iconOnly needs an aria-label
//   loading - shows a spinner and disables the button
// Renders a <button>, or the `as` element (e.g. Link) with the same look.
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";
const VARIANTS = {
  primary: "rounded-lg bg-accent text-on-accent shadow-soft hover:bg-accent-strong",
  secondary: "rounded-lg border border-line-strong bg-surface text-fg hover:border-fg-subtle hover:bg-surface-2",
  ghost: "rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg",
  ghostDanger: "rounded-lg text-fg-muted hover:bg-danger-soft hover:text-danger", // A quiet remove / delete icon in a row
  danger: "rounded-lg border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
  link: "rounded-sm text-accent underline-offset-4 hover:underline",
};
const SIZES = {
  sm: "h-8 px-3 text-[0.8125rem] [&_svg]:size-3.5",
  md: "h-9 px-4 text-sm [&_svg]:size-4",
  lg: "h-11 px-5 text-[0.9375rem] [&_svg]:size-4",
};
// Square, instead of the size's padding (both would conflict)
const ICON_ONLY = { sm: "size-8 [&_svg]:size-3.5", md: "size-9 [&_svg]:size-4", lg: "size-11 [&_svg]:size-4" };

export default function Button({ as: Element = "button", variant = "secondary", size = "md", icon: Icon, iconOnly = false, loading = false, className = "", children, ...props }) {
  const sizing = variant === "link" ? "" : iconOnly ? ICON_ONLY[size] : SIZES[size];
  const classes = [BASE, VARIANTS[variant], sizing, className].join(" ");
  const buttonProps = Element === "button" ? { type: "button", disabled: loading || props.disabled } : {};
  return (
    <Element className={classes} aria-busy={loading || undefined} {...buttonProps} {...props}>
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : Icon && <Icon aria-hidden="true" />}
      {!iconOnly && children}
    </Element>
  );
}
