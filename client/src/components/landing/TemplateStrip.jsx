import { useState } from "react";
import { Pause, Play } from "lucide-react";
import TemplateRenderer from "../../templates/TemplateRenderer";
import { TEMPLATES } from "../../templates/registry";
import { SAMPLE_RESUME } from "../../templates/sampleResume";
import ResumeSheet from "../ResumeSheet";

const A4_WIDTH_PX = 794;
const THUMB_WIDTH_PX = 150;
const SCALE = THUMB_WIDTH_PX / A4_WIDTH_PX;

// One of each layout, in a mix of colours (missing ids are skipped if the registry changes)
const FEATURED_IDS = [
  "classic-navy",
  "bold-header-burgundy",
  "executive-burgundy",
  "modern-line-slate-blue",
  "sidebar-pro-teal",
  "split-accent-navy",
  "card-sections-forest",
  "elegant-serif-forest",
  "monogram-navy",
  "infographic-teal",
  "soft-header-teal",
  "compact-pro-graphite",
  "timeline-plus-graphite",
  "editorial-burgundy",
  "color-block-slate-blue",
  "minimal-grid-graphite",
];
const FEATURED = FEATURED_IDS.map((id) => TEMPLATES.find((template) => template.id === id)).filter(Boolean);

function Thumbnail({ template }) {
  return (
    // A right margin (not a flex gap) keeps both copies of the row exactly the same width
    <figure className="mr-8 w-[150px] shrink-0 transition duration-300 hover:-translate-y-2">
      <div
        className="overflow-hidden bg-white shadow-[0_10px_24px_-14px_rgb(27_27_31/0.5)] ring-1 ring-black/10"
        style={{ height: 297 * (THUMB_WIDTH_PX / 210) }}
      >
        <div className="pointer-events-none" style={{ width: A4_WIDTH_PX, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
          <ResumeSheet>
            <TemplateRenderer resume={SAMPLE_RESUME} templateId={template.id} withLinks={false} />
          </ResumeSheet>
        </div>
      </div>
      <figcaption className="mt-3 font-ink-mono text-[11px] uppercase tracking-wider text-ink/60">{template.name}</figcaption>
    </figure>
  );
}

// A slowly scrolling row of real template thumbnails. Pauses on hover and with the
// Pause button; with reduced motion it doesn't move and can be scrolled sideways instead.
export default function TemplateStrip() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="relative">
      <div className="mb-6 flex justify-end px-5 sm:px-8 motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          className="inline-flex items-center gap-2 font-ink-mono text-xs uppercase tracking-wider text-ink/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tomato"
        >
          {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          {paused ? "Play" : "Pause"}
        </button>
      </div>

      {/* Edges fade into the paper */}
      <div className="overflow-x-auto pt-3 pb-4 mask-[linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-safe:overflow-hidden">
        <div
          className={`flex w-max pl-5 motion-safe:pl-0 motion-safe:animate-marquee hover:[animation-play-state:paused] ${
            paused ? "[animation-play-state:paused]" : ""
          }`}
        >
          {FEATURED.map((template) => (
            <Thumbnail key={template.id} template={template} />
          ))}
          {/* Second copy for a seamless loop; hidden from screen readers and without motion */}
          <div className="flex motion-reduce:hidden" aria-hidden="true">
            {FEATURED.map((template) => (
              <Thumbnail key={template.id} template={template} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
