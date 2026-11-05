// Browser test of the pages anyone can open: the landing page, the sign-in pages (sign up, log
// in, forgot and reset password) and the 404.
//   - landing: the headline, one primary action, the ATS checker link, real template
//     thumbnails, and no motion at all when reduced motion is asked for
//   - sign-in pages: the wordmark above one card, inline errors on the fields (linked for
//     screen readers), server errors in an alert, and the flows still work end to end
//   - 404: a calm message and a link home
//
// Run: node --test e2e/auth-pages.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, startStack } from "./helpers.js";

test("landing, sign-in pages and 404", async (t) => {
  const { browser } = await startStack(t, "authpages");
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const text = (selector = "body") => page.$eval(selector, (element) => element.innerText);
  const email = `auth${Date.now()}@example.com`;

  // The error shown for a field, found through its aria-describedby (as a screen reader would)
  const fieldError = (label) =>
    page.evaluate((name) => {
      const labelElement = [...document.querySelectorAll("label")].find((element) => element.textContent.trim() === name);
      const input = labelElement && document.getElementById(labelElement.htmlFor);
      const ids = input?.getAttribute("aria-describedby")?.split(" ") ?? [];
      return { invalid: input?.getAttribute("aria-invalid") === "true", message: ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ") };
    }, label);

  await t.test("landing: headline, one primary action, the ATS link and real thumbnails", async () => {
    await logIn(page, null);
    await page.goto(`${APP}/`, { waitUntil: "networkidle0" });
    assert.match(await text("h1"), /A resume that's clear, honest and ready to send\./);
    const build = await page.$$eval("main a", (links) => links.filter((a) => a.textContent.trim() === "Build my resume").map((a) => a.getAttribute("href")));
    assert.ok(build.length >= 1 && build.every((href) => href === "/register"), `Build my resume -> /register: ${build}`);
    assert.ok(await page.$('main a[href="/ats-checker"]'), "a link to the ATS checker");
    for (const heading of ["How it works", "What makes it different"]) assert.match(await text("main"), new RegExp(heading));
    assert.equal(await page.$$eval("main figure > div > div", (sheets) => sheets.length), 3, "three template thumbnails");
    assert.match(await text("footer"), /ResumeCraft/);
    assert.equal(await page.$eval("header a", (a) => a.textContent.trim()), "ResumeCraft", "the AppShell's logo");
  });

  await t.test("landing: nothing moves with reduced motion (and nothing loops without it)", async () => {
    const loops = await page.evaluate(() => document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations === Infinity).length);
    assert.equal(loops, 0, "no looping animation");
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, "no animation at all");
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  });

  await t.test("sign up: the wordmark above one card, inline errors, then the dashboard", async () => {
    await page.goto(`${APP}/register`, { waitUntil: "networkidle0" });
    assert.equal(await page.$("header nav"), null, "no app navigation on sign-in pages");
    assert.equal(await page.$eval("main > a", (a) => a.textContent.trim()), "ResumeCraft");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("Name is required"));
    const name = await fieldError("Full name");
    assert.ok(name.invalid && name.message.includes("Name is required"), JSON.stringify(name));

    const fill = async (label, value) => {
      const id = await page.evaluate((labelText) => [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === labelText).htmlFor, label);
      await page.$eval(`[id="${id}"]`, (input) => (input.value = ""));
      await page.type(`[id="${id}"]`, value);
    };
    await fill("Full name", "Asha Rao");
    await fill("Email", email);
    await fill("Password", "secret123");
    await fill("Confirm password", "secret999");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("Passwords do not match"));
    assert.ok((await fieldError("Confirm password")).message.includes("Passwords do not match"));

    await fill("Confirm password", "secret123");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 15000 });
  });

  await t.test("log in: a wrong password shows the server's message in an alert", async () => {
    await logIn(page, null);
    await page.goto(`${APP}/login`, { waitUntil: "networkidle0" });
    const emailId = await page.evaluate(() => [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === "Email").htmlFor);
    const passwordId = await page.evaluate(() => [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === "Password").htmlFor);
    await page.type(`[id="${emailId}"]`, email);
    await page.type(`[id="${passwordId}"]`, "wrong-password");
    await page.click("button[type=submit]");
    await page.waitForSelector('[role="alert"]', { timeout: 10000 });
    assert.ok((await text('[role="alert"]')).length > 0, "the server's message");
    assert.ok(await page.$('a[href="/forgot-password"]'), "Forgot password? beside the label");

    await page.click('button[aria-label="Show password"]');
    assert.equal(await page.$eval(`[id="${passwordId}"]`, (input) => input.type), "text", "the eye button shows the password");
    await page.$eval(`[id="${passwordId}"]`, (input) => (input.value = ""));
    await page.type(`[id="${passwordId}"]`, "secret123");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 15000 });
  });

  await t.test("forgot password: the 'check your email' message", async () => {
    await logIn(page, null);
    await page.goto(`${APP}/forgot-password`, { waitUntil: "networkidle0" });
    await page.type('input[type="email"]', email);
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("Check your email"), { timeout: 10000 });
    assert.match(await text('[role="status"]'), new RegExp(email.replace(".", "\\.")));
  });

  await t.test("reset password: a bad link says so and offers a new one", async () => {
    await page.goto(`${APP}/reset-password/not-a-real-token`, { waitUntil: "networkidle0" });
    const inputs = await page.$$('input[type="password"]');
    await inputs[0].type("secret456");
    await inputs[1].type("secret456");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("This link is not valid"), { timeout: 10000 });
    assert.ok(await page.$('a[href="/forgot-password"]'), "Request a new link");
  });

  await t.test("404: calm, with a link home", async () => {
    await page.goto(`${APP}/no-such-page`, { waitUntil: "networkidle0" });
    assert.match(await text("h1"), /This page doesn't exist/);
    assert.ok(await page.$('main a[href="/"]'), "Back to home");
    const gradient = await page.evaluate(() => [...document.querySelectorAll("main *")].some((element) => getComputedStyle(element).backgroundImage.includes("gradient")));
    assert.equal(gradient, false, "no gradient");
  });
});
