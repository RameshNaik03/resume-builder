import { useEffect, useRef, useState } from "react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import { SAMPLE_RESUME } from "../../templates/sampleResume";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import ResumeSheet from "../ResumeSheet";

const TEMPLATE_ID = "modern-line-burgundy";
const A4_WIDTH_PX = 794; // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm

const TYPE_DELAY = 75; // ms per letter of the name
const STEP_DELAY = 380; // ms per new line or block
const HOLD_DELAY = 3600; // How long the finished, stamped sheet stays before looping
const FADE_DELAY = 600; // Fade-out before starting over

// The resume "writing itself": a list of { resume, delay } snapshots, each one a little
// more complete than the last. They're rendered by the real template, exactly the way
// the editor's live preview re-renders as the user types.
function buildFrames(sample) {
  const draft = {
    personalInfo: { fullName: "", headline: "", email: "", phone: "", location: "", linkedin: "", github: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };
  const frames = [];
  const snapshot = (delay) => frames.push({ resume: structuredClone(draft), delay });

  // The name types in letter by letter (starting at one letter, so the
  // template never shows its "Your Name" placeholder)
  const name = sample.personalInfo.fullName;
  for (let length = 1; length <= name.length; length++) {
    draft.personalInfo.fullName = name.slice(0, length);
    snapshot(TYPE_DELAY);
  }
  draft.personalInfo.headline = sample.personalInfo.headline;
  snapshot(STEP_DELAY);
  Object.assign(draft.personalInfo, sample.personalInfo);
  snapshot(STEP_DELAY);
  draft.summary = sample.summary;
  snapshot(STEP_DELAY);

  // Each job's heading, then its bullet points one at a time
  for (const job of sample.experience) {
    const entry = { ...job, bullets: [] };
    draft.experience.push(entry);
    snapshot(STEP_DELAY);
    for (const bullet of job.bullets) {
      entry.bullets.push(bullet);
      snapshot(STEP_DELAY * 0.8);
    }
  }
  draft.education = sample.education;
  snapshot(STEP_DELAY);
  draft.skills = sample.skills;
  snapshot(STEP_DELAY);
  draft.projects = sample.projects;
  snapshot(STEP_DELAY * 1.5); // A beat before the stamp lands
  return frames;
}

const FRAMES = buildFrames(SAMPLE_RESUME);
const STAMP_STEP = FRAMES.length; // After the last frame: stamp, hold...
const FADE_STEP = STAMP_STEP + 1; // ...then fade out and start again

const delayFor = (step) => (step < STAMP_STEP ? FRAMES[step].delay : step === STAMP_STEP ? HOLD_DELAY : FADE_DELAY);

// A tilted A4 sheet that builds itself, then gets a "SHORTLISTED" stamp.
// With reduced motion it shows the finished, stamped sheet and never moves.
export default function HeroSheet() {
  const reducedMotion = usePrefersReducedMotion();
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [step, setStep] = useState(0);
  const [onScreen, setOnScreen] = useState(true);

  // Fit the A4 page to the column width
  useEffect(() => {
    const box = boxRef.current;
    const observer = new ResizeObserver(() => setScale(box.clientWidth / A4_WIDTH_PX));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Pause while scrolled out of view (no point animating what nobody sees)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  // The timeline: move to the next step after this step's delay, looping after the fade
  useEffect(() => {
    if (reducedMotion || !onScreen) return;
    const timer = setTimeout(() => setStep((current) => (current >= FADE_STEP ? 0 : current + 1)), delayFor(step));
    return () => clearTimeout(timer);
  }, [step, reducedMotion, onScreen]);

  const { resume } = FRAMES[reducedMotion ? FRAMES.length - 1 : Math.min(step, FRAMES.length - 1)];
  const stamped = reducedMotion || step >= STAMP_STEP;
  const fading = !reducedMotion && step === FADE_STEP;

  return (
    <div
      role="img"
      aria-label={`Example resume for ${SAMPLE_RESUME.personalInfo.fullName}, a fictional ${SAMPLE_RESUME.personalInfo.headline.toLowerCase()}, stamped "Shortlisted"`}
      className="relative mx-auto w-full max-w-md rotate-[2.5deg] lg:max-w-none"
    >
      <div
        ref={boxRef}
        className="relative overflow-hidden bg-white shadow-[0_1px_2px_rgb(27_27_31/0.08),0_18px_40px_-12px_rgb(27_27_31/0.35)] ring-1 ring-black/5 dark:shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
        style={{ height: scale ? A4_HEIGHT_PX * scale : undefined, aspectRatio: scale ? undefined : "210 / 297" }}
      >
        {/* Page and stamp fade out together before the loop starts over */}
        <div aria-hidden="true" className={`transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
          {scale > 0 && (
            <div
              // Each block of the resume fades in as it's added (only new elements animate)
              className="pointer-events-none motion-safe:[&_[data-block]]:animate-ink-in motion-safe:[&_li]:animate-ink-in"
              style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
              <ResumeSheet>
                <TemplateRenderer resume={resume} templateId={TEMPLATE_ID} withLinks={false} />
              </ResumeSheet>
            </div>
          )}

        </div>
      </div>

      {/* Rubber stamp, outside the clipped page so it can overhang the corner like a real one.
          Mounted only once stamped, so its landing animation plays on every loop. */}
      <div aria-hidden="true" className={`transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
        {stamped && (
          <div className="absolute top-[5%] right-[-4%] -rotate-12 border-[3px] border-double border-tomato bg-white/40 px-3 py-1.5 font-ink-mono text-[clamp(0.7rem,2.4vw,0.95rem)] font-medium tracking-[0.25em] text-tomato motion-safe:animate-stamp dark:bg-transparent">
            SHORTLISTED
          </div>
        )}
      </div>
    </div>
  );
}
