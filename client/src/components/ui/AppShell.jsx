import { startTransition, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FileSearch, LayoutDashboard, LogOut, Menu as MenuIcon, Moon, Sun, Target } from "lucide-react";
import toast from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { getTheme, setTheme, subscribe } from "../../utils/theme";
import ErrorBoundary from "../ErrorBoundary";
import Button from "./Button";
import Menu from "./Menu";
import Wordmark from "./Wordmark";

// The frame of every page except the sign-in pages (see AuthLayout): one top navigation and
// the page below it.
//   Logged in:  the wordmark, Dashboard / Tailor to a job / ATS checker, the dark mode toggle and
//               the user menu (name, email, log out). Below 768px the links move into the menu.
//   Logged out: the wordmark, the dark mode toggle, Log in and Sign up.
// The bar is 4rem tall and sticky; the editor's and cover letter's toolbars stick below it (top-16).
// Pages set their own width with <Page> (components/ui/Page.jsx).
const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tailor", label: "Tailor to a job", icon: Target },
  { to: "/ats-checker", label: "ATS checker", icon: FileSearch },
];

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <TopBar />
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useSyncExternalStore(subscribe, getTheme);
  const isDark = theme === "dark";

  // Home and logged out in one render: React Router's navigation is a transition, so logging
  // out outside it would first re-render the current (logged-in only) page, which redirects to
  // the login page
  const handleLogout = () => {
    startTransition(() => {
      navigate("/");
      logout();
    });
    toast.success("You've been logged out");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-8">
        <Wordmark to={user ? "/dashboard" : "/"} />

        {user && (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 type-label transition-colors focus-visible:outline-2 focus-visible:outline-accent ${isActive ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" iconOnly icon={isDark ? Sun : Moon} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} title={isDark ? "Light mode" : "Dark mode"} onClick={() => setTheme(isDark ? "light" : "dark")} />
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">
                Log in
              </Button>
              <Button as={Link} to="/register" variant="primary">
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// The user's initials in a circle; the menu holds their name and email, the main links (on
// phones and tablets, where the bar has no room for them) and Log out
function UserMenu({ user, onLogout }) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  return (
    <Menu
      label="Account menu"
      triggerClassName="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      trigger={
        <>
          <span className="grid size-8 place-items-center rounded-full border border-line bg-surface-2 type-small font-semibold text-fg">{initials || "?"}</span>
          <MenuIcon className="mr-1.5 size-4 text-fg-muted md:hidden" aria-hidden="true" />
        </>
      }
      header={
        <>
          <p className="truncate type-label text-fg">{user.name}</p>
          <p className="truncate type-small text-fg-muted">{user.email}</p>
        </>
      }
      items={[
        ...NAV.map(({ to, label, icon }) => ({ to, label, icon, className: "md:hidden" })),
        { divider: true, className: "md:hidden" },
        { label: "Log out", icon: LogOut, onClick: onLogout },
      ]}
    />
  );
}
