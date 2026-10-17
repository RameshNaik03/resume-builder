import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

// Shown for any URL that doesn't match a route
export default function NotFound() {
  usePageTitle("Page not found");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="text-center">
        <p className="bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link to="/" className="btn-primary mt-8 px-6 py-2.5">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
