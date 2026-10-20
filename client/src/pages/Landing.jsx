import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import { TEMPLATES } from "../templates/registry";
import InkNavbar from "../components/landing/InkNavbar";
import HeroSheet from "../components/landing/HeroSheet";
import TemplateStrip from "../components/landing/TemplateStrip";
import Wordmark from "../components/landing/Wordmark";

const CURRENT_YEAR = new Date().getFullYear();
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tomato";

// ---------- Tiny line illustrations (ink strokes, currentColor) ----------

const lineArt = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function PenNib() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" {...lineArt}>
      <path d="M32 6 46 30 32 58 18 30Z" />
      <path d="M32 58V36" />
      <circle cx="32" cy="32" r="3.5" />
      <path d="M8 58h20" className="text-tomato" stroke="currentColor" />
    </svg>
  );
}

function TypeSpecimen() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" {...lineArt}>
      <rect x="6" y="10" width="34" height="44" />
      <path d="M14 42 23 20l9 22M17 35h12" />
      <path d="M48 14v36M44 14h8M44 50h8" />
      <circle cx="56" cy="32" r="2" className="text-tomato" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" {...lineArt}>
      <path d="M6 30 58 8 46 54 30 38Z" />
      <path d="M58 8 30 38v16l8-10" />
      <path d="M4 50c8-2 12-6 16-12" className="text-tomato" stroke="currentColor" strokeDasharray="2 4" />
    </svg>
  );
}

// "Your story, set in ink." with a hand-drawn red stroke under "ink"
function Headline() {
  return (
    <h1 className="font-ink-serif text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.03em] text-ink [font-variation-settings:'opsz'_144]">
      Your story,
      <br />
      set in{" "}
      <span className="relative inline-block italic">
        ink
        <svg
          viewBox="0 0 200 24"
          preserveAspectRatio="none"
          className="absolute -bottom-[0.12em] left-[-6%] h-[0.22em] w-[112%] overflow-visible text-tomato"
          aria-hidden="true"
        >
          <path
            d="M3 15C40 7 86 5 124 8c24 2 46 5 73 2"
            pathLength="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="1"
            className="motion-safe:animate-ink-draw"
          />
        </svg>
      </span>
      .
    </h1>
  );
}

function SectionLabel({ number, children }) {
  return (
    <p className="font-ink-mono text-xs uppercase tracking-[0.2em] text-ink/60">
      <span className="text-tomato">{number}</span> — {children}
    </p>
  );
}

