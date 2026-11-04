// Shared by the ATS components (kept out of the component files so Fast Refresh keeps working)

// The steps the server goes through, in order (shown while the analysis runs)
export const ANALYZE_STEPS = ["Reading file", "Checking ATS compatibility", "Scoring content", "Matching keywords"];

// The grade for a score out of 100 (the same bands as the server)
export const gradeFor = (score) => (score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs work" : "Poor");

// Colours for a score in % (the score ring and category bars): green 70+, orange 50-69, red below
// A job match's own scale (Tailor to a job), separate from the ATS score colours: neutral
// blue/indigo tones, so a stretch role doesn't look like an error
export function fitTone(percent) {
  if (percent >= 75) return { label: "Strong fit", stroke: "stroke-indigo-600 dark:stroke-indigo-400", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-600 text-white dark:bg-indigo-500" };
  if (percent >= 50) return { label: "Good fit", stroke: "stroke-indigo-400", text: "text-indigo-600 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200" };
  return { label: "Stretch role", stroke: "stroke-sky-400", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900" };
}

export function scoreTone(percent) {
  if (percent >= 70) return { stroke: "stroke-emerald-500", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (percent >= 50) return { stroke: "stroke-orange-500", bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  return { stroke: "stroke-rose-500", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
}
