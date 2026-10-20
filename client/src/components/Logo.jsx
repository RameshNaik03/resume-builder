import { Link } from "react-router-dom";

// Icon: a page with a folded corner and a check mark, on a blue→indigo tile
function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
      <path d="M11 8h7l5 5v11a1 1 0 0 1-1 1H11a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="white" />
      <path d="M18 8v4a1 1 0 0 0 1 1h4" fill="#c7d2fe" />
      <path d="m13 18.5 2.2 2.2 4.3-4.4" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// hideNameOnTinyScreens: drop the name on very narrow phones so buttons beside it still fit
export default function Logo({ hideNameOnTinyScreens = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
      <LogoMark />
      <span className={hideNameOnTinyScreens ? "max-[400px]:sr-only" : ""}>
        Resume<span className="text-indigo-600 dark:text-indigo-400">Craft</span>
      </span>
    </Link>
  );
}
