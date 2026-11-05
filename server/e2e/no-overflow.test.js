// Browser test: no page scrolls sideways on a 390px-wide phone (the pages of e2e/pageTour.js,
// including the editor's Design tab and template picker). A failure names the page and the
// widest elements that stick out, to find the cause quickly.
//
// Run: node --test e2e/no-overflow.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { sleep, startStack } from "./helpers.js";
import { openPage, seedTour, tourPages } from "./pageTour.js";

const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

test("no horizontal scrolling at 390px", async (t) => {
  const { browser, api, register } = await startStack(t, "overflow");
  const token = await register("overflow");
  const pages = tourPages(await seedTour(api, token));
  const page = await browser.newPage();
  await page.setViewport(PHONE);

  for (const entry of pages) {
    await t.test(entry.name, async () => {
      await openPage(page, entry, { token });
      await sleep(800);
      const result = await page.evaluate((width) => {
        const scrollWidth = document.documentElement.scrollWidth;
        // The elements that reach past the screen's right edge (and aren't inside a scroller)
        const clipped = (element) => {
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const overflow = getComputedStyle(parent).overflowX;
            if (overflow === "auto" || overflow === "scroll" || overflow === "hidden" || overflow === "clip") return true;
          }
          return false;
        };
        const offenders = [...document.querySelectorAll("body *")]
          .filter((element) => element.getBoundingClientRect().right > width + 1 && !clipped(element))
          .map((element) => ({ right: Math.round(element.getBoundingClientRect().right), tag: element.tagName.toLowerCase(), cls: String(element.className).slice(0, 90) }))
          .sort((a, b) => b.right - a.right)
          .slice(0, 5);
        return { scrollWidth, offenders };
      }, PHONE.width);
      assert.ok(result.scrollWidth <= PHONE.width, `${entry.name} is ${result.scrollWidth}px wide: ${JSON.stringify(result.offenders, null, 1)}`);
    });
  }
});
