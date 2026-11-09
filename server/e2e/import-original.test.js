// Browser test of uploading a resume and keeping its original design:
//   upload -> "Your original" (the real file, drawn) with two choices; nothing switches to a
//   template on its own -> "Edit with a matching template": the original beside the closest
//   template, styled like it -> "Use this" opens the editor with the matched design -> "View
//   original" in the editor. A second upload: "Keep my original design" -> its page (all pages,
//   download unchanged, ATS check on the file) -> the dashboard card shows the original.
//   "Choose a different template" keeps the user's section order and headings. A Word file
//   shows as a preview. Another user can't open someone's original.
//
// Run: node --test e2e/import-original.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP, logIn, startStack } from "./helpers.js";

const fixture = (name) => fileURLToPath(new URL(`../tests/fixtures/design/${name}`, import.meta.url));

test("Importing a resume keeps the original design", async (t) => {
  const { browser, api, register } = await startStack(t, "originals");
  const token = await register("originals");
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  await logIn(page, token);

  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const textOf = (selector) => page.$eval(selector, (el) => el.innerText);
  const clickText = (selector, text) =>
    page.evaluate(
      (sel, value) => {
        const element = [...document.querySelectorAll(sel)].find((el) => el.textContent.trim() === value);
        if (!element) throw new Error(`No ${sel} with text "${value}"`);
        element.click();
      },
      selector,
      text
    );
  const dialogTitle = () => page.$eval('[role="dialog"] h2', (el) => el.textContent.trim()).catch(() => null);
  // A drawn page: a canvas with something other than white on it
  const drawnPages = (scope = "") =>
    page.$$eval(`${scope} canvas[data-original-page]`, (canvases) =>
      canvases.map((canvas) => {
        const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        let ink = 0;
        for (let i = 0; i < data.length; i += 4 * 97) if (data[i] < 200) ink++;
        return { width: canvas.width, ink };
      })
    );
  const upload = async (name) => {
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    await clickText("button", "Upload");
    const input = await page.waitForSelector('[role="dialog"] input[type=file]');
    await input.uploadFile(fixture(name));
    await page.waitForFunction(() => document.querySelector('[role="dialog"] h2')?.textContent.trim() === "Your original", { timeout: 30000 });
    const resumes = (await api("GET", "/resumes", token)).body;
    return resumes.find((resume) => resume.original?.fileName === name);
  };
  let serif;
  let sans;

  await t.test("upload: the real file first, two clear choices, no template yet", async () => {
    serif = await upload("serif-centered.pdf");
    assert.ok(serif, "the resume was imported");
    await page.waitForSelector('[role="dialog"] canvas[data-original-page="1"][data-drawn]', { timeout: 20000 });
    const [first] = await drawnPages('[role="dialog"]');
    assert.ok(first.width > 200 && first.ink > 20, `the PDF's first page is drawn: ${JSON.stringify(first)}`);
    const dialog = await textOf('[role="dialog"]');
    assert.match(dialog, /serif-centered\.pdf · PDF · \d+\sKB/); // (a non-breaking space keeps "49 KB" together)
    assert.match(dialog, /Keep my original design/);
    assert.match(dialog, /Edit with a matching template/);
    assert.match(dialog, /Editing rebuilds your resume in one of our templates/);
    assert.equal(serif.template, null, "nothing switched to a template");
    assert.equal(new URL(page.url()).pathname, "/dashboard", "still on the dashboard");
  });

  await t.test("edit with a matching template: side by side, then Use this", async () => {
    await page.click('[data-testid="edit-with-template"]');
    await page.waitForSelector('[data-testid="matched-design"] canvas[data-original-page="1"]', { timeout: 20000 });
    assert.equal(await textOf('[data-testid="matched-template"]'), "Elegant Serif Burgundy");
    const notes = await textOf('[data-testid="match-notes"]');
    assert.match(notes, /Serif font: Georgia → Merriweather/);
    assert.match(notes, /Accent colour #7a2335/);
    assert.match(notes, /Centred header/);
    assert.match(notes, /“Work History”/);
    assert.ok(await page.$('[data-testid="matched-design"] [aria-hidden="true"] [data-page], [data-testid="matched-design"] [aria-hidden="true"]'), "the matched version is drawn");

    await clickText('[data-testid="matched-design"] button', "Use this");
    await page.waitForFunction((id) => location.pathname === `/editor/${id}`, { timeout: 15000 }, serif._id);
    const saved = (await api("GET", `/resumes/${serif._id}`, token)).body;
    assert.equal(saved.template, "elegant-serif-burgundy");
    assert.equal(saved.design.accentColor, "#7a2335");
    assert.equal(saved.design.fontFamily, "merriweather");
    assert.deepEqual(saved.design.sectionOrder.slice(0, 5), ["summary", "experience", "skills", "education", "additional"]);
    assert.equal(saved.design.sectionHeadings.experience, "Work History");
    assert.equal(saved.original.fileName, "serif-centered.pdf", "the original is kept");
  });

  await t.test("the editor's View original shows the file", async () => {
    await page.waitForSelector('button[aria-label="View original"]');
    await page.click('button[aria-label="View original"]');
    await page.waitForSelector('[role="dialog"] canvas[data-original-page="1"]', { timeout: 20000 });
    assert.equal(await dialogTitle(), "Your original");
    await page.keyboard.press("Escape");
  });

  await t.test("keep my original design: its page, every page drawn, download unchanged", async () => {
    sans = await upload("left-sans.pdf");
    await page.click('[data-testid="keep-original"]');
    await page.waitForFunction((id) => location.pathname === `/resumes/${id}/original`, { timeout: 10000 }, sans._id);
    await page.waitForFunction(() => {
      const canvases = [...document.querySelectorAll('[data-testid="original-view"] canvas[data-original-page]')];
      return canvases.length > 0 && canvases.every((canvas) => canvas.dataset.drawn);
    }, { timeout: 20000 });
    const pages = await drawnPages('[data-testid="original-view"]');
    assert.ok(pages.length >= 1 && pages.every((drawn) => drawn.ink > 20), `every page drawn: ${JSON.stringify(pages)}`);
    assert.match(await page.evaluate(() => document.body.innerText), /Exactly as you uploaded it/);
    assert.equal((await api("GET", `/resumes/${sans._id}`, token)).body.template, null, "still no template");

    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "resume-original-"));
    try {
      const cdp = await page.createCDPSession();
      await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: folder });
      await clickText("button", "Download");
      const file = path.join(folder, "left-sans.pdf");
      for (let i = 0; i < 50 && !fs.existsSync(file); i++) await new Promise((resolve) => setTimeout(resolve, 100));
      assert.ok(fs.existsSync(file), "downloaded with its own name");
      assert.ok(fs.readFileSync(file).equals(fs.readFileSync(fixture("left-sans.pdf"))), "byte for byte the uploaded file");
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  await t.test("check ATS score runs on the original file", async () => {
    await clickText("button", "Check ATS score");
    await page.waitForFunction(() => document.body.innerText.includes("Your ATS results"), { timeout: 30000 });
    assert.match(await page.evaluate(() => document.body.innerText), /left-sans\.pdf/);
    assert.ok(await page.$(`a[href="/resumes/${sans._id}/original"]`), "a link back to the original");
    const checked = (await api("GET", `/resumes/${sans._id}`, token)).body;
    assert.ok(checked.atsScore?.score > 0, "its score is saved as the resume's badge");
  });

  await t.test("dashboard: the kept original's card and the menus", async () => {
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    const card = `[data-testid="resume-card"][data-original="kept"]`;
    await page.waitForSelector(`${card} canvas[data-original-page="1"]`, { timeout: 20000 });
    assert.ok(await page.$(`${card} a[href="/resumes/${sans._id}/original"]`), "the card opens the original");
    assert.match(await textOf(card), /Your original PDF/);
    await page.click(`${card} button[aria-label^="Actions for"]`);
    const menu = await textOf(`${card} [role="menu"]`);
    assert.match(menu, /Edit with a matching template/);
    assert.match(menu, /View original/);
    await page.keyboard.press("Escape");
    const matched = `[data-testid="resume-card"][data-original="available"]`;
    await page.click(`${matched} button[aria-label^="Actions for"]`);
    assert.match(await textOf(`${matched} [role="menu"]`), /Open in editor[\s\S]*View original/);
    await page.keyboard.press("Escape");
  });

  await t.test("choose a different template keeps the section order and headings", async () => {
    await page.goto(`${APP}/resumes/${sans._id}/original?match=1`, { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-testid="matched-design"]');
    assert.match(await textOf('[data-testid="matched-template"]'), /^Modern Line /);
    await clickText('[data-testid="matched-design"] button', "Choose a different template");
    await page.waitForSelector('button[aria-label^="Use Classic in "]', { timeout: 15000 });
    await page.click('button[aria-label^="Use Classic in "]');
    await page.waitForFunction((id) => location.pathname === `/editor/${id}`, { timeout: 15000 }, sans._id);
    const saved = (await api("GET", `/resumes/${sans._id}`, token)).body;
    assert.match(saved.template, /^classic-/);
    assert.deepEqual(saved.design.sectionOrder.slice(0, 4), ["skills", "experience", "projects", "education"], "the file's own order");
    assert.equal(saved.design.sectionHeadings.skills, "Technical Skills");
    assert.equal(saved.design.accentColor, undefined, "the chosen template sets the look");
  });

  await t.test("a Word file shows as a preview", async () => {
    await upload("garamond-headings.docx");
    await page.waitForSelector('[role="dialog"] [data-testid="original-docx"]', { timeout: 15000 });
    const preview = await textOf('[role="dialog"] [data-testid="original-docx"]');
    assert.match(preview, /Meera Iyer/);
    assert.match(preview, /Professional Experience/);
    await page.keyboard.press("Escape");
  });

  await t.test("another user can't open someone's original", async () => {
    const other = await register("intruder");
    await logIn(page, other);
    await page.goto(`${APP}/resumes/${serif._id}/original`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.body.innerText.includes("We couldn't open this resume"), { timeout: 10000 });
    assert.equal(await page.$("canvas[data-original-page]"), null);
  });

  await t.test("no page errors", () => {
    assert.deepEqual(errors, []);
  });
});
