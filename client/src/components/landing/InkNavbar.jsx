import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";
import Wordmark from "./Wordmark";

const linkClass =
  "text-sm text-ink/75 underline-offset-[6px] decoration-tomato decoration-2 transition hover:text-ink hover:underline";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tomato";

// Top bar for the "Paper & Ink" landing page
export default function InkNavbar() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const buildPath = user ? "/dashboard" : "/register";

  const links = [
    { label: "Builder", to: buildPath },
    { label: "Templates", href: "#templates" }, // The templates strip further down this page
    { label: "ATS Checker", to: "/ats-checker" },
  ];

  const renderLink = (link, extra = "") =>
    link.href ? (
      <a key={link.label} href={link.href} className={`${linkClass} ${focusRing} ${extra}`}>
        {link.label}
      </a>
    ) : (
      <Link key={link.label} to={link.to} className={`${linkClass} ${focusRing} ${extra}`}>
        {link.label}
      </Link>
    );

  return (
    <header className="relative z-20 border-b border-ink/15">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />

        <div className="hidden items-center gap-8 md:flex">{links.map((link) => renderLink(link))}</div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle
            className={`grid size-9 place-items-center rounded-full text-ink/75 transition hover:bg-ink/5 hover:text-ink ${focusRing}`}
          />
          <Link
            to={buildPath}
            className={`hidden border-2 border-ink px-4 py-2 font-ink-mono text-xs font-medium uppercase tracking-wider text-ink shadow-[3px_3px_0_0_var(--color-ink)] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:inline-block ${focusRing}`}
          >
            Start writing →
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="ink-mobile-menu"
            className={`grid size-9 place-items-center text-ink md:hidden ${focusRing}`}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu (closes when a link inside it is tapped) */}
      {menuOpen && (
        <div
          id="ink-mobile-menu"
          onClick={(event) => event.target.closest("a") && setMenuOpen(false)}
          className="border-t border-ink/15 px-5 pt-2 pb-6 md:hidden"
        >
          <div className="flex flex-col divide-y divide-ink/10">
            {links.map((link) => renderLink(link, "py-3 text-base"))}
          </div>
          <Link
            to={buildPath}
            className={`mt-4 block border-2 border-ink px-4 py-3 text-center font-ink-mono text-xs font-medium uppercase tracking-wider text-ink ${focusRing}`}
          >
            Start writing →
          </Link>
        </div>
      )}
    </header>
  );
}
