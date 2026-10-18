import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { label: "Resume Builder", to: "/register" },
  { label: "Templates", to: "/templates" },
  { label: "ATS Checker", to: "/ats-checker" },
];

// Placeholder pages for now
const RESOURCE_LINKS = [
  { label: "Resume writing guide", to: "/resources/resume-guide" },
  { label: "Cover letter tips", to: "/resources/cover-letters" },
  { label: "Interview prep", to: "/resources/interviews" },
  { label: "Help center", to: "/resources/help" },
];

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "text-indigo-600 dark:text-indigo-400"
      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
  }`;

function ResourcesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        Resources
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
          {RESOURCE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PrivacyBadge() {
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 xl:inline-flex dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Your data stays private
    </span>
  );
}

export default function PublicNavbar() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const buildPath = user ? "/dashboard" : "/register";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          <ResourcesDropdown />
        </div>

        <div className="flex items-center gap-2">
          <PrivacyBadge />
          <ThemeToggle />
          <Link to={buildPath} className="btn-primary hidden sm:inline-flex">
            Build My Resume
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu (closes when any link inside it is tapped) */}
      {menuOpen && (
        <div
          id="mobile-menu"
          onClick={(event) => event.target.closest("a") && setMenuOpen(false)}
          className="border-t border-slate-200 px-4 pb-5 pt-3 lg:hidden dark:border-slate-800"
        >
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Resources
            </p>
            {RESOURCE_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Your data stays private
            </span>
            <Link to={buildPath} className="btn-primary w-full py-2.5">
              Build My Resume
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
