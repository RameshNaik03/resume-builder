// Browser test of cover letters:
//   the match report's "Write cover letter" -> the generate form (German, Frau Schmidt) -> the editor:
//   the letter in the resume's own template (name header), the German greeting, subject line and
//   date, highlighted placeholders, the word count -> a hand edit (saved, marked edited) ->
//   Regenerate in English warns before replacing it -> Download PDF warns while placeholders are
//   unfilled -> regenerating with a "Why this company?" answer clears them -> the dashboard's
//   application card (role, company, fit label, links) and the job description link.
//
// Run: node --test e2e/coverLetter.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, sleep, startStack } from "./helpers.js";
import { JOB_DESCRIPTION } from "./jobSamples.js";

const RESUME = {
  title: "Meera CV",
  template: "classic-navy",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com", location: "London, UK" },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [
    { role: "Backend Engineer", company: "Harbour Health", startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js", "Cut Postgres query times by 60%"] },
    { role: "Software Engineer", company: "Tessellate", startDate: "Jul 2015", endDate: "Dec 2017", bullets: ["Moved 14 services to Kafka consumers"] },
  ],
  skills: ["Node.js", "Redis"],
};

test("Cover letters", async (t) => {
  const { browser, api, register } = await startStack(t, "letters");
  const token = await register("letters");
  const resume = (await api("POST", "/resumes", token, RESUME)).body;
  const tailored = (await api("POST", "/jobs/tailor", token, { resumeId: resume._id, job: { description: JOB_DESCRIPTION } })).body;
  const jobId = tailored.jobId;

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  await logIn(page, token);

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
  // The visible preview's text (page 1)
  const preview = () => page.$eval("[data-page]", (el) => el.innerText);
  const waitForPreview = (text) => page.waitForFunction((value) => document.querySelector("[data-page]")?.innerText.includes(value), { timeout: 20000 }, text);
  let letterId;

  await t.test("from the match report: generate a German letter for Frau Schmidt", async () => {
    await page.goto(`${APP}/tailor/jobs/${jobId}`, { waitUntil: "networkidle0" });
    await clickText("a", "Write cover letter");
    await page.waitForSelector("#new-recipient");
    await page.click('input[name="language"][value="de"]');
    await page.type("#new-recipient", "Anna Schmidt");
    await page.select("#new-salutation", "Frau");
    await clickText("button", "Write cover letter");
    await page.waitForFunction(() => /^\/cover-letters\/[a-f0-9]{24}$/.test(location.pathname), { timeout: 20000 });
    letterId = page.url().split("/").pop();
  });

  await t.test("the editor: the resume's template, a German letter, placeholders highlighted", async () => {
    await waitForPreview("Sehr geehrte Frau Schmidt,");
    const text = await preview();
    assert.ok(text.startsWith("Meera Iyer"), "the header is the resume's: the name first");
    assert.match(text, /Bewerbung als Senior Backend Engineer/);
    assert.match(text, /\d{1,2}\. [A-ZÄÖÜ][a-zäöü]+ \d{4}/, "a German date");
    assert.match(text, /Frau Anna Schmidt\s+Northbeam/, "the recipient block");
    assert.match(text, /Mit freundlichen Grüßen\nMeera Iyer/);
    assert.ok(await page.$("[data-page] mark.ats-placeholder"), "placeholders are highlighted in the preview");
    assert.match(await page.$eval('[data-testid="letter-placeholders"]', (el) => el.innerText), /\[Warum dieses Unternehmen\?/);
    assert.match(await page.$eval('[data-testid="word-count"]', (el) => el.innerText), /^\d+ words$/);
    assert.match(await page.evaluate(() => document.body.innerText), /Live preview · Classic Navy/i);
  });

  await t.test("a hand edit is saved and marked as edited", async () => {
    await page.click('[aria-label="Cover letter text"]');
    await page.keyboard.down("Control");
    await page.keyboard.press("End");
    await page.keyboard.up("Control");
    await page.keyboard.type(" P.S. Danke!");
    await page.waitForFunction(() => document.querySelector('[data-testid="letter-save-status"]').innerText === "Saved", { timeout: 10000 });
    await waitForPreview("P.S. Danke!");
    const saved = (await api("GET", `/cover-letters/${letterId}`, token)).body;
    assert.ok(saved.bodyEdited && saved.body.includes("P.S. Danke!"));
  });

  await t.test("Regenerate in English warns before replacing the edits", async () => {
    await page.click('input[name="regen-language"][value="en"]');
    await clickText("button", "Regenerate");
    await page.waitForFunction(() => document.body.innerText.includes("Replace your edits?"));
    await clickText("button", "Cancel");
    assert.ok((await preview()).includes("P.S. Danke!"), "cancel keeps the edits");

    await clickText("button", "Regenerate");
    await clickText("button", "Replace my edits");
    await waitForPreview("Dear Ms. Schmidt,");
    const text = await preview();
    assert.match(text, /Application for Senior Backend Engineer/);
    assert.ok(!text.includes("P.S. Danke!"));
  });

  await t.test("Download PDF warns while placeholders are unfilled", async () => {
    await clickText("button", "Download PDF");
    await page.waitForFunction(() => document.body.innerText.includes("Some placeholders are still unfilled"));
    assert.match(await page.evaluate(() => document.body.innerText), /\[Why this company\?/);
    await clickText("button", "Cancel");
  });

  await t.test("answering 'Why this company?' fills the placeholder", async () => {
    await page.type("#regen-why", "Your payments platform is the kind of system I like to build");
    await clickText("button", "Regenerate"); // Not edited since: no warning
    await waitForPreview("Your payments platform is the kind of system I like to build");
    await sleep(300);
    assert.equal(await page.$('[data-testid="letter-placeholders"]'), null, "no placeholders left");
    assert.equal(await page.$("[data-page] mark.ats-placeholder"), null);
  });

  await t.test("the dashboard groups the tailored resume, job and cover letter", async () => {
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    const card = await page.$eval('[data-testid="application-card"]', (el) => el.innerText);
    assert.match(card, /Senior Backend Engineer/);
    assert.match(card, /Northbeam/);
    assert.match(card, /\d+% · (Strong fit|Good fit|Stretch role)/);
    for (const link of ["Resume", "Cover letter", "Job description"]) assert.ok(card.includes(link), `${link} link`);
    // The tailored resume isn't repeated in the resume grid; the original is
    const titles = await page.$$eval("a[title]", (links) => links.map((a) => a.title));
    assert.ok(titles.includes("Meera CV") && !titles.includes(tailored.resume.title));

    await clickText('[data-testid="application-card"] a', "Cover letter");
    await page.waitForFunction((id) => location.pathname === `/cover-letters/${id}`, {}, letterId);

    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    await clickText('[data-testid="application-card"] a', "Job description");
    await page.waitForFunction(() => document.querySelector("#job-description")?.open && document.querySelector("#job-description").innerText.includes("Familiarity with GraphQL"), { timeout: 10000 });
  });
});
