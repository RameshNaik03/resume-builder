// Browser test of Settings (/settings), on a desktop and on a phone:
//   - layout: a side nav on desktop (Profile open at /settings), a list of sections on a phone,
//     each section on its own page with a link back; no sideways scrolling at 390px
//   - Profile: name and contact details saved (with a toast) and used by new resumes; the
//     avatar cropped, uploaded (Cloudinary's answer is stood in for) and shown in the account
//     menu, then removed
//   - Email: a wrong password, "Check your new inbox", the link opened while logged out (log in,
//     then back to the link), and expired and invalid links
//   - Password: show/hide, the strength hint, mismatch, then other sessions are logged out
//   - Sessions: "Log out of all devices" after a confirmation
//   - Preferences: theme (applied at once), language, date format and the default template
//   - Your data: the ZIP download, and deleting the account (password + DELETE) ending on the
//     landing page with a message
//
// Run: node --test e2e/settings.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import User from "../models/User.js";
import { APP, OUT_DIR, logIn, sleep, startStack } from "./helpers.js";

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };
const SECTIONS = ["Profile", "Email", "Password", "Sessions", "Preferences", "Your data"];

// A small, real PNG (the crop step draws it on a canvas)
function png(width = 96, height = 96) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from([43, 74, 111]))]);
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(height).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

