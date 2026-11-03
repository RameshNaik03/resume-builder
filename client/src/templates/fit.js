// "Fit to one page": shrinks a resume's design, within the foundation's limits, until it fits on
// one page. The fitted values are never saved: they're worked out from the content each time,
// so turning the option off returns to the user's own settings exactly.
//
// One fit level t from FIT_LEVELS (the user's own settings) down to 0 (every minimum) shrinks
// four groups of settings in order, one level each:
//   4 -> 3  section and job spacing     down to half (the smallest rhythm steps)
//   3 -> 2  page margins                down to 12 mm
//   2 -> 1  line height                 down to 1.25
//   1 -> 0  font size (body, headings and name together; body never below 9 pt, the name never
//           below its tier's minimum)
// A setting the user already set below its minimum is left as it is. findFit() binary-searches t
// on a hidden copy of the resume for the largest level that fits, with a fixed number of steps
// and rounded values, so the result is deterministic: the preview and the PDF use the same values.

import { designCssVars, pageMetrics, resolveDesign } from "./design";
import { paginate } from "./pagination";
import { NAME_SIZES } from "./foundation/tokens";
import { parseMonth } from "./foundation/career";
import { toPlainText } from "../utils/richText";

export const FIT_LEVELS = 4;
const SEARCH_STEPS = 14;
export const FIT_MINIMUMS = { spacing: 0.5, margin: 12, lineHeight: 1.25, bodySize: 9 };
const PX_PER_PT = 96 / 72;

const round = (value, places = 3) => Math.round(value * 10 ** places) / 10 ** places;
// The user's value, shrunk towards the minimum: f = 1 keeps it, f = 0 reaches the minimum
const shrink = (value, minimum, f) => (value <= minimum ? value : round(minimum + (value - minimum) * f));

// The design overrides for fit level t (an empty object at FIT_LEVELS: the user's own settings)
export function fitOverrides(template, design, t) {
  if (t >= FIT_LEVELS) return {};
  const { resolved: d } = resolveDesign(template, design);
  const stage = (index) => Math.min(1, Math.max(0, t - index)); // 1 = untouched, 0 = at the minimum
  const layout = template.layoutDefaults;

  // The name is nameSize × (base / layout base) × heading size, and must stay at its tier's minimum
  const nameMinimum = (NAME_SIZES[template.tier] ?? NAME_SIZES.basic).min;
  const bodyMinimum = Math.max(FIT_MINIMUMS.bodySize, (nameMinimum * layout.baseFontSize) / ((layout.nameSize ?? 26) * (d.headingSize / 100)));

  return {
    paragraphSpacing: shrink(d.paragraphSpacing, FIT_MINIMUMS.spacing, stage(3)),
    sectionSpacing: shrink(d.sectionSpacing, FIT_MINIMUMS.spacing, stage(3)),
    marginTop: shrink(d.marginTop, FIT_MINIMUMS.margin, stage(2)),
    marginRight: shrink(d.marginRight, FIT_MINIMUMS.margin, stage(2)),
    marginBottom: shrink(d.marginBottom, FIT_MINIMUMS.margin, stage(2)),
    marginLeft: shrink(d.marginLeft, FIT_MINIMUMS.margin, stage(2)),
    lineHeight: shrink(d.lineHeight, FIT_MINIMUMS.lineHeight, stage(1)),
    baseFontSize: shrink(d.baseFontSize, bodyMinimum, stage(0)),
  };
}

// Sets a design's CSS variables (and plain styles) on the template's root element
function applyVars(root, vars) {
  for (const [name, value] of Object.entries(vars)) {
    if (name.startsWith("--")) root.style.setProperty(name, String(value));
    else root.style[name] = value;
  }
}

