import { startTransition, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FileSearch, House, LayoutDashboard, LogOut, Menu as MenuIcon, Moon, Settings, Sun, Target } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { getTheme, setTheme, subscribe } from "../../utils/theme";
import ErrorBoundary from "../ErrorBoundary";
import Avatar from "./Avatar";
import Button from "./Button";
import Menu from "./Menu";
import Wordmark from "./Wordmark";

// The frame of every page except the sign-in pages (see AuthLayout): one top navigation and
// the page below it.
//   Logged in:  the wordmark, Dashboard / Tailor to a job / ATS checker, the dark mode toggle and
//               the account menu (avatar, name, email, Settings, log out). Below 768px the links
//               move into the menu.
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
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const theme = useSyncExternalStore(subscribe, getTheme);
  const isDark = theme === "dark";

  // Switches at once; for a logged-in user the choice is also saved to their account (Settings >
  // Preferences), so it follows them to other devices
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    if (user) {
      api
        .patch("/account/preferences", { theme: next })
        .then(({ data }) => updateUser(data.user))
        .catch(() => {}); // Still switched on this device
    }
  };

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
          <Button variant="ghost" iconOnly icon={isDark ? Sun : Moon} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} title={isDark ? "Light mode" : "Dark mode"} onClick={toggleTheme} />
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

// The user's avatar (or initials) and, from 1024px, their first name; the menu holds their
// avatar, name and email, the main links (on phones and tablets, where the bar has no room for
// them), Home (the landing page: the logo goes to the dashboard when logged in), Settings and
// Log out
function UserMenu({ user, onLogout }) {
  const firstName = user.name.split(/\s+/)[0];
  return (
    <Menu
      label="Account menu"
      triggerClassName="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:pr-3"
      trigger={
        <>
          <Avatar user={user} />
          <span className="hidden max-w-32 truncate type-label text-fg lg:inline">{firstName}</span>
          <MenuIcon className="mr-1.5 size-4 text-fg-muted md:hidden" aria-hidden="true" />
        </>
      }
      header={
        <div className="flex items-center gap-3">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate type-label text-fg">{user.name}</p>
            <p className="truncate type-small text-fg-muted">{user.email}</p>
          </div>
        </div>
      }
      items={[
        ...NAV.map(({ to, label, icon }) => ({ to, label, icon, className: "md:hidden" })),
        { divider: true, className: "md:hidden" },
        { to: "/", label: "Home", icon: House },
        { to: "/settings", label: "Settings", icon: Settings },
        { label: "Log out", icon: LogOut, onClick: onLogout },
      ]}
    />
  );
}
