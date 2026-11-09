import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Gauge, LayoutTemplate, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import { TEMPLATES } from "../templates/registry";
import galleryResume from "../templates/galleryResume";
import Button from "../components/ui/Button";
import { Alert } from "../components/ui/Display";
import Wordmark from "../components/ui/Wordmark";
import ResumeThumbnail from "../components/ui/ResumeThumbnail";

// The home page (inside the AppShell, so it shares the top bar and logo with every page).
// Calm and static: a serif headline, one primary action, real template thumbnails, how it
// works, what makes the app different, and a footer. The only motion is a gentle fade-in on
// load, skipped with reduced motion.

const CURRENT_YEAR = new Date().getFullYear();
const SECTION = "mx-auto w-full max-w-6xl px-4 sm:px-8";
// The hero's three thumbnails: a full sample resume in three templates, the middle one in front
const HERO = [
  { id: "elegant-serif-forest", width: 210, className: "-mr-28 mt-12 hidden sm:block" },
  { id: "classic-navy", width: 300, className: "relative z-10" },
  { id: "executive-burgundy", width: 210, className: "-ml-28 mt-12 hidden sm:block" },
].map((entry) => ({ ...entry, resume: galleryResume(entry.id, false) }));

const STEPS = [
  { title: "Write", text: "Fill in one section at a time while your page takes shape beside you. Everything saves as you type." },
  { title: "Choose a template", text: `Pick from ${TEMPLATES.length} professional templates. Your words stay put; only the typesetting changes.` },
  { title: "Check and send", text: "See how an applicant tracking system reads it, tailor it to the job, and download a clean PDF." },
];

const DIFFERENCES = [
  {
    icon: Gauge,
    title: "Honest ATS scoring",
    text: "A score out of 100 from rules you can read, with every check explained and what to fix first. No black box and no scare tactics.",
  },
  {
    icon: Target,
    title: "Tailoring without invented facts",
    text: "Your resume is reordered and reworded around each job, but nothing is added that it doesn't already show. Missing skills are listed for you to decide.",
  },
  {
    icon: LayoutTemplate,
    title: "Professional templates",
    text: "Typeset like a printed page, with the ATS-friendly layouts clearly marked. The PDF you download matches the preview exactly.",
  },
];

export default function Landing() {
  usePageTitle("Clear, honest resumes");
  const { user } = useAuth();
  const buildPath = user ? "/dashboard" : "/register";
  const location = useLocation();
  const navigate = useNavigate();
  // Set by Settings > Your data after deleting the account (cleared when dismissed)
  const accountDeleted = location.state?.notice === "account-deleted";

  return (
    <>
      {accountDeleted && (
        <div className={`${SECTION} pt-6`}>
          <Alert tone="success" title="Your account has been deleted" onDismiss={() => navigate(".", { replace: true, state: null })} data-testid="account-deleted-notice">
            Your account and everything in it are gone for good. We've sent a confirmation to your email. Thanks for using ResumeCraft.
          </Alert>
        </div>
      )}

      {/* ---------- Hero ---------- */}
      <section className={`${SECTION} grid items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-16 lg:pt-24 lg:pb-28`}>
        <div className="motion-safe:animate-fade-in">
          <p className="type-eyebrow text-fg-muted">Resume builder · ATS checker · Job tailoring</p>
          <h1 className="mt-5 type-hero text-balance text-fg">A resume that's clear, honest and ready to send.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-fg-muted">
            Write it once, set it in a professional template, and check it against the job before you apply. Free to use.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
            <Button as={Link} to={buildPath} variant="primary" size="lg">
              Build my resume
            </Button>
            <Link to="/ats-checker" className="group inline-flex items-center gap-1.5 rounded-sm type-label text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              Check my resume against a job
              <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Three real templates, filled with a sample resume: static, the middle one in front */}
        <figure className="motion-safe:animate-fade-in">
          <div className="flex items-start justify-center" aria-hidden="true">
            {HERO.map(({ id, width, className, resume }) => (
              <ResumeThumbnail key={id} resume={resume} templateId={id} width={width} className={className} />
            ))}
          </div>
          <figcaption className="mt-8 text-center type-small text-fg-muted">Real templates, drawn by the same engine as your PDF.</figcaption>
        </figure>
      </section>

      {/* ---------- How it works ---------- */}
      <section aria-labelledby="how-it-works" className="border-t border-line">
        <div className={`${SECTION} py-20 sm:py-24`}>
          <h2 id="how-it-works" className="type-h2 text-fg">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t border-line pt-5">
                <p className="font-title text-3xl text-fg-subtle tabular-nums" aria-hidden="true">
                  {index + 1}
                </p>
                <h3 className="mt-3 type-h3 text-fg">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 type-body text-fg-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- What makes it different ---------- */}
      <section aria-labelledby="different" className="border-t border-line bg-surface-2">
        <div className={`${SECTION} py-20 sm:py-24`}>
          <h2 id="different" className="type-h2 text-fg">
            What makes it different
          </h2>
          <p className="mt-3 max-w-2xl type-body text-fg-muted">A resume tool that keeps to the facts: yours.</p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {DIFFERENCES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-line bg-surface p-6 shadow-soft">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-fg">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 type-h3 text-fg">{title}</h3>
                <p className="mt-2 type-body text-fg-muted">{text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <Button as={Link} to={buildPath} variant="primary" size="lg">
              Build my resume
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-line">
        <div className={`${SECTION} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <Wordmark />
            <p className="mt-1 type-small text-fg-muted">Clear, honest resumes. © {CURRENT_YEAR}</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 type-label">
            <Link to={buildPath} className="text-fg-muted hover:text-fg">
              Build my resume
            </Link>
            <Link to="/ats-checker" className="text-fg-muted hover:text-fg">
              ATS checker
            </Link>
            {!user && (
              <Link to="/login" className="text-fg-muted hover:text-fg">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </footer>
    </>
  );
}
