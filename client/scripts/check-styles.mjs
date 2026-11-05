// Style check (part of npm run lint): page code must style with the design system only
// (src/styles/design-system.css tokens and src/components/ui), so it flags:
//   hex       - raw hex colours ("#1e3a8a")
//   arbitrary - arbitrary Tailwind values and variants: w-[150px], text-[11px], bg-(--x),
//               min-[480px]:, [&_svg]:size-4, [mask-type:alpha]
//   palette   - Tailwind's own colours (bg-slate-200, text-indigo-600, bg-white) and the
//               landing page's old "Paper & Ink" tokens (text-ink, bg-paper, text-tomato)
// Checked: src/pages and src/components, except the design system itself (components/ui) and
// the dev-only pages (pages/dev). Resume templates (src/templates) draw resumes, not the app,
// and aren't checked.
//
// Code written before the design system is listed in scripts/style-baseline.json with its
// counts: a file may never go above its baseline (a new file's baseline is 0), so the counts
// only shrink as pages move to the design system. After cleaning a file up, run
//   node scripts/check-styles.mjs --update
// to lower its baseline (it never raises one). --init records the current counts as the
// first baseline (only when there is none).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_FILE = path.join(ROOT, "scripts", "style-baseline.json");
const CHECKED = ["src/pages", "src/components"];
const EXEMPT = ["src/components/ui/", "src/pages/dev/"];

const PALETTE_HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILITIES = "bg|text|border|border-[trblxy]|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret";
export const RULES = {
  hex: /(?<![\w&#/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
  arbitrary: new RegExp(
    [
      String.raw`(?<![\w$.])[a-z][\w-]*-\[[^\]\s"'\x60]+\]`, // w-[150px], min-[480px]:
      String.raw`(?<![\w$.])[a-z][\w-]*-\(--[\w-]+\)`, // bg-(--accent)
      String.raw`(?<=[\s"'\x60{(])\[[^\]\s"'\x60]+\](?=:)`, // [&_svg]:size-4
      String.raw`(?<=[\s"'\x60{(])\[[a-z-]+:[^\]\s"'\x60]+\]`, // [mask-type:alpha]
    ].join("|"),
    "g"
  ),
  palette: new RegExp(
    String.raw`(?<![\w-])(?:[a-z-]+:)*!?(?:${COLOR_UTILITIES})-(?:(?:${PALETTE_HUES})-\d{2,3}|white|black|paper|ink|tomato|carbon)(?:\/\d+)?!?(?![\w-])`,
    "g"
  ),
};

// The violations in a source text: [{ rule, match, line }]
export function findViolations(text) {
  const found = [];
  for (const [rule, pattern] of Object.entries(RULES)) {
    for (const match of text.matchAll(pattern)) {
      found.push({ rule, match: match[0], line: text.slice(0, match.index).split("\n").length });
    }
  }
  return found;
}

function checkedFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(path.relative(ROOT, full).split(path.sep).join("/"));
    }
  };
  for (const dir of CHECKED) walk(path.join(ROOT, dir));
  return files.filter((file) => !EXEMPT.some((prefix) => file.startsWith(prefix))).sort();
}

function main({ update, init }) {
  if (init && fs.existsSync(BASELINE_FILE)) throw new Error("There is already a baseline: use --update to lower it.");
  const baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) : {};
  const next = {};
  const failures = [];
  const totals = { hex: 0, arbitrary: 0, palette: 0 };

  for (const file of checkedFiles()) {
    const violations = findViolations(fs.readFileSync(path.join(ROOT, file), "utf8"));
    const counts = { hex: 0, arbitrary: 0, palette: 0 };
    for (const { rule } of violations) counts[rule] += 1;
    for (const rule of Object.keys(counts)) {
      totals[rule] += counts[rule];
      const allowed = init ? counts[rule] : (baseline[file]?.[rule] ?? 0);
      if (counts[rule] > allowed) {
        const examples = violations.filter((v) => v.rule === rule).slice(0, 8).map((v) => `    line ${v.line}: ${v.match}`);
        failures.push(`${file}: ${counts[rule]} ${rule} (allowed ${allowed})\n${examples.join("\n")}`);
      }
      const kept = Math.min(counts[rule], allowed);
      if (kept > 0) (next[file] ??= {})[rule] = kept;
    }
  }

  if (update || init) {
    fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
    console.log(init ? "Style baseline recorded." : "Style baseline lowered to the current counts.");
  }
  if (failures.length) {
    console.error(
      `Style check failed: use the design system's tokens and components (see /dev/ui) instead of raw colours, arbitrary values or palette colours.\n\n${failures.join("\n\n")}`
    );
    process.exitCode = 1;
    return;
  }
  const legacy = Object.values(totals).reduce((sum, count) => sum + count, 0);
  console.log(`Style check passed. Legacy styling still to migrate: ${totals.palette} palette, ${totals.arbitrary} arbitrary, ${totals.hex} hex (${legacy} in total).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main({ update: process.argv.includes("--update"), init: process.argv.includes("--init") });
