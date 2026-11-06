// What the style check (check-styles.mjs) flags, and what it lets through.
// Run: npm test (in client/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { findViolations } from "./check-styles.mjs";

const rules = (text) => findViolations(text).map(({ rule, match }) => `${rule}:${match}`);

test("raw hex colours are flagged", () => {
  assert.deepEqual(rules(`style={{ color: "#1e3a8a", background: "#fff" }}`), ["hex:#1e3a8a", "hex:#fff"]);
  assert.deepEqual(rules(`<a href="#job-description">`), [], "an anchor isn't a colour");
});

test("arbitrary Tailwind values and variants are flagged", () => {
  assert.deepEqual(rules(`className="w-[150px] text-[11px] bg-(--accent)"`), ["arbitrary:w-[150px]", "arbitrary:text-[11px]", "arbitrary:bg-(--accent)"]);
  assert.deepEqual(rules(`className="min-[480px]:inline [&_svg]:size-4 [mask-type:alpha]"`), ["arbitrary:min-[480px]", "arbitrary:[&_svg]", "arbitrary:[mask-type:alpha]"]);
  assert.deepEqual(rules(`const first = items[0]; const value = map[key];`), [], "array indexing isn't a class");
  assert.deepEqual(rules(`setState({ ...current, [kind]: value, [event.target.name]: text })`), [], "computed object keys aren't variants");
});

test("Tailwind palette colours and the old landing tokens are flagged", () => {
  assert.deepEqual(rules(`className="bg-slate-50 dark:text-indigo-400 hover:bg-white/80 text-ink"`), [
    "palette:bg-slate-50",
    "palette:dark:text-indigo-400",
    "palette:hover:bg-white/80",
    "palette:text-ink",
  ]);
});

test("the design system's tokens pass", () => {
  assert.deepEqual(rules(`className="bg-canvas text-fg border-line hover:bg-surface-2 text-accent shadow-raised type-h1 font-title rounded-xl px-4"`), []);
});
