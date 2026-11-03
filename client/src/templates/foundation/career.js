// Works out a career's time span from the jobs' own dates, for drawn career strips.
// Only dates that can actually be read count: a job without a readable start, or without a
// readable (or "Present") end, is left out rather than guessed.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const PRESENT = /^(present|current|now|today)$/i;

// "Mar 2022" / "March 2022" / "03/2022" / "2022" / "Present" -> months since year 0, or null
export function parseMonth(text, now = new Date()) {
  const value = (text ?? "").trim();
  if (!value) return null;
  if (PRESENT.test(value)) return now.getFullYear() * 12 + now.getMonth();
  const year = value.match(/\b(19|20)\d{2}\b/)?.[0];
  if (!year) return null;
  const numeric = value.match(/\b(\d{1,2})\/(?:19|20)\d{2}\b/);
  const named = MONTHS.findIndex((month) => value.toLowerCase().includes(month));
  const month = numeric ? Number(numeric[1]) - 1 : Math.max(named, 0);
  return Number(year) * 12 + Math.min(Math.max(month, 0), 11);
}

// { firstYear, lastYear, segments: [{ from, to }] } with from / to as fractions (0-1) of the
// whole span, sorted and without overlaps; null when fewer than one job has readable dates
export function careerSpan(jobs, now = new Date()) {
  const spans = jobs
    .map((job) => ({ start: parseMonth(job.startDate, now), end: parseMonth(job.endDate, now) }))
    .filter(({ start, end }) => start !== null && end !== null && end >= start)
    .sort((a, b) => a.start - b.start);
  if (spans.length === 0) return null;

  const first = spans[0].start;
  const last = Math.max(...spans.map((span) => span.end)) + 1; // Include the last month
  const length = last - first;
  const segments = [];
  let previousEnd = first;
  for (const { start, end } of spans) {
    const from = Math.max(start, previousEnd);
    const to = end + 1;
    if (to > from) segments.push({ from: (from - first) / length, to: (to - first) / length });
    previousEnd = Math.max(previousEnd, to);
  }
  return { firstYear: Math.floor(first / 12), lastYear: Math.floor((last - 1) / 12), segments };
}
