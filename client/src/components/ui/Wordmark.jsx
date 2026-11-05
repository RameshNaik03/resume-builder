import { Link } from "react-router-dom";

// The ResumeCraft logo: the name set in the title serif, nothing else. One logo everywhere
// (the AppShell, the landing page, the sign-in pages).
//   to   - where it links (home by default)
//   size - "md" (the top bar) or "lg" (above the sign-in card, the footer)
const SIZES = { md: "text-xl", lg: "text-2xl" };

export default function Wordmark({ to = "/", size = "md", className = "" }) {
  return (
    <Link
      to={to}
      className={`shrink-0 rounded-sm font-title font-medium text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${SIZES[size]} ${className}`}
    >
      ResumeCraft
    </Link>
  );
}
