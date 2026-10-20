import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/"); // Go home first so we don't land on the login page
    logout();
    toast.success("You've been logged out");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo hideNameOnTinyScreens />

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`
              }
            >
              Dashboard
            </NavLink>
            <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">Hi, {user.name.split(" ")[0]}</span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-secondary">
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="btn-secondary">
              Log in
            </Link>
            <Link to="/register" className="btn-primary">
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
