// Shared by the ATS components (kept out of the component files so Fast Refresh keeps working)

// The steps the server goes through, in order (shown while the analysis runs)
export const ANALYZE_STEPS = ["Reading file", "Checking ATS compatibility", "Scoring content", "Matching keywords"];

// Colours for a score in % (the score ring and category bars): green 70+, orange 50-69, red below
export function scoreTone(percent) {
  if (percent >= 70) return { stroke: "stroke-emerald-500", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (percent >= 50) return { stroke: "stroke-orange-500", bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  return { stroke: "stroke-rose-500", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
}
