import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/"); // Go home first so we don't land on the login page
    logout();
    toast.success("You've been logged out");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            R
          </span>
          {/* Hide the name on very narrow phones so the buttons fit */}
          <span className="max-[400px]:sr-only">ResumeCraft</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"}`
              }
            >
              Dashboard
            </NavLink>
            <span className="hidden text-sm text-slate-500 sm:inline">Hi, {user.name.split(" ")[0]}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
