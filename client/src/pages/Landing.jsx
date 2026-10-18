import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Eye,
  FileText,
  LayoutTemplate,
  ScanSearch,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import PublicNavbar from "../components/PublicNavbar";
import Logo from "../components/Logo";
import { TEMPLATES } from "../templates/registry";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Instant ATS check",
    text: "Paste a job posting and see which keywords your resume covers and which ones it's missing.",
  },
  {
    icon: LayoutTemplate,
    title: "Clean, readable templates",
    text: "Start from a clean, readable layout and switch designs at any time without retyping a thing.",
  },
  {
    icon: Eye,
    title: "Live preview",
    text: "Every edit shows up on the page as you type, so you always know exactly what you'll send.",
  },
  {
    icon: Upload,
    title: "Import what you have",
    text: "Upload an existing resume and pick up where you left off instead of starting from zero.",
  },
  {
    icon: Wand2,
    title: "Guided sections",
    text: "Experience, skills, projects and education, laid out in the order hiring managers expect.",
  },
  {
    icon: Download,
    title: "One-click PDF",
    text: "Download a crisp, print-ready PDF that keeps its formatting on any device.",
  },
];

const STEPS = [
  { title: "Pick a template", text: "Choose a layout that suits your field. You can change it later." },
  { title: "Fill in your details", text: "Add your experience and skills while the preview updates beside you." },
  { title: "Check & download", text: "Run the ATS check, polish the gaps, then export your PDF." },
];

const CURRENT_YEAR = new Date().getFullYear();

function GradientText({ children }) {
  return (
    <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-300">
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}

export default function Landing() {
  usePageTitle("Build an ATS-Ready Resume");
  const { user } = useAuth();
  const buildPath = user ? "/dashboard" : "/register";

  const trustBadges = [
    { icon: BadgeCheck, label: "Free to use" },
    { icon: FileText, label: `${TEMPLATES.length} templates` },
    { icon: Download, label: "Export to PDF" },
  ];

  return (
    <div className="flex min-h-svh flex-col bg-white dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden bg-slate-50 dark:bg-slate-950">
          {/* Soft colour glows (decorative) */}
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 size-120 translate-x-[-85%] rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-600/15" />
            <div className="absolute top-10 left-1/2 size-104 translate-x-[-10%] rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-600/15" />
            <div className="absolute -bottom-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/10" />
          </div>

          <div className="mx-auto max-w-5xl px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28 sm:pb-32">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur sm:text-sm dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Sparkles className="size-4" aria-hidden="true" />
              Smart Resume Tools
            </p>

            <h1 className="mt-8 font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
              Build an <GradientText>ATS-Ready</GradientText> Resume
              <br className="hidden sm:block" /> & <GradientText>Check It</GradientText> Instantly
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-pretty text-slate-600 sm:text-lg dark:text-slate-400">
              Write a resume that gets past the{" "}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">screening software</span> and in front of
              a real person, then <span className="font-semibold text-cyan-600 dark:text-cyan-400">score it against any job</span>{" "}
              in seconds.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/ats-checker"
                className="btn-primary px-7 py-3.5 text-base shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/10"
              >
                Check My Resume
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </Link>
              <Link to={buildPath} className="btn-secondary px-7 py-3.5 text-base">
                Build My Resume
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-slate-400">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="size-4.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to land the interview"
            text="Simple tools that take the guesswork out of writing, formatting and tailoring your resume."
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="card p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:hover:border-indigo-900"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="From blank page to ready-to-send in three steps"
              text="No design skills needed. Just your experience and a few minutes."
            />

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative text-center md:text-left">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 font-display text-lg font-extrabold text-white shadow-md shadow-indigo-600/20 md:mx-0">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">{step.text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-14 text-center">
              <Link to={buildPath} className="btn-primary px-7 py-3 text-base">
                Start building, it's free
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="bg-white dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row lg:px-8">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
            <Link to="/register" className="hover:text-slate-900 dark:hover:text-white">Resume Builder</Link>
            <Link to="/templates" className="hover:text-slate-900 dark:hover:text-white">Templates</Link>
            <Link to="/ats-checker" className="hover:text-slate-900 dark:hover:text-white">ATS Checker</Link>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">Log in</Link>
          </nav>
          <p className="text-sm text-slate-500">© {CURRENT_YEAR} ResumeCraft</p>
        </div>
      </footer>
    </div>
  );
}