// Finds the fit on `sheet`: a hidden ResumeSheet holding the resume rendered with the user's own
// design (no fit). Its template root's style is changed while searching and put back after.
// Returns { overrides, fits, level } and, when it can't fit, overflowLines (how many body lines
// too long it still is at the minimums) and sections ([{ title, share }], longest first).
export function findFit(sheet, template, design) {
  const root = sheet.firstElementChild; // TemplateRenderer's root (it holds the design variables)
  const originalStyle = root.getAttribute("style");

  const measure = (t) => {
    const overrides = fitOverrides(template, design, t);
    const resolvedDesign = resolveDesign(template, { ...design, ...overrides });
    applyVars(root, designCssVars(template, resolvedDesign));
    const metrics = pageMetrics(resolvedDesign.resolved);
    return { overrides, metrics, resolved: resolvedDesign.resolved, pageCount: paginate(sheet, metrics).pageCount };
  };

  let result;
  if (measure(FIT_LEVELS).pageCount === 1) {
    result = { overrides: {}, fits: true, level: FIT_LEVELS };
  } else {
    const smallest = measure(0);
    if (smallest.pageCount > 1) {
      // Still too long at the minimums (paginate leaves the sheet without gaps: its natural layout)
      result = { overrides: smallest.overrides, fits: false, level: 0, ...overflowOf(sheet, smallest) };
    } else {
      let low = 0; // Fits
      let high = FIT_LEVELS; // Doesn't fit
      for (let step = 0; step < SEARCH_STEPS; step++) {
        const middle = (low + high) / 2;
        if (measure(middle).pageCount === 1) low = middle;
        else high = middle;
      }
      result = { overrides: fitOverrides(template, design, low), fits: true, level: low };
    }
  }

  if (originalStyle === null) root.removeAttribute("style");
  else root.setAttribute("style", originalStyle);
  return result;
}

// How far the content runs past page 1 at the minimum settings, in body lines, and how much of
// the page each section takes (the sheet is in its natural layout, without page-break gaps)
function overflowOf(sheet, { metrics, resolved }) {
  const sheetTop = sheet.getBoundingClientRect().top;
  const bottom = Math.max(...[...sheet.querySelectorAll("[data-block]")].map((el) => el.getBoundingClientRect().bottom - sheetTop));
  const overflowPx = bottom - (metrics.heightPx - metrics.marginBottomPx);
  const linePx = resolved.baseFontSize * resolved.lineHeight * PX_PER_PT;

  const sections = [...sheet.querySelectorAll(".f-section")].map((section) => ({
    title: section.querySelector(".f-heading")?.textContent.trim() ?? "",
    height: section.getBoundingClientRect().height,
  }));
  const total = sections.reduce((sum, section) => sum + section.height, 0) || 1;
  return {
    overflowLines: Math.max(1, Math.ceil(overflowPx / linePx)),
    sections: sections
      .map(({ title, height }) => ({ title, share: Math.round((height / total) * 100) }))
      .sort((a, b) => b.share - a.share),
  };
}

// ---------- Suggestions when it can't fit ----------

const LONG_BULLET = 160; // Characters: about two lines in most layouts
const OLD_JOB_YEARS = 10;

// Plain-language suggestions based on the content, for the "still too long" message
export function fitSuggestions(resume, fit, now = new Date()) {
  const suggestions = [];

  const [longest, second] = fit.sections ?? [];
  if (longest?.title) {
    suggestions.push(
      second?.title
        ? `${longest.title} (${longest.share}% of the page) and ${second.title} (${second.share}%) are your longest sections.`
        : `${longest.title} is your longest section (${longest.share}% of the page).`
    );
  }

  const cutoff = (now.getFullYear() - OLD_JOB_YEARS) * 12 + now.getMonth();
  const oldJobs = (resume.experience ?? []).filter((job) => {
    const end = parseMonth(job.endDate, now);
    return end !== null && end < cutoff && (job.role || job.company);
  });
  if (oldJobs.length > 0) {
    // Up to three by name, then "and N more"
    const names = oldJobs.slice(0, 3).map((job) => [job.role, job.company].filter(Boolean).join(", "));
    const more = oldJobs.length > 3 ? ` and ${oldJobs.length - 3} more` : "";
    const them = oldJobs.length === 1 ? "it" : "them";
    suggestions.push(
      `${oldJobs.length === 1 ? "This role" : "These roles"} ended over ${OLD_JOB_YEARS} years ago: ${names.join("; ")}${more}. Shorten ${them} to one line, or remove ${them}.`
    );
  }

  const longBullets = (resume.experience ?? []).flatMap((job) => job.bullets ?? []).filter((bullet) => toPlainText(bullet).length > LONG_BULLET);
  if (longBullets.length > 0) {
    suggestions.push(
      `${longBullets.length} bullet ${longBullets.length === 1 ? "point runs" : "points run"} over two lines. Shortening ${longBullets.length === 1 ? "it" : "them"} saves the most space.`
    );
  }
  return suggestions;
}