export default function Landing() {
  usePageTitle("Your story, set in ink");
  const { user } = useAuth();
  const buildPath = user ? "/dashboard" : "/register";

  // Scroll-in: mark each [data-reveal] element "shown" the first time it comes into view.
  // (The fade itself is CSS in index.css, and is skipped with reduced motion.)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.dataset.reveal = "shown";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      number: "01",
      title: "Build",
      Illustration: PenNib,
      text: "Write section by section while the page sets itself beside you. Autosave keeps every word.",
    },
    {
      number: "02",
      title: "Style",
      Illustration: TypeSpecimen,
      text: `Try any of ${TEMPLATES.length} templates. Your words stay put. Only the typesetting changes.`,
    },
    {
      number: "03",
      title: "Send",
      Illustration: PaperPlane,
      text: "Check it against the job description, then download a clean PDF that ATS software can read.",
    },
  ];

  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-paper font-ink-sans text-ink selection:bg-tomato selection:text-carbon">
      {/* Paper grain over everything (decorative) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-paper-grain opacity-[0.28] mix-blend-multiply dark:opacity-[0.07] dark:mix-blend-screen"
      />

      <InkNavbar />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-5 pt-14 pb-24 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:pt-24 lg:pb-32">
          <div className="min-w-0" data-reveal>
            <p className="font-ink-mono text-xs uppercase tracking-[0.2em] text-ink/60">
              Resume builder <span className="text-tomato">/</span> ATS checker <span className="text-tomato">/</span> PDF
            </p>
            <div className="mt-8">
              <Headline />
            </div>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-ink/75">
              Write it once, set it beautifully, and check it against the job before you hit send. Free, and quietly
              careful about the details.
            </p>
            <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
              <Link
                to={buildPath}
                className={`border-2 border-carbon bg-tomato px-7 py-3.5 font-medium text-carbon shadow-[4px_4px_0_0_var(--color-ink)] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--color-ink)] active:translate-x-1 active:translate-y-1 active:shadow-none ${focusRing}`}
              >
                Start my resume
              </Link>
              <Link
                to="/ats-checker"
                className={`group text-ink underline decoration-ink/30 decoration-1 underline-offset-[6px] transition hover:decoration-tomato hover:decoration-2 ${focusRing}`}
              >
                Check my resume against a job{" "}
                <span aria-hidden="true" className="inline-block transition-transform motion-safe:group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Slightly lower than the headline, for an off-balance, hand-placed feel.
              min-w-0: the scaled A4 page inside is 794px wide before scaling, which would otherwise widen this column. */}
          <div className="min-w-0 lg:mt-16" data-reveal>
            <HeroSheet />
            <p className="mt-8 text-center font-ink-mono text-[11px] uppercase tracking-wider text-ink/60 lg:text-left">
              Live preview — drawn by the same template engine as the editor
            </p>
          </div>
        </section>

        {/* ---------- 01 Build / 02 Style / 03 Send ---------- */}
        <section className="border-y border-ink/15">
          <div className="mx-auto grid max-w-7xl divide-y divide-ink/15 md:grid-cols-3 md:divide-x md:divide-y-0">
            {steps.map(({ number, title, Illustration, text }, index) => (
              <div
                key={number}
                data-reveal
                style={{ transitionDelay: `${index * 120}ms` }}
                className="px-5 py-12 sm:px-8 md:py-16"
              >
                <SectionLabel number={number}>{title}</SectionLabel>
                <div className="mt-8 text-ink/80">
                  <Illustration />
                </div>
                <h2 className="mt-6 font-ink-serif text-3xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-3 max-w-xs leading-relaxed text-ink/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Templates strip ---------- */}
        <section id="templates" className="scroll-mt-6 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8" data-reveal>
            <SectionLabel number="04">Templates</SectionLabel>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-xl font-ink-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Same story, <span className="italic">different type.</span>
              </h2>
              <p className="max-w-sm text-ink/70">
                Every template below is rendered live from the real template set, filled with a sample resume.
              </p>
            </div>
          </div>
          <div className="mt-12" data-reveal>
            <TemplateStrip />
          </div>
        </section>

        {/* ---------- Pull quote ---------- */}
        <section className="border-t border-ink/15">
          <figure className="mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32 lg:pl-32" data-reveal>
            <span className="block font-ink-serif text-8xl leading-none text-tomato" aria-hidden="true">
              “
            </span>
            <blockquote className="-mt-6 font-ink-serif text-[clamp(2rem,5vw,3.75rem)] leading-[1.1] font-normal tracking-tight italic text-balance">
              Recruiters spend seconds on a resume. Make them count.
            </blockquote>
            <div className="mt-10 flex items-center gap-4">
              <span className="h-px w-16 bg-ink/40" aria-hidden="true" />
              <Link
                to={buildPath}
                className={`font-ink-mono text-xs uppercase tracking-[0.2em] text-ink hover:text-tomato ${focusRing}`}
              >
                Start writing →
              </Link>
            </div>
          </figure>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Wordmark className="text-3xl" />
            <p className="mt-3 font-ink-mono text-[11px] uppercase tracking-wider text-ink/60">
              Set in Fraunces & Inter Tight
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link to={buildPath} className={`text-ink/75 hover:text-ink ${focusRing}`}>
              Builder
            </Link>
            <a href="#templates" className={`text-ink/75 hover:text-ink ${focusRing}`}>
              Templates
            </a>
            <Link to="/ats-checker" className={`text-ink/75 hover:text-ink ${focusRing}`}>
              ATS Checker
            </Link>
            <Link to="/login" className={`text-ink/75 hover:text-ink ${focusRing}`}>
              Log in
            </Link>
          </nav>
          <p className="font-ink-mono text-[11px] uppercase tracking-wider text-ink/60">© {CURRENT_YEAR} ResumeCraft</p>
        </div>
      </footer>
    </div>
  );
}
