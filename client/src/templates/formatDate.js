// Reformats the free-text dates people type ("Mar 2023", "03/2023", "2023-03", "2019 – 2023")
// into one style: "short" (Jan 2024), "numeric" (01/2024) or "year" (2024).
// Anything that isn't clearly a date ("Present", "Summer 2021", "15/03/2023") is kept as typed,
// so a format setting can never garble what the user wrote.

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "March" / "Mar." / "Sept" -> 1..12. Only a month name or a shortened form of one
// (at least 3 letters), so words like "Marathon" are left alone.
const monthFromName = (name) => {
  const word = name.toLowerCase().replace(/\.$/, "");
  const index = MONTHS.findIndex((month) => word.length >= 3 && month.startsWith(word));
  return index >= 0 ? index + 1 : null;
};

// One date -> { month?, year } or null if it isn't a recognisable date
function parseDate(text) {
  const value = text.trim();
  let match = value.match(/^([A-Za-z]{3,9}\.?),?\s+(\d{4})$/); // Mar 2023, March, 2023
  if (match) {
    const month = monthFromName(match[1]);
    return month ? { month, year: match[2] } : null;
  }
  match = value.match(/^(\d{1,2})[/.-](\d{4})$/); // 03/2023, 3.2023, 03-2023
  if (match && match[1] >= 1 && match[1] <= 12) return { month: Number(match[1]), year: match[2] };
  match = value.match(/^(\d{4})[/.-](\d{1,2})$/); // 2023-03
  if (match && match[2] >= 1 && match[2] <= 12) return { month: Number(match[2]), year: match[1] };
  match = value.match(/^(\d{4})$/); // 2023
  if (match) return { year: match[1] };
  return null;
}

function formatOne(text, format) {
  const date = parseDate(text);
  if (!date) return text.trim();
  if (format === "year" || !date.month) return date.year;
  return format === "numeric" ? `${String(date.month).padStart(2, "0")}/${date.year}` : `${SHORT_NAMES[date.month - 1]} ${date.year}`;
}

// A single date or a range ("2019 – 2023", "Mar 2023 - Present", "2019 to 2023").
// format null = keep exactly as typed.
export default function formatDate(text, format) {
  if (!format || !text) return text ?? "";
  // Range separators: dashes with spaces around them, an en/em dash, or "to"
  const parts = text.split(/\s+[-–—]\s+|\s*[–—]\s*|\s+to\s+/i);
  return joinRange(parts.map((part) => formatOne(part, format)));
}

// "2022", "2022" -> "2022" (e.g. Jun 2022 – Dec 2022 in the year-only format); otherwise "a – b"
export const joinRange = (parts) => parts.filter((part, i) => part && part !== parts[i - 1]).join(" – ");
