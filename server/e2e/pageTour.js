// Every page of the app, with the data it needs: shared by the screenshot tour
// (e2e/screenshots.js) and the phone-width test (e2e/no-overflow.test.js).
//   seedTour(api, token) - a sample resume (and a second one), an ATS review, a tailored job, a
//                          cover letter and an imported resume kept in its original design;
//                          returns their ids
//   tourPages(ids)       - [{ name, path, loggedIn, prepare(page) }]
//   openPage(page, entry, { token, theme }) - logs in (or out), sets the theme, opens the page,
//                          runs its step (a failed step is reported, not thrown) and scrolls
//                          through it so scroll-in sections show
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { API, APP, logIn, sleep } from "./helpers.js";
import galleryResume from "../../client/src/templates/galleryResume.js";

export const JOB = `Senior Frontend Engineer
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

// The gallery's sample resume as the API takes it: no photo (uploaded through its own route)
// and no made-up entry ids ("gallery-exp-1"; the database makes its own)
function sample(template, title) {
  const data = galleryResume(template, false);
  const { photoUrl, ...personalInfo } = data.personalInfo;
  void photoUrl;
  const withoutIds = (list) => (list ?? []).map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "_id")));
  return { ...data, personalInfo, title, ...Object.fromEntries(["experience", "education", "projects", "additional"].map((key) => [key, withoutIds(data[key])])) };
}

export async function seedTour(api, token) {
  const must = async (method, url, body) => {
    const r = await api(method, url, token, body);
    if (r.status >= 300) throw new Error(`${method} ${url} -> ${r.status}: ${r.body.message}`);
    return r.body;
  };
  const resume = await must("POST", "/resumes", sample("classic-navy", "Priya Raman – Frontend"));
  await must("POST", "/resumes", sample("sidebar-pro-navy", "Priya Raman – Sidebar"));
  const optimized = await must("POST", "/ats/optimize", { resumeId: resume._id, jobDescription: JOB });
  const { analysis } = await must("POST", "/jobs/analyze", { jobDescription: JOB });
  const tailored = await must("POST", "/jobs/tailor", { resumeId: resume._id, job: { description: JOB, analysis }, options: { maxBulletsPerJob: 4 } });
  const { coverLetter } = await must("POST", "/cover-letters/generate", { jobId: tailored.jobId, whyCompany: "I've used Lumen's app as a patient and want to make it easier for everyone." });
  // An imported resume, kept in its original design (no template chosen)
  const form = new FormData();
  const file = new URL("../tests/fixtures/design/serif-centered.pdf", import.meta.url);
  form.append("file", new Blob([fs.readFileSync(file)], { type: "application/pdf" }), "Meera Iyer resume.pdf");
  const imported = await fetch(`${API}/resumes/import`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }).then((res) => res.json());
  if (!imported.resume) throw new Error(`Import for the tour failed: ${imported.message}`);
  return { resumeId: resume._id, reviewId: optimized.resume._id, jobId: tailored.jobId, letterId: coverLetter._id, originalId: imported.resume._id };
}

// Clicks the element whose text is exactly `text` (else the first that contains it)
const clickText = (page, selector, text) =>
  page.evaluate(
    (sel, value) => {
      const elements = [...document.querySelectorAll(sel)];
      const element = elements.find((el) => el.textContent.trim() === value) ?? elements.find((el) => el.textContent.trim().includes(value));
      if (!element) throw new Error(`No ${sel} with "${value}"`);
      element.click();
    },
    selector,
    text
  );

export function tourPages({ resumeId, reviewId, jobId, letterId, originalId }) {
  return [
    { name: "01-landing", path: "/" },
    { name: "02-login", path: "/login" },
    { name: "03-register", path: "/register" },
    { name: "04-forgot-password", path: "/forgot-password" },
    { name: "05-reset-password", path: "/reset-password/sample-token" },
    { name: "06-not-found", path: "/this-page-does-not-exist" },
    { name: "07-dashboard", path: "/dashboard", loggedIn: true },
    { name: "08-editor", path: `/editor/${resumeId}`, loggedIn: true },
    { name: "09-editor-design", path: `/editor/${resumeId}`, loggedIn: true, prepare: (page) => clickText(page, "[role=tab]", "Design") },
    {
      name: "10-template-picker",
      path: `/editor/${resumeId}`,
      loggedIn: true,
      prepare: async (page) => {
        await page.$eval('button[aria-label="Templates"]', (button) => button.click());
        await sleep(3000); // The thumbnails render one by one
      },
    },
    { name: "11-ats-checker", path: "/ats-checker", loggedIn: true },
    {
      name: "12-ats-results",
      path: "/ats-checker",
      loggedIn: true,
      prepare: async (page) => {
        await clickText(page, "[role=tab]", "My resumes");
        await clickText(page, "[role=radio]", "Priya Raman – Frontend");
        await page.$eval("button[type=submit]", (button) => button.click()); // (a tap can miss on the phone viewport)
        await page.waitForFunction(() => document.body.innerText.includes("What the ATS sees"), { timeout: 30000 });
      },
    },
    { name: "13-ats-review", path: `/ats/review/${reviewId}`, loggedIn: true },
    { name: "14-tailor-input", path: `/tailor?resume=${resumeId}`, loggedIn: true },
    {
      name: "15-tailor-options",
      path: `/tailor?resume=${resumeId}`,
      loggedIn: true,
      prepare: async (page) => {
        await page.select("#saved-job", jobId);
        await page.waitForSelector('[data-testid="tailor-options"]', { timeout: 15000 });
      },
    },
    { name: "16-match-report", path: `/tailor/jobs/${jobId}`, loggedIn: true },
    { name: "17-cover-letter", path: `/cover-letters/${letterId}`, loggedIn: true },
    { name: "18-dev-ui", path: "/dev/ui" }, // The design system (dev only)
    // (the original's pages are drawn by pdf.js after the page loads: wait for them)
    { name: "19-original", path: `/resumes/${originalId}/original`, loggedIn: true, prepare: (page) => page.waitForSelector("canvas[data-drawn]", { timeout: 20000 }) },
    { name: "20-original-match", path: `/resumes/${originalId}/original?match=1`, loggedIn: true, prepare: (page) => page.waitForSelector('[data-testid="matched-design"] canvas[data-drawn]', { timeout: 20000 }) },
    {
      // The upload dialog's first step: the uploaded file and the two choices
      name: "21-import-original",
      path: "/dashboard",
      loggedIn: true,
      prepare: async (page) => {
        await clickText(page, "button", "Upload");
        const input = await page.waitForSelector('[role="dialog"] input[type=file]');
        await input.uploadFile(fileURLToPath(new URL("../tests/fixtures/design/sidebar-two-columns.pdf", import.meta.url)));
        await page.waitForSelector('[role="dialog"] canvas[data-drawn]', { timeout: 30000 });
      },
    },
  ];
}

export async function openPage(page, entry, { token, theme = "light" }) {
  await logIn(page, entry.loggedIn ? token : null);
  await page.evaluate((value) => localStorage.setItem("theme", value), theme);
  await page.goto(`${APP}${entry.path}`, { waitUntil: "networkidle0" });
  if (entry.prepare) await entry.prepare(page).catch((error) => console.error(`${entry.name}: ${error.message.split("\n")[0]}`));
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
}