test("Settings", async (t) => {
  const { browser, api, register, apiOutput } = await startStack(t, "settings");
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);

  // ---------- Helpers ----------
  const me = async (token) => (await api("GET", "/auth/me", token)).body.user;
  const login = async (email, password = "secret123") => (await api("POST", "/auth/login", undefined, { email, password })).body.token;
  const waitText = (text, timeout = 10000) => page.waitForFunction((value) => document.body.innerText.includes(value), { timeout }, text);
  const token = () => page.evaluate(() => localStorage.getItem("token"));
  const open = async (pathname) => {
    await page.goto(`${APP}${pathname}`, { waitUntil: "networkidle0" });
  };
  // The input for a visible label ("Phone" also finds "Phone (optional)")
  const inputFor = async (label) => {
    const id = await page.evaluate((name) => {
      const found = [...document.querySelectorAll("label")].find((element) => element.offsetParent !== null && element.textContent.trim().replace(/ \(optional\)$/, "") === name);
      return found?.htmlFor ?? null;
    }, label);
    assert.ok(id, `a field labelled "${label}"`);
    return `[id="${id}"]`;
  };
  const fill = async (label, value) => {
    const selector = await inputFor(label);
    await page.$eval(selector, (input) => {
      input.focus();
      input.select?.();
    });
    await page.keyboard.press("Backspace");
    if (value) await page.type(selector, value);
  };
  // Clicks the visible button (or link) whose text is exactly `text`, inside `scope`
  const click = (text, scope = "body") =>
    page.evaluate(
      (value, within) => {
        const root = document.querySelector(within);
        const element = [...root.querySelectorAll("button, a")].find((el) => el.offsetParent !== null && el.textContent.trim() === value);
        if (!element) throw new Error(`No visible button or link "${value}" in ${within}`);
        element.click();
      },
      text,
      scope
    );
  const isDisabled = (text, scope = "body") =>
    page.evaluate((value, within) => [...document.querySelector(within).querySelectorAll("button")].find((el) => el.textContent.trim() === value)?.disabled, text, scope);
  const sectionTitle = () => page.evaluate(() => [...document.querySelectorAll("main h2")].find((h) => h.offsetParent !== null)?.textContent.trim() ?? null);
  // Opens a section from the nav or list (a link holds its label and, on phones, a description)
  const openSection = (label) =>
    page.evaluate((name) => {
      const link = [...document.querySelectorAll('nav[aria-label="Settings"] a')].find((a) => a.offsetParent !== null && a.querySelector("span span").textContent.trim() === name);
      if (!link) throw new Error(`No visible section link "${name}"`);
      link.click();
    }, label);
  const navLinks = () => page.$$eval('nav[aria-label="Settings"] a', (links) => links.filter((a) => a.offsetParent !== null).map((a) => a.querySelector("span span").textContent.trim()));
  const noOverflow = async (label) => {
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= PHONE.width, `${label} is ${width}px wide on a 390px phone`);
  };
  // Waits until the account's preferences match (they're saved in the background)
  const waitPrefs = async (accountToken, expected) => {
    let prefs;
    for (let i = 0; i < 40; i++) {
      prefs = (await me(accountToken)).preferences;
      if (Object.entries(expected).every(([key, value]) => prefs[key] === value)) return prefs;
      await sleep(100);
    }
    assert.fail(`preferences ${JSON.stringify(prefs)} should include ${JSON.stringify(expected)}`);
  };
  const confirmLinks = () => [...apiOutput().matchAll(/\/confirm-email\/([a-f0-9]{64})/g)].map((match) => match[1]);

  let mainToken = await register("settings");
  let mainEmail = (await me(mainToken)).email;

  // ---------- Desktop ----------

  await t.test("desktop: the side nav, with Profile open at /settings", async () => {
    await logIn(page, mainToken);
    await open("/settings");
    assert.deepEqual(await navLinks(), SECTIONS);
    assert.equal(await sectionTitle(), "Profile");
    assert.equal(await page.$('nav[aria-label="Settings"] a[aria-current="page"]'), null, "nothing marked current at /settings");
    for (const label of SECTIONS) {
      await openSection(label);
      await page.waitForFunction((name) => document.querySelector('nav[aria-label="Settings"] a[aria-current="page"]')?.textContent.includes(name), {}, label);
      assert.equal(await sectionTitle(), label);
    }
    assert.equal(await page.evaluate(() => location.pathname), "/settings/data");
    await open("/settings/nonsense");
    assert.equal(await page.evaluate(() => location.pathname), "/settings", "an unknown section goes back to /settings");
  });

  await t.test("desktop: the account menu links to Settings", async () => {
    await open("/dashboard");
    await page.click('button[aria-label="Account menu"]');
    await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.trim() === "Settings").click());
    await page.waitForFunction(() => location.pathname === "/settings");
  });

  await t.test("profile: name and contact details save with a toast, and fill new resumes", async () => {
    await open("/settings/profile");
    assert.equal(await isDisabled("Save profile"), true, "nothing to save yet");
    await fill("Name", "");
    await page.$eval("form", (form) => form.requestSubmit());
    await waitText("Name is required");

    await fill("Name", "Nadia Okafor");
    await fill("Phone", "+49 30 1234567");
    await fill("Location", "Berlin, Germany");
    await fill("LinkedIn", "linkedin.com/in/nadia");
    await fill("GitHub", "github.com/nadia");
    await fill("Website", "not a website");
    await click("Save profile");
    await page.waitForSelector('main [role="alert"]', { timeout: 10000 });
    assert.match(await page.$eval('main [role="alert"]', (element) => element.innerText), /Website must be/, "the server's message");

    await fill("Website", "nadia.dev");
    await click("Save profile");
    await waitText("Profile saved");
    const user = await me(mainToken);
    assert.equal(user.name, "Nadia Okafor");
    assert.deepEqual(user.contactDefaults, { phone: "+49 30 1234567", location: "Berlin, Germany", linkedin: "linkedin.com/in/nadia", github: "github.com/nadia", website: "nadia.dev" });
    await page.click('button[aria-label="Account menu"]');
    assert.match(await page.$eval('[role="menu"]', (menu) => menu.innerText), /Nadia Okafor/, "the menu shows the new name");
    await page.keyboard.press("Escape");

    await open("/settings/profile");
    assert.equal(await page.$eval(await inputFor("Website"), (input) => input.value), "nadia.dev", "kept after a reload");
    const resume = (await api("POST", "/resumes", mainToken, {})).body;
    assert.equal(resume.personalInfo.website, "nadia.dev", "a new resume starts with the contact details");
  });

  await t.test("profile: the avatar is cropped, uploaded, shown in the account menu, then removed", async () => {
    const user = await me(mainToken);
    const avatar = `data:image/png;base64,${png(8, 8).toString("base64")}`;
    // The API has no Cloudinary keys in tests: its answer to the upload is stood in for here
    const uploads = [];
    const standIn = (request) => {
      if (request.method() === "PATCH" && request.url().endsWith("/account/profile") && (request.headers()["content-type"] ?? "").startsWith("multipart/form-data")) {
        uploads.push(request.headers()["content-type"]);
        request.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": APP }, body: JSON.stringify({ user: { ...user, avatarUrl: avatar } }) });
      } else request.continue();
    };
    await page.setRequestInterception(true);
    page.on("request", standIn);
    try {
      const file = path.join(OUT_DIR, "settings-avatar.png");
      fs.writeFileSync(file, png());
      const input = await page.$('[data-testid="avatar-input"]');
      await input.uploadFile(file);
      await page.waitForSelector('[role="dialog"]');
      assert.match(await page.$eval('[role="dialog"]', (dialog) => dialog.innerText), /Crop your photo/);
      await click("Save photo", '[role="dialog"]');
      await waitText("Photo added");
      assert.equal(uploads.length, 1, "uploaded once, as a form");
      assert.equal(await page.$('[role="dialog"]'), null, "the crop dialog closed");
      assert.equal(await page.$eval('button[aria-label="Account menu"] img', (img) => img.src), avatar, "the avatar in the top bar");
    } finally {
      page.off("request", standIn);
      await page.setRequestInterception(false);
    }

    await click("Remove");
    await page.waitForSelector('[role="dialog"]');
    await click("Remove photo", '[role="dialog"]');
    await waitText("Photo removed");
    assert.equal(await page.$('button[aria-label="Account menu"] img'), null, "initials again");
    assert.match(await page.$eval('button[aria-label="Account menu"]', (button) => button.innerText), /NO/);
  });

  await t.test("email: wrong password, then 'Check your new inbox'", async () => {
    await open("/settings/email");
    assert.equal(await page.$eval('[data-testid="current-email"]', (element) => element.textContent.trim()), mainEmail);
    const newEmail = `new-${mainEmail}`;
    await fill("New email", newEmail);
    await fill("Current password", "wrong-password");
    await click("Send confirmation link");
    await page.waitForSelector('main [role="alert"]', { timeout: 10000 });
    assert.match(await page.$eval('main [role="alert"]', (element) => element.innerText), /incorrect/);

    await fill("Current password", "secret123");
    await click("Send confirmation link");
    await page.waitForSelector('[data-testid="check-inbox"]', { timeout: 10000 });
    assert.match(await page.$eval('[data-testid="check-inbox"]', (element) => element.innerText), new RegExp(`Check your new inbox[\\s\\S]*${newEmail.replace(/[.+]/g, "\\$&")}`));
    await open("/settings/email");
    assert.ok(await page.$('[data-testid="check-inbox"]'), "still waiting after a reload");
    assert.equal((await me(mainToken)).email, mainEmail, "the email doesn't change yet");
  });

  await t.test("email: the link opened while logged out -> log in -> back to the link -> changed", async () => {
    const link = confirmLinks().at(-1);
    assert.ok(link, "the API printed the confirmation link (no RESEND_API_KEY)");
    await logIn(page, null);
    await open(`/confirm-email/${link}`);
    await page.waitForFunction(() => location.pathname === "/login");
    await fill("Email", mainEmail);
    await fill("Password", "secret123");
    await page.click("button[type=submit]");
    await page.waitForSelector('[data-testid="confirm-email-success"]', { timeout: 15000 });
    assert.equal(await page.evaluate(() => location.pathname), `/confirm-email/${link}`, "back on the link");
    mainEmail = `new-${mainEmail}`;
    assert.match(await page.$eval('[data-testid="confirm-email-success"]', (element) => element.innerText), new RegExp(mainEmail.replace(/[.+]/g, "\\$&")));
    mainToken = await token();
    assert.equal((await me(mainToken)).email, mainEmail);
  });

  await t.test("email: an expired link and an invalid link", async () => {
    await open("/settings/email");
    await fill("New email", `third-${mainEmail}`);
    await fill("Current password", "secret123");
    await click("Send confirmation link");
    await page.waitForSelector('[data-testid="check-inbox"]', { timeout: 10000 });
    await click("Send again or use a different address");
    assert.ok(await page.$("form"), "the form again");
    const link = confirmLinks().at(-1);
    await User.updateOne({ email: mainEmail }, { emailChangeExpires: new Date(Date.now() - 1000) });
    await open(`/confirm-email/${link}`);
    await page.waitForSelector('[data-testid="confirm-email-expired"]', { timeout: 10000 });
    assert.ok(await page.$('main a[href="/settings/email"]'), "a way to ask for a new link");
    await open(`/confirm-email/${"f".repeat(64)}`);
    await page.waitForSelector('[data-testid="confirm-email-invalid"]', { timeout: 10000 });
  });

  await t.test("password: show/hide, the strength hint, mismatch, then other sessions are logged out", async () => {
    const otherSession = await login(mainEmail);
    await open("/settings/password");
    await fill("Current password", "secret123");
    await fill("New password", "sunset1");
    await page.waitForSelector('[data-testid="password-strength"]');
    assert.match(await page.$eval('[data-testid="password-strength"]', (element) => element.innerText), /Weak/);
    await fill("New password", "Sunset-beach-17-blue");
    assert.match(await page.$eval('[data-testid="password-strength"]', (element) => element.innerText), /Strong/);
    const newInput = await inputFor("New password");
    await page.evaluate((selector) => document.querySelector(selector).parentElement.querySelector('button[aria-label="Show password"]').click(), newInput);
    assert.equal(await page.$eval(newInput, (input) => input.type), "text", "shown");
    await page.evaluate((selector) => document.querySelector(selector).parentElement.querySelector('button[aria-label="Hide password"]').click(), newInput);
    assert.equal(await page.$eval(newInput, (input) => input.type), "password", "hidden again");

    await fill("Confirm new password", "Sunset-beach-17-bleu");
    await click("Change password");
    await waitText("Passwords do not match");
    await fill("Confirm new password", "Sunset-beach-17-blue");
    await fill("Current password", "wrong-password");
    await click("Change password");
    await page.waitForSelector('main [role="alert"]', { timeout: 10000 });
    assert.match(await page.$eval('main [role="alert"]', (element) => element.innerText), /incorrect/);

    const before = await token();
    await fill("Current password", "secret123");
    await click("Change password");
    await waitText("Password changed");
    const after = await token();
    assert.notEqual(after, before, "this device got a new token");
    assert.equal((await api("GET", "/auth/me", otherSession)).status, 401, "another session is logged out");
    assert.equal((await api("GET", "/auth/me", before)).status, 401, "the old token here stopped working");
    await open("/settings/password");
    assert.equal(await sectionTitle(), "Password", "still logged in here");
    assert.ok(await login(mainEmail, "Sunset-beach-17-blue"), "the new password logs in");
    mainToken = after;
  });

  await t.test("preferences: theme applies at once; language, date format and default template are saved", async () => {
    await open("/settings/preferences");
    const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const choose = (group, option) =>
      page.evaluate(
        (groupName, optionName) => {
          const heading = [...document.querySelectorAll("main h3")].find((h) => h.textContent.trim() === groupName);
          const radio = [...document.querySelectorAll(`[role="radiogroup"][aria-labelledby="${heading.id}"] [role="radio"]`)].find((r) => r.textContent.trim() === optionName);
          radio.click();
        },
        group,
        option
      );

    await choose("Theme", "Dark");
    assert.equal(await dark(), true, "dark at once");
    await waitPrefs(mainToken, { theme: "dark" });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await choose("Theme", "System");
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"), { timeout: 3000 });
    await waitPrefs(mainToken, { theme: "system" });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

    await choose("Language", "Deutsch");
    await choose("Date format", "01/2024");
    await waitPrefs(mainToken, { language: "de", dateFormat: "numeric" });

    await click("Change template");
    await page.waitForSelector('[role="dialog"] button[aria-label^="Use Modern Line"]', { timeout: 15000 });
    const chosen = await page.$eval('[role="dialog"] button[aria-label^="Use Modern Line"]', (button) => button.getAttribute("aria-label"));
    await page.$eval('[role="dialog"] button[aria-label^="Use Modern Line"]', (button) => button.click());
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
    assert.match(await page.$eval('[data-testid="default-template"]', (element) => element.textContent), /^Modern Line /, chosen);
    const prefs = await waitPrefs(mainToken, { language: "de" });
    assert.match(prefs.defaultTemplate, /^modern-line-/);

    await open("/settings/preferences");
    assert.equal(await page.$eval('[role="radio"][aria-checked="true"]', (radio) => radio.textContent.trim()), "System", "kept after a reload");
    const resume = (await api("POST", "/resumes", mainToken, {})).body;
    assert.equal(resume.template, prefs.defaultTemplate, "a new resume uses the default template");
    assert.equal(resume.design.dateFormat, "numeric", "and the date format");
  });

  await t.test("sessions: log out of all devices, after a confirmation", async () => {
    const otherSession = await login(mainEmail, "Sunset-beach-17-blue");
    await open("/settings/sessions");
    await click("Log out of all devices");
    await page.waitForSelector('[role="dialog"]');
    await click("Cancel", '[role="dialog"]');
    assert.equal(await page.$('[role="dialog"]'), null, "Cancel closes it");
    assert.equal((await api("GET", "/auth/me", otherSession)).status, 200, "nothing happened");

    await click("Log out of all devices");
    await page.waitForSelector('[role="dialog"]');
    await click("Log out everywhere", '[role="dialog"]');
    await page.waitForFunction(() => location.pathname === "/login" && !localStorage.getItem("token"), { timeout: 10000 });
    await waitText("logged out on every device");
    assert.equal((await api("GET", "/auth/me", otherSession)).status, 401, "the other device is logged out");
    assert.equal((await api("GET", "/auth/me", mainToken)).status, 401, "and this one");
    mainToken = await login(mainEmail, "Sunset-beach-17-blue");
  });

  await t.test("your data: the ZIP download, and the danger zone set apart", async () => {
    await logIn(page, mainToken);
    await open("/settings/data");
    const folder = fs.mkdtempSync(path.join(OUT_DIR, "settings-download-"));
    const cdp = await browser.target().createCDPSession();
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: folder });
    await click("Download my data");
    let zip;
    for (let i = 0; i < 100 && !zip; i++) {
      zip = fs.readdirSync(folder).find((name) => name.endsWith(".zip"));
      if (!zip) await sleep(150);
    }
    assert.match(zip ?? "", /^resume-builder-export-\d{4}-\d{2}-\d{2}\.zip$/);
    await sleep(300); // Let the file finish writing
    assert.equal(fs.readFileSync(path.join(folder, zip)).subarray(0, 2).toString(), "PK", "a ZIP file");

    const zone = await page.$eval('[data-testid="danger-zone"]', (section) => ({ text: section.innerText, hasDownload: section.innerText.includes("Download") }));
    assert.match(zone.text, /Danger zone[\s\S]*Delete account/);
    assert.equal(zone.hasDownload, false, "the download isn't in the danger zone");
  });

  await t.test("your data: delete the account (password + DELETE), then the landing page with a message", async () => {
    const doomed = await register("doomed");
    const doomedEmail = (await me(doomed)).email;
    await api("POST", "/resumes", doomed, { title: "To be deleted" });
    await logIn(page, doomed);
    await open("/settings/data");
    await click("Delete account");
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await isDisabled("Delete my account", '[role="dialog"]'), true, "disabled until filled in");
    await fill("Current password", "wrong-password");
    await fill("Type DELETE to confirm", "delete");
    assert.equal(await isDisabled("Delete my account", '[role="dialog"]'), true, "lowercase doesn't count");
    await fill("Type DELETE to confirm", "DELETE");
    assert.equal(await isDisabled("Delete my account", '[role="dialog"]'), false);
    await click("Delete my account", '[role="dialog"]');
    await page.waitForSelector('[role="dialog"] [role="alert"]', { timeout: 10000 });
    assert.match(await page.$eval('[role="dialog"] [role="alert"]', (element) => element.innerText), /incorrect/);
    assert.equal((await api("GET", "/auth/me", doomed)).status, 200, "not deleted");

    await fill("Current password", "secret123");
    await click("Delete my account", '[role="dialog"]');
    await page.waitForSelector('[data-testid="account-deleted-notice"]', { timeout: 15000 });
    assert.equal(await page.evaluate(() => location.pathname), "/");
    assert.equal(await token(), null, "logged out");
    assert.match(await page.$eval("header", (header) => header.innerText), /Log in/);
    assert.equal(await login(doomedEmail), undefined, "the account is gone");
    await page.click('[data-testid="account-deleted-notice"] button[aria-label="Dismiss"]');
    // (Dismissing clears the navigation state, which renders in a transition)
    await page.waitForFunction(() => !document.querySelector('[data-testid="account-deleted-notice"]'), { timeout: 3000 });
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.$('[data-testid="account-deleted-notice"]'), null, "and it doesn't come back on a reload");
  });

  // ---------- Phone ----------

  await t.test("phone: /settings is the list of sections; each opens on its own page", async () => {
    await page.setViewport(PHONE);
    await logIn(page, mainToken);
    await open("/settings");
    assert.deepEqual(await navLinks(), SECTIONS);
    assert.equal(await sectionTitle(), null, "no section open yet");
    assert.match(await page.$eval('nav[aria-label="Settings"]', (nav) => nav.innerText), /Name, photo and contact details/, "each with a description");
    await noOverflow("/settings");

    for (const label of SECTIONS) {
      await openSection(label);
      await page.waitForFunction((name) => [...document.querySelectorAll("main h2")].some((h) => h.offsetParent !== null && h.textContent.trim() === name), {}, label);
      assert.deepEqual(await navLinks(), [], `${label}: the list is hidden`);
      await sleep(300); // Thumbnails and fonts settle
      await noOverflow(label);
      await click("All settings");
      // The rendered list, not just the URL (React Router renders the new page in a transition)
      await page.waitForFunction(() => location.pathname === "/settings" && document.querySelector('nav[aria-label="Settings"]')?.offsetParent !== null);
    }
  });

  await t.test("phone: each section works", async () => {
    // Profile
    await open("/settings/profile");
    await fill("Location", "Hamburg, Germany");
    await click("Save profile");
    await waitText("Profile saved");
    assert.equal((await me(mainToken)).contactDefaults.location, "Hamburg, Germany");

    // Email
    await open("/settings/email");
    assert.ok(await page.$('[data-testid="current-email"]'));
    assert.ok(await inputFor("New email"));

    // Password: the strength hint
    await open("/settings/password");
    await fill("New password", "sunset");
    assert.match(await page.$eval('[data-testid="password-strength"]', (element) => element.innerText), /Weak/);

    // Sessions: the confirmation opens and cancels
    await open("/settings/sessions");
    await click("Log out of all devices");
    await page.waitForSelector('[role="dialog"]');
    await noOverflow("the log-out dialog");
    await click("Cancel", '[role="dialog"]');

    // Preferences: a change applies at once
    await open("/settings/preferences");
    await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].find((radio) => radio.textContent.trim() === "English").click());
    await waitPrefs(mainToken, { language: "en" });

    // Your data: the delete dialog fits the screen
    await open("/settings/data");
    await click("Delete account");
    await page.waitForSelector('[role="dialog"]');
    await noOverflow("the delete dialog");
    await click("Cancel", '[role="dialog"]');
  });

  await t.test("phone: the account menu has Settings", async () => {
    await open("/dashboard");
    await page.$eval('button[aria-label="Account menu"]', (button) => button.click());
    const items = await page.$$eval('[role="menuitem"]', (elements) => elements.filter((element) => element.offsetParent !== null).map((element) => element.textContent.trim()));
    assert.ok(items.includes("Settings"), items.join());
  });
});
