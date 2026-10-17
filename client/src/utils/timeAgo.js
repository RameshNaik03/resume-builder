// Turns a date into friendly text like "2 hours ago" or "yesterday"
const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Each unit with how many seconds it lasts, biggest first
const UNITS = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

export default function timeAgo(date) {
  // Negative number = in the past
  const secondsDiff = (new Date(date).getTime() - Date.now()) / 1000;

  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(secondsDiff) >= secondsInUnit) {
      return formatter.format(Math.trunc(secondsDiff / secondsInUnit), unit);
    }
  }

  return "just now";
}
