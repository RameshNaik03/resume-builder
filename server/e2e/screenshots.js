// Screenshots of every page, for design reviews (not a test): desktop and phone width in light
// mode, and desktop in dark mode, against a throwaway database with a sample resume, an ATS
// review, a tailored job and a cover letter.
//
// Run: node e2e/screenshots.js [output folder] [name filter] (in server/; default folder:
// <temp>/resume-builder-screens; the filter keeps pages whose name contains it, e.g. "dev-ui")
// Uses the browser tests' stack (e2e/helpers.js): the same ports and browser settings.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP, logIn, sleep, startStack } from "./helpers.js";
import galleryResume from "../../client/src/pages/dev/galleryResume.js";

const OUT = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), "resume-builder-screens"));
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, theme: "light" },
  { name: "phone", width: 390, height: 844, theme: "light", mobile: true },
  { name: "desktop-dark", width: 1440, height: 900, theme: "dark" },
];

const JOB = `Senior Frontend Engineer
Lumen Health is hiring a Senior Frontend Engineer to build our patient web app.

What you'll do
- Build accessible, responsive interfaces in React and TypeScript
- Own our design system and component library
- Improve page load performance and Core Web Vitals
- Work closely with designers and backend engineers

Requirements
- 5+ years of experience with React, TypeScript and JavaScript
- Strong HTML, CSS and accessibility (WCAG) skills
- Experience with testing (Jest, Cypress) and CI/CD

Nice to have
- Next.js, GraphQL, Figma`;

// The stack's cleanup runs when this "test context" ends
const cleanups = [];
const context = { after: (fn) => cleanups.push(fn) };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, api, register } = await startStack(context, "screenshots");
  const token = await register("screens");

  // ---------- The data every page needs ----------
  const must = async (method, url, body) => {
    const r = await api(method, url, token, body);
    if (r.status >= 300) throw new Error(`${method} ${url} -> ${r.status}: ${r.body.message}`);
    return r.body;
  };
  const sample = (template, title) => {
    const { photoUrl, ...personalInfo } = galleryResume(template, false).personalInfo;
    void photoUrl; // Photos are uploaded through their own route
    // The gallery's entries have made-up ids ("gallery-exp-1"); the database makes its own
    const withoutIds = (list) => (list ?? []).map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "_id")));
    const data = galleryResume(template, false);
    return { ...data, personalInfo, title, ...Object.fromEntries(["experience", "education", "projects", "additional"].map((key) => [key, withoutIds(data[key])])) };
  };
  const resume = await must("POST", "/resumes", sample("classic-navy", "Priya Raman – Frontend"));
  await must("POST", "/resumes", sample("sidebar-pro-navy", "Priya Raman – Sidebar"));
  const optimized = await must("POST", "/ats/optimize", { resumeId: resume._id, jobDescription: JOB });
  const { analysis } = await must("POST", "/jobs/analyze", { jobDescription: JOB });
  const tailored = await must("POST", "/jobs/tailor", { resumeId: resume._id, job: { description: JOB, analysis }, options: { maxBulletsPerJob: 4 } });
  const { coverLetter: letter } = await must("POST", "/cover-letters/generate", { jobId: tailored.jobId, whyCompany: "I've used Lumen's app as a patient and want to make it easier for everyone." });

  // ---------- The pages: [name, path, logged in?, prepare(page)] ----------
  const clickText = (page, selector, text) =>
    page.evaluate(
      (sel, value) => {
        // An exact match first ("Priya Raman – Frontend", not "... (ATS-optimized)")
        const elements = [...document.querySelectorAll(sel)];
        const element = elements.find((el) => el.textContent.trim() === value) ?? elements.find((el) => el.textContent.trim().includes(value));
        if (!element) throw new Error(`No ${sel} with "${value}"`);
        element.click();
      },
      selector,
      text
    );
  const PAGES = [
    ["01-landing", "/", false],
    ["02-login", "/login", false],
    ["03-register", "/register", false],
    ["04-forgot-password", "/forgot-password", false],
    ["05-reset-password", "/reset-password/sample-token", false],
    ["06-not-found", "/this-page-does-not-exist", false],
    ["07-dashboard", "/dashboard", true],
    ["08-editor", `/editor/${resume._id}`, true],
    ["09-editor-design", `/editor/${resume._id}`, true, (page) => clickText(page, "[role=tab]", "Design")],
    [
      "10-template-picker",
      `/editor/${resume._id}`,
      true,
      async (page) => {
        await page.$eval('button[aria-label="Templates"]', (button) => button.click());
        await sleep(3000); // The thumbnails render one by one
      },
    ],
    ["11-ats-checker", "/ats-checker", true],
    [
      "12-ats-results",
      "/ats-checker",
      true,
      async (page) => {
        await clickText(page, "[role=tab]", "My resumes");
        await clickText(page, "[role=radio]", "Priya Raman – Frontend");
        await page.$eval("button[type=submit]", (button) => button.click()); // (a tap can miss on the phone viewport)
        await page.waitForFunction(() => document.body.innerText.includes("What the ATS sees"), { timeout: 30000 });
      },
    ],
    ["13-ats-review", `/ats/review/${optimized.resume._id}`, true],
    ["14-tailor-input", `/tailor?resume=${resume._id}`, true],
    [
      "15-tailor-options",
      `/tailor?resume=${resume._id}`,
      true,
      async (page) => {
        await page.select("#saved-job", tailored.jobId);
        await page.waitForSelector('[data-testid="tailor-options"]', { timeout: 15000 });
      },
    ],
    ["16-match-report", `/tailor/jobs/${tailored.jobId}`, true],
    ["17-cover-letter", `/cover-letters/${letter._id}`, true],
    ["18-dev-ui", "/dev/ui", false], // The design system (dev only)
  ];

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, isMobile: Boolean(viewport.mobile), hasTouch: Boolean(viewport.mobile) });
    for (const [name, url, loggedIn, prepare] of PAGES.filter(([name]) => name.includes(process.argv[3] ?? ""))) {
      await logIn(page, loggedIn ? token : null);
      await page.evaluate((theme) => localStorage.setItem("theme", theme), viewport.theme);
      await page.goto(`${APP}${url}`, { waitUntil: "networkidle0" });
      // A step that fails is reported, and the page is still captured as it is
      if (prepare) await prepare(page).catch((error) => console.error(`${name} (${viewport.name}): ${error.message.split("\n")[0]}`));
      // Scroll through the page so scroll-in sections (the landing page) show, then back up
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
      });
      await sleep(1600); // Count-up rings, fit-to-page and fonts settle
      const file = path.join(OUT, `${name}--${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // SLICES=1: also the page in screen-height pieces (readable at full size)
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
