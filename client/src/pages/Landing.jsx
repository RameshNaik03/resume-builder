import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

// Animations use "motion-safe:", so they only run if the user hasn't turned on
// "reduce motion" in their system settings.
export default function Landing() {
  usePageTitle("Create a Resume That Stands Out");

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-indigo-950 text-white">
      {/* ---------- Background layers (decorative) ---------- */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* 1. Slowly moving gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-violet-800 to-fuchsia-700 bg-size-[300%_300%] motion-safe:animate-gradient-pan" />

        {/* 2. Large blurred colour blobs that drift around */}
        <div className="absolute -top-32 -left-24 size-112 rounded-full bg-violet-500/60 blur-3xl motion-safe:animate-blob sm:size-144" />
        <div className="absolute top-1/4 -right-32 size-104 rounded-full bg-pink-500/50 blur-3xl motion-safe:animate-blob motion-safe:[animation-delay:-8s] motion-safe:[animation-duration:26s] sm:size-136" />
        <div className="absolute -bottom-40 left-1/4 size-104 rounded-full bg-orange-400/45 blur-3xl motion-safe:animate-blob motion-safe:[animation-delay:-15s] motion-safe:[animation-duration:30s] sm:size-128" />

        {/* 3. Darker centre so the white text stays easy to read */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(30_10_60/0.55),transparent_70%)]" />

        {/* 4. Grid that fades out towards the edges, plus film grain */}
        <div className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay" />
      </div>

      {/* ---------- Top bar ---------- */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 motion-safe:animate-fade-up sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-bold text-indigo-700 shadow-lg shadow-black/20">
            R
          </span>
          ResumeCraft
        </Link>
        <Link
          to="/login"
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20"
        >
          Log in
        </Link>
      </header>

      {/* ---------- Hero ---------- */}
      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-md motion-safe:animate-fade-up motion-safe:[animation-delay:100ms] sm:text-sm">
            <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Free · ATS-friendly · Download as PDF
          </p>

          <h1 className="mt-7 text-4xl font-extrabold tracking-tight text-balance drop-shadow-sm motion-safe:animate-fade-up motion-safe:[animation-delay:200ms] sm:text-6xl lg:text-7xl">
            Create a Resume That{" "}
            <span className="bg-linear-to-r from-amber-200 via-pink-200 to-fuchsia-200 bg-clip-text text-transparent">
              Stands Out
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-white/80 motion-safe:animate-fade-up motion-safe:[animation-delay:300ms] sm:text-lg">
            Build a professional resume in minutes, see it update live, and download it as a PDF.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 motion-safe:animate-fade-up motion-safe:[animation-delay:400ms]">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-indigo-950 shadow-xl shadow-black/25 transition duration-300 hover:shadow-[0_0_40px_rgb(244_114_182/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-safe:hover:-translate-y-1 sm:px-10 sm:text-lg"
            >
              Build My Resume
              <span aria-hidden="true" className="transition-transform duration-300 motion-safe:group-hover:translate-x-1">
                →
              </span>
            </Link>

            <p className="text-sm text-white/70">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-white underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
