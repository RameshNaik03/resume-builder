// Shared by the ATS components (kept out of the component files so Fast Refresh keeps working)

// The steps the server goes through, in order (shown while the analysis runs)
export const ANALYZE_STEPS = ["Reading file", "Checking ATS compatibility", "Scoring content", "Matching keywords"];

// The grade for a score out of 100 (the same bands as the server)
export const gradeFor = (score) => (score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs work" : "Poor");

// The ATS scale, for a score in %: "success" 70+, "warning" 50-69, else "danger"
export const scoreTone = (percent) => (percent >= 70 ? "success" : percent >= 50 ? "warning" : "danger");

// A job match's own scale (Tailor to a job), separate from the ATS colours: the accent, or
// neutral for a stretch role, so a stretch role doesn't look like an error
export function fitTone(percent) {
  if (percent >= 75) return { label: "Strong fit", tone: "accent" };
  if (percent >= 50) return { label: "Good fit", tone: "accent" };
  return { label: "Stretch role", tone: "neutral" };
}

// Text and fill classes for a tone (written out in full so Tailwind finds them)
export const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger", accent: "text-accent", neutral: "text-fg-muted" };
export const TONE_FILL = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", accent: "bg-accent", neutral: "bg-fg-subtle" };
