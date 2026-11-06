// Browser test of "Download PDF": the resume editor and the cover letter, on a desktop and a
// phone, open the print dialog (where "Save as PDF" makes the file) with the resume's fonts
// loaded and the title as the file name.
//
// A headless browser can't show the print dialog, so print() is replaced in every frame the app
// reaches for, and records what the PDF would get. This guards against the bug where the
// dialog never opened: printing waited for font faces the page doesn't use, which never load.
//
// Run: node --test e2e/pdf-download.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, startStack } from "./helpers.js";
import { JOB_DESCRIPTION } from "./jobSamples.js";

const RESUME = {
  title: "Meera CV",
  template: "classic-navy",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com", location: "London, UK" },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [{ role: "Backend Engineer", company: "Harbour Health", startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js", "Cut Postgres query times by 60%"] }],
  skills: ["Node.js", "Redis"],
};

// Installed before the app loads: print() in any frame counts the call and notes what the PDF gets
function recordPrints() {
  if (window !== window.top) return;
  window.__prints = [];
  const contentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow");
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    get() {
      const frame = contentWindow.get.call(this);
      if (frame && !frame.__recorded) {
        frame.__recorded = true;
        frame.print = () => {
          const text = frame.document.querySelector("p, li");
          window.__prints.push({
            title: frame.document.title,
            text: frame.document.body.innerText.length,
            font: text ? frame.getComputedStyle(text).fontFamily.split(",")[0].replace(/"/g, "").trim() : null,
            loaded: [...frame.document.fonts].filter((face) => face.status === "loaded").map((face) => face.family),
          });
        };
      }
      return frame;
    },
  });
}

test("Download PDF opens the print dialog", async (t) => {
  const { browser, api, register } = await startStack(t, "pdf");
  const token = await register("pdf");
  const resume = (await api("POST", "/resumes", token, RESUME)).body;
  const { jobId } = (await api("POST", "/jobs/tailor", token, { resumeId: resume._id, job: { description: JOB_DESCRIPTION } })).body;
  const letter = (await api("POST", "/cover-letters/generate", token, { jobId })).body.coverLetter;
  assert.ok(letter?._id, "a cover letter to download");

  const viewports = { desktop: { width: 1400, height: 1000 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true } };
  const pages = [
    { name: "resume editor", path: `/editor/${resume._id}`, title: RESUME.title },
    { name: "cover letter", path: `/cover-letters/${letter._id}`, title: letter.title },
  ];

  for (const [size, viewport] of Object.entries(viewports)) {
    for (const entry of pages) {
      await t.test(`${entry.name}, ${size}`, async () => {
        const page = await browser.newPage();
        try {
          await page.setViewport(viewport);
          await page.evaluateOnNewDocument(recordPrints);
          await logIn(page, token);
          await page.goto(`${APP}${entry.path}`, { waitUntil: "networkidle0" });
          await page.waitForSelector("[data-page]");
          await page.click('button[aria-label="Download PDF"]');
          // The cover letter asks first while placeholders are left in it
          await page
            .waitForFunction(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === "Download anyway")?.click() ?? true, { timeout: 2000 })
            .catch(() => {});
          await page.waitForFunction(() => window.__prints.length > 0, { timeout: 15000 });
          const [printed] = await page.evaluate(() => window.__prints);
          assert.equal(printed.title, entry.title, "the title (the PDF's file name)");
          assert.ok(printed.text > 100, "the document is in the print frame");
          assert.ok(printed.font && printed.loaded.includes(printed.font), `its font is loaded when printing: ${printed.font} in ${printed.loaded}`);
          assert.equal(await page.evaluate(() => window.__prints.length), 1, "printed once");
        } finally {
          await page.close();
        }
      });
    }
  }
});
