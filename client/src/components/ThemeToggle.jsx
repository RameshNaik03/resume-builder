import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, setTheme, subscribe } from "../utils/theme";

const DEFAULT_CLASSES =
  "grid size-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

// className replaces the default look (e.g. the landing page's ink style)
export default function ThemeToggle({ className = DEFAULT_CLASSES }) {
  const theme = useSyncExternalStore(subscribe, getTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={className}
    >
      {isDark ? <Sun className="size-4.5" aria-hidden="true" /> : <Moon className="size-4.5" aria-hidden="true" />}
    </button>
  );
}
