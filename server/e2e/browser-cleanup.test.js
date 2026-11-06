import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { browserProcessIds, launchBrowser } from "./helpers.js";

// The browser tests' cleanup stops every process of the browser a run started (found by its
// own profile folder) and nothing else: another browser keeps running. No API or app needed.

test("browser cleanup stops only the run's own browser", async (t) => {
  const cleanups = [];
  t.after(async () => {
    for (const cleanup of cleanups) await cleanup(); // Even if an assertion fails
  });

  // Two browsers, as if from two runs; each registers its cleanup
  let cleanupA;
  let cleanupB;
  const browserA = await launchBrowser((cleanup) => cleanups.push((cleanupA = cleanup)));
  const browserB = await launchBrowser((cleanup) => cleanups.push((cleanupB = cleanup)));
  const profileOf = (browser) => browser.process()?.spawnargs.find((arg) => arg.startsWith("--user-data-dir="))?.slice("--user-data-dir=".length);
  const [profileA, profileB] = [profileOf(browserA), profileOf(browserB)];
  assert.ok(profileA && profileB && profileA !== profileB, "each browser has its own profile folder");
  assert.ok(browserProcessIds(profileA).length > 0, "browser A's processes are found by its folder");

  // A browser that was never closed (as when a run stops early): only its processes go
  await cleanupA();
  assert.deepEqual(browserProcessIds(profileA), [], "browser A has no processes left");
  assert.ok(!fs.existsSync(profileA), "browser A's profile folder is deleted");
  assert.ok(browserB.connected, "browser B is still running");
  assert.ok(browserProcessIds(profileB).length > 0, "browser B's processes are untouched");
  const page = await browserB.newPage();
  await page.goto("about:blank");
  await page.close();

  // The normal path: close, then stop anything left
  await cleanupB();
  assert.deepEqual(browserProcessIds(profileB), [], "browser B has no processes left");
});
