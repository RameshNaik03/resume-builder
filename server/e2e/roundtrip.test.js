// Round-trip test for every resume template: can an ATS read the PDF we export?
//
// For each template it renders a sample resume in the editor, prints it to PDF the way the
// app does (react-to-print: the hidden full-length sheet + the page's styles + an @page rule),
// extracts the text with the ATS checker's own extractText, and checks that:
//   - every standard section heading is a line the checker recognises (no "S U M M A R Y")
//   - the name comes first
//   - each job title sits directly above its bullet points
//   - no stray separator characters ("· · · ·") and no spaced-out letters
// Optional: ROUNDTRIP_ONLY=classic checks only templates whose id starts with "classic".
// The PDFs and their text are saved in <temp>/resume-builder-e2e/roundtrip.
//
// Run: npm run test:roundtrip (in server/). See e2e/helpers.js for what it starts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import extractText from "../services/import/extractText.js";
import { headingOf } from "../services/import/parseWithRules.js";
import { APP, OUT_DIR, logIn, sleep, startStack } from "./helpers.js";

const ONLY = process.env.ROUNDTRIP_ONLY;
const PDF_DIR = path.join(OUT_DIR, "roundtrip");

// A fictional sample resume shaped like a real two-job, two-project, two-degree CV
const SAMPLE = {
  title: "Round trip",
  personalInfo: {
    fullName: "Aarav Mehta",
    headline: "Full Stack Developer",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    location: "Pune, India",
    linkedin: "linkedin.com/in/aaravmehta",
    github: "github.com/aaravmehta",
  },
  summary: "Full stack developer with 3 years of experience building web apps with React and Node.js (see Projects).",
  experience: [
    {
      role: "Software Engineer",
      company: "Northwind Labs",
      startDate: "Jan 2023",
      endDate: "Present",
      bullets: [
        "Built a booking platform (React, Node.js, Express.js, MongoDB) used by 20,000 customers",
        "Reduced API response times by 40% by adding Redis caching and query indexes",
      ],
    },
    {
      role: "Junior Developer",
      company: "Contoso Digital",
      startDate: "Jun 2021",
      endDate: "Dec 2022",
      bullets: ["Developed 15 reusable UI components for the internal design system", "Wrote unit tests with Jest, raising coverage from 45% to 80%"],
    },
  ],
  education: [
    { degree: "M.Tech in Computer Science", school: "Pune Institute of Technology", year: "2021" },
    { degree: "B.E. in Information Technology", school: "Savitribai Phule Pune University", year: "2019" },
  ],
  skills: ["React", "Node.js", "Express.js", "MongoDB", "TypeScript", "Docker", "Git"],
  projects: [
    { name: "ShopEase", description: "E-commerce store with cart and payments (React, Node.js, Express.js, MongoDB).", link: "github.com/aaravmehta/shopease" },
    { name: "TaskFlow", description: "Kanban task manager with real-time updates using Socket.io.", link: "" },
  ],
};

// The same steps as react-to-print: copy the hidden full-length sheet with the page's styles
async function printToPdf(editor, printPage) {
  const html = await editor.evaluate(() => {
    const sheet = document.querySelector("div.invisible > div");
    const styles = [...document.querySelectorAll("style, link[rel=stylesheet]")].map((node) => node.outerHTML).join("\n");
    const pageStyle =
      "<style>@page { size: A4; margin: 0; } @media print { html, body { margin: 0; padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>";
    return `<!doctype html><html><head><meta charset="utf-8"><base href="${location.origin}/">${styles}${pageStyle}</head><body>${sheet.outerHTML}</body></html>`;
  });
  await printPage.setContent(html, { waitUntil: "load", timeout: 60000 });
  await printPage.evaluate(() => document.fonts.ready);
  return Buffer.from(await printPage.pdf({ preferCSSPageSize: true, printBackground: true }));
}

test("PDF round trip: every template exports a PDF an ATS can read", async (t) => {
  const { browser, api, register } = await startStack(t, "roundtrip");
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const token = await register("roundtrip");
  const resumeId = (await api("POST", "/resumes", token, SAMPLE)).body._id;

  const editor = await browser.newPage();
  await editor.setViewport({ width: 1400, height: 1000 });
  await logIn(editor, token);
  const printPage = await browser.newPage();

  // The template list comes from the app itself (its modules use Vite-style imports)
  const ids = (await editor.evaluate(async () => (await import("/src/templates/registry.js")).TEMPLATES.map((template) => template.id))).filter(
    (id) => !ONLY || id.startsWith(ONLY)
  );
  assert.ok(ids.length > 0, "no templates found");

  for (const id of ids) {
    await t.test(id, async () => {
      await api("PUT", `/resumes/${resumeId}`, token, { template: id });
      await editor.goto(`${APP}/editor/${resumeId}`, { waitUntil: "networkidle0" });
      await editor.waitForSelector("div.invisible > div");
      await sleep(300); // Page breaks are worked out after the first layout

      const pdf = await printToPdf(editor, printPage);
      const text = await extractText({ buffer: pdf, mimetype: "application/pdf", originalname: `${id}.pdf` });
      fs.writeFileSync(path.join(PDF_DIR, `${id}.pdf`), pdf);
      fs.writeFileSync(path.join(PDF_DIR, `${id}.txt`), text);
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

      const found = new Set(lines.map(headingOf).filter(Boolean));
      const missing = ["summary", "experience", "education", "skills", "projects"].filter((section) => !found.has(section));
      assert.deepEqual(missing, [], `headings an ATS can't find (see ${id}.txt in ${PDF_DIR})`);

      const { fullName, headline } = SAMPLE.personalInfo;
      assert.ok(lines[0] === fullName || lines[0] === `${fullName} | ${headline}`, `the first line should be the name, got "${lines[0]}"`);

      for (const job of SAMPLE.experience) {
        const titleAt = lines.findIndex((line) => line.includes(job.role));
        const bulletAt = lines.findIndex((line) => line.startsWith(job.bullets[0].slice(0, 30)));
        assert.ok(titleAt >= 0 && bulletAt - titleAt >= 1 && bulletAt - titleAt <= 2, `"${job.role}" (line ${titleAt}) should be right above its first bullet (line ${bulletAt})`);
      }

      const stray = lines.filter((line) => /^[\s·•|–—,/-]+$/.test(line) || /^[·•|]\s|\s[·|]$/.test(line));
      assert.deepEqual(stray, [], "stray separator characters");

      const spaced = lines.filter((line) => /\b(\p{L} ){3,}\p{L}\b/u.test(line));
      assert.deepEqual(spaced, [], "spaced-out letters (letter-spacing)");
    });
  }
});
