// Browser test of "Fit to one page" in the editor:
//   - a resume a little over one page shows "2 pages"; turning the switch on fits it ("1 page")
//     and saves the setting
//   - turning it off brings back the resume's own design exactly (saved design and the
//     preview's settings)
//   - a resume far too long shows "still N lines too long" with suggestions, and nothing is
//     hidden or shrunk below the minimums
//
// Run: node --test e2e/fit-one-page.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, sleep, startStack } from "./helpers.js";
import { SLIGHTLY_LONG, VERY_LONG } from "./fitSamples.js";

test("Fit to one page in the editor", async (t) => {
  const { browser, api, register } = await startStack(t, "fit");
  const token = await register("fit");
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  await logIn(page, token);

  const pageCount = () => page.$eval('[data-testid="page-count"]', (el) => el.textContent.trim());
  const waitForPageCount = (text) =>
    page.waitForFunction((value) => document.querySelector('[data-testid="page-count"]')?.textContent.trim() === value, { timeout: 20000 }, text);
  // The settings the preview actually uses (the design's CSS variables on the printed copy)
  const previewSettings = () =>
    page.evaluate(() => {
      const root = document.querySelector("div.invisible > div").firstElementChild;
      return ["--lh", "--base-size", "--m-top", "--m-left", "--section-space", "--para-space"].map((name) => root.style.getPropertyValue(name));
    });
  const savedDesign = async (id) => (await api("GET", `/resumes/${id}`, token)).body.design;
  const fitSwitch = '[data-testid="editor-toolbar"] button[role="switch"][aria-label="Fit to one page"]';

  await t.test("a slightly long resume fits after turning it on, and comes back when turned off", async () => {
    const id = (await api("POST", "/resumes", token, { ...SLIGHTLY_LONG, template: "classic-navy" })).body._id;
    await page.goto(`${APP}/editor/${id}`, { waitUntil: "networkidle0" });
    await waitForPageCount("2 pages");
    const original = await previewSettings();

    await page.click(fitSwitch);
    await waitForPageCount("1 page");
    const fitted = await previewSettings();
    assert.notDeepEqual(fitted, original, "fitting should change the preview's settings");
    await page.keyboard.down("Control");
    await page.keyboard.press("s");
    await page.keyboard.up("Control");
    await sleep(1500);
    assert.deepEqual(await savedDesign(id), { fitOnePage: true }, "only the switch is saved, never the fitted values");

    await page.click(fitSwitch);
    await waitForPageCount("2 pages");
    assert.deepEqual(await previewSettings(), original, "turning it off restores the resume's own settings");
    await page.keyboard.down("Control");
    await page.keyboard.press("s");
    await page.keyboard.up("Control");
    await sleep(1500);
    assert.deepEqual(await savedDesign(id), {}, "the saved design is back to exactly what it was");
  });

  await t.test("a very long resume shows how much too long it is, with suggestions", async () => {
    const id = (await api("POST", "/resumes", token, { ...VERY_LONG, template: "classic-navy", design: { fitOnePage: true } })).body._id;
    await page.goto(`${APP}/editor/${id}`, { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-testid="fit-too-long"]', { timeout: 20000 });

    const message = await page.$eval('[data-testid="fit-too-long"]', (el) => el.innerText);
    assert.match(message, /Your resume is still \d+ lines? too long for one page\./);
    assert.match(message, /Experience \(\d+% of the page\)/, "names the longest section");
    assert.match(message, /ended over 10 years ago: .*Developer 1, Example Company 1.* and \d+ more\./, "points out old roles");
    assert.match(message, /Hide sections in the Design tab/);
    assert.notEqual(await pageCount(), "1 page", "it never pretends to fit");

    // Nothing below the minimums: line height 1.25, margins 12 mm, body text 9 pt or more
    const [lineHeight, baseSize, marginTop] = await previewSettings();
    assert.ok(Number(lineHeight) >= 1.25 && parseFloat(baseSize) >= 9 && parseFloat(marginTop) >= 12, `${lineHeight} ${baseSize} ${marginTop}`);
    // Nothing is hidden: every job is still in the preview
    const jobsShown = await page.evaluate(() => document.querySelector("div.invisible > div").textContent);
    for (const job of VERY_LONG.experience) assert.ok(jobsShown.includes(job.role), `${job.role} is missing`);

    // The suggestion's button opens the Design tab (where sections can be hidden)
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Hide sections in the Design tab")).click());
    await page.waitForFunction(() => document.body.innerText.includes("Fit to one page") && document.body.innerText.includes("Paper size"), { timeout: 5000 });
  });
});
