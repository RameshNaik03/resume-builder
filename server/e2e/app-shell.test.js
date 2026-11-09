// Browser test of the AppShell (the top navigation of every page but the landing page):
//   logged out: Log in / Sign up; logged in: the main links (the current one marked), the
//   dark mode toggle, and the account menu (name, email, Log out). On a phone the main links
//   move into the account menu, which opens and closes from the keyboard too.
//
// Run: node --test e2e/app-shell.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, sleep, startStack } from "./helpers.js";

test("AppShell", async (t) => {
  const { browser, api, register } = await startStack(t, "appshell");
  const token = await register("shell");
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const bar = () => page.$eval("header", (header) => header.innerText);
  const visible = (selector) => page.$$eval(selector, (elements) => elements.filter((element) => element.offsetParent !== null).map((element) => element.textContent.trim()));

  await t.test("logged out (the landing page): Log in and Sign up, no app links", async () => {
    await logIn(page, null);
    await page.goto(`${APP}/`, { waitUntil: "networkidle0" });
    const text = await bar();
    assert.match(text, /Log in/);
    assert.match(text, /Sign up/);
    assert.doesNotMatch(text, /Dashboard/);
  });

  await t.test("logged in: the main links, with the current page marked", async () => {
    await logIn(page, token);
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    assert.deepEqual(await visible('nav[aria-label="Main"] a'), ["Dashboard", "Tailor to a job", "ATS checker"]);
    assert.equal(await page.$eval('nav[aria-label="Main"] a[aria-current="page"]', (a) => a.textContent), "Dashboard");
    await page.click('nav[aria-label="Main"] a[href="/tailor"]');
    // React Router changes the URL at once and renders the new page in a transition a frame or
    // two later, so wait for the rendered nav (what's checked), not for the URL
    await page.waitForFunction(() => document.querySelector('nav[aria-label="Main"] a[aria-current="page"]')?.textContent === "Tailor to a job");
    assert.equal(await page.evaluate(() => location.pathname), "/tailor");
    assert.equal(await page.$$eval('nav[aria-label="Main"] a[aria-current="page"]', (links) => links.length), 1, "only the current page is marked");
  });

  await t.test("the dark mode toggle switches the theme and remembers it (in the account too)", async () => {
    const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const before = await dark();
    await page.click('header button[aria-label^="Switch to"]');
    assert.equal(await dark(), !before);
    assert.equal(await page.evaluate(() => localStorage.getItem("theme")), before ? "light" : "dark");
    const expected = before ? "light" : "dark";
    for (let i = 0; i < 20 && (await api("GET", "/auth/me", token)).body.user.preferences.theme !== expected; i++) await sleep(100);
    assert.equal((await api("GET", "/auth/me", token)).body.user.preferences.theme, expected, "saved to the account's preferences");
  });

  await t.test("the account menu: avatar, name and email, Settings, Escape closes it, Log out logs out", async () => {
    // The initials (no photo yet), then the first name (wide screens)
    assert.deepEqual((await page.$eval('button[aria-label="Account menu"]', (button) => button.innerText)).split(/\s+/).filter(Boolean), ["TU", "Test"]);
    await page.click('button[aria-label="Account menu"]');
    const menu = await page.$eval('[role="menu"]', (element) => element.innerText);
    assert.match(menu, /Test User/);
    assert.match(menu, /@example\.com/);
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Settings", "the first visible item has focus");
    assert.equal(await page.$eval('[role="menu"] a[href="/settings"]', (a) => a.textContent.trim()), "Settings");
    await page.keyboard.press("Escape");
    assert.equal(await page.$('[role="menu"]'), null, "closed");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Account menu", "focus back on the trigger");

    await page.click('button[aria-label="Account menu"]');
    await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.trim() === "Log out").click());
    await page.waitForFunction(() => location.pathname === "/" && !localStorage.getItem("token"), { timeout: 10000 });
  });

  await t.test("on a phone the main links are in the account menu", async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await logIn(page, token);
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    assert.deepEqual(await visible('nav[aria-label="Main"] a'), [], "no links in the bar");
    await page.$eval('button[aria-label="Account menu"]', (button) => button.click());
    assert.deepEqual(await visible('[role="menuitem"]'), ["Dashboard", "Tailor to a job", "ATS checker", "Settings", "Log out"]);
    await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.trim() === "ATS checker").click());
    // Wait for the rendered page (the marked link), not just the URL (see above)
    await page.waitForFunction(() => document.querySelector('nav[aria-label="Main"] a[aria-current="page"]')?.textContent === "ATS checker");
    assert.equal(await page.evaluate(() => location.pathname), "/ats-checker");
    assert.equal(await page.$('[role="menu"]'), null, "the menu closes after choosing");
  });
});
