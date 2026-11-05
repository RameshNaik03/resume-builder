// Screenshots of every page, for design reviews (not a test): desktop and phone width in light
// mode, and desktop in dark mode, against a throwaway database with a sample resume, an ATS
// review, a tailored job and a cover letter (the pages and data: e2e/pageTour.js).
//
// Run: node e2e/screenshots.js [output folder] [name filter] (in server/; default folder:
// <temp>/resume-builder-screens; the filter is a pattern for page names, e.g. "dev-ui" or "0[1-6]")
// SLICES=1 also saves each page in screen-height pieces (readable at full size).
// Uses the browser tests' stack (e2e/helpers.js): the same ports and browser settings.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sleep, startStack } from "./helpers.js";
import { openPage, seedTour, tourPages } from "./pageTour.js";

const OUT = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), "resume-builder-screens"));
const FILTER = process.argv[3] ?? "";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, theme: "light" },
  { name: "phone", width: 390, height: 844, theme: "light", mobile: true },
  { name: "desktop-dark", width: 1440, height: 900, theme: "dark" },
];

// The stack's cleanup runs when this "test context" ends
const cleanups = [];
const context = { after: (fn) => cleanups.push(fn) };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, api, register } = await startStack(context, "screenshots");
  const token = await register("screens");
  const pages = tourPages(await seedTour(api, token)).filter((entry) => new RegExp(FILTER).test(entry.name));

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, isMobile: Boolean(viewport.mobile), hasTouch: Boolean(viewport.mobile) });
    for (const entry of pages) {
      await openPage(page, entry, { token, theme: viewport.theme });
      await sleep(1600); // Count-up rings, fit-to-page and fonts settle
      const file = path.join(OUT, `${entry.name}--${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      if (process.env.SLICES) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0, part = 0; y < height; y += viewport.height, part++) {
          const clip = { x: 0, y, width: viewport.width, height: Math.min(viewport.height, height - y) };
          await page.screenshot({ path: file.replace(/\.png$/, `-part${part}.png`), clip, captureBeyondViewport: true });
        }
      }
      console.log(file);
    }
    await page.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
  });
