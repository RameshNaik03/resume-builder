import { useSyncExternalStore } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { getTheme, setTheme, subscribe } from "../../utils/theme";
import ErrorBoundary from "../ErrorBoundary";
import Button from "./Button";
import Wordmark from "./Wordmark";

// The frame of the sign-in pages (log in, sign up, forgot and reset password): no navigation,
// just the wordmark (home) above one narrow card, and the dark mode toggle in the corner.
// Each page draws its card with AuthCard.
export default function AuthLayout() {
  const { pathname } = useLocation();
  const theme = useSyncExternalStore(subscribe, getTheme);
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <div className="flex justify-end px-4 pt-4 sm:px-6">
        <Button variant="ghost" iconOnly icon={isDark ? Sun : Moon} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} title={isDark ? "Light mode" : "Dark mode"} onClick={() => setTheme(isDark ? "light" : "dark")} />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-16 sm:pt-12">
        <Wordmark size="lg" className="self-center" />
        <div className="mt-8">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
