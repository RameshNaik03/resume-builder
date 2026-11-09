// Round-trip test for every resume template: can an ATS read the PDF we export?
//
// For each template it renders a sample resume in the editor, prints it to PDF the way the
// app does (react-to-print: the hidden full-length sheet + the page's styles + an @page rule),
// extracts the text with the ATS checker's own extractText, and checks that:
//   - every standard section heading is a line the checker recognises (no "S U M M A R Y")
//   - the name comes first
//   - each job title sits directly above its bullet points
//   - no stray separator characters ("· · · ·") and no spaced-out letters
// It also checks that every layout stays within the design foundation's scales, and that
// "Fit to one page" turns a slightly long resume into a PDF of exactly one page, and that a cover
// letter (drawn by its resume's template) prints on one page and reads in letter order.
// Optional: ROUNDTRIP_ONLY=classic checks only templates whose id starts with "classic".
// The PDFs and their text are saved in <temp>/resume-builder-e2e/roundtrip.
//
// Run: npm run test:roundtrip (in server/). See e2e/helpers.js for what it starts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import extractText from "../services/import/extractText.js";
import parseWithRules, { headingOf } from "../services/import/parseWithRules.js";
import inspectFile from "../services/ats/inspectFile.js";
import { APP, OUT_DIR, logIn, sleep, startStack } from "./helpers.js";
import { SLIGHTLY_LONG } from "./fitSamples.js";
import { JOB_DESCRIPTION } from "./jobSamples.js";

const ONLY = process.env.ROUNDTRIP_ONLY;

// Extra checks with settings or content that change how a layout draws its text
const DESIGN_CASES = [
  // Two columns: Timeline Plus puts the dates above each job title instead of beside it
  { id: "timeline-plus-navy", name: "timeline-plus-navy (two columns)", design: { columns: 2 } },
  // Rated skills: Infographic draws their levels as dots (nothing of them may reach the text)
  {
    id: "infographic-navy",
    name: "infographic-navy (skill levels)",
    design: {},
    skillLevels: [
      { name: "React", level: 5 },
      { name: "Node.js", level: 4 },
      { name: "MongoDB", level: 3 },
    ],
  },
];
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
    website: "aaravmehta.dev",
  },
  summary: "Full stack developer with 3 years of experience building web apps with React and Node.js (see Projects).",
  experience: [
    {
      role: "Software Engineer",
      company: "Northwind Labs",
      subtitle: "BookIt, a booking platform for clinics (React, Node.js)",
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

  // Layouts built on the design foundation must stay within its scales (the checks in
  // client/src/templates/foundation/tokens.js only log in the browser; here they fail)
  await t.test("layouts stay within the design foundation", async () => {
    const problems = await editor.evaluate(async () => {
      await import("/src/templates/TemplateRenderer.jsx"); // Loads every layout (and the registry)
      return (await import("/src/templates/foundation/tokens.js")).FOUNDATION_PROBLEMS;
    });
    assert.deepEqual(problems, []);
  });

  // Every template as designed, plus layouts whose text order changes with a design setting
  const cases = [
    ...ids.map((id) => ({ id, name: id, design: {}, skillLevels: [] })),
    ...DESIGN_CASES.filter(({ id }) => ids.includes(id)),
  ];
  for (const { id, name, design, skillLevels } of cases) {
    await t.test(name, async () => {
      await api("PUT", `/resumes/${resumeId}`, token, { template: id, design, skillLevels });
      await editor.goto(`${APP}/editor/${resumeId}`, { waitUntil: "networkidle0" });
      await editor.waitForSelector("div.invisible > div");
      await sleep(300); // Page breaks are worked out after the first layout

      const pdf = await printToPdf(editor, printPage);
      const text = await extractText({ buffer: pdf, mimetype: "application/pdf", originalname: `${id}.pdf` });
      fs.writeFileSync(path.join(PDF_DIR, `${name}.pdf`), pdf);
      fs.writeFileSync(path.join(PDF_DIR, `${name}.txt`), text);
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

      const found = new Set(lines.map(headingOf).filter(Boolean));
      const missing = ["summary", "experience", "education", "skills", "projects"].filter((section) => !found.has(section));
      assert.deepEqual(missing, [], `headings an ATS can't find (see ${name}.txt in ${PDF_DIR})`);

      const { fullName, headline } = SAMPLE.personalInfo;
      assert.ok(lines[0] === fullName || lines[0] === `${fullName} | ${headline}`, `the first line should be the name, got "${lines[0]}"`);

      for (const job of SAMPLE.experience) {
        const titleAt = lines.findIndex((line) => line.includes(job.role));
        const bulletAt = lines.findIndex((line) => line.startsWith(job.bullets[0].slice(0, 30)));
        const lineBetween = job.subtitle ? 1 : 0; // The subtitle sits between the header and the bullets
        assert.ok(
          titleAt >= 0 && bulletAt - titleAt >= 1 + lineBetween && bulletAt - titleAt <= 2 + lineBetween,
          `"${job.role}" (line ${titleAt}) should be right above its first bullet (line ${bulletAt})`
        );
        if (job.subtitle) assert.equal(lines[bulletAt - 1], job.subtitle, "the subtitle should be the line right above the first bullet");
      }

      // Import reads the exported PDF back the same way: the subtitle is the job's subtitle, not a bullet
      const parsed = parseWithRules(text);
      const firstJob = parsed.experience.find((job) => job.bullets.some((bullet) => bullet.startsWith(SAMPLE.experience[0].bullets[0].slice(0, 30))));
      assert.equal(firstJob?.subtitle, SAMPLE.experience[0].subtitle, "import should read the subtitle back as the job's subtitle");
      assert.ok(!firstJob.bullets.includes(SAMPLE.experience[0].subtitle), "the subtitle shouldn't be read as a bullet");

      const stray = lines.filter((line) => /^[\s·•|–—,/-]+$/.test(line) || /^[·•|]\s|\s[·|]$/.test(line));
      assert.deepEqual(stray, [], "stray separator characters");

      // Every contact detail, the website included, is in the text (each one whole)
      const { email, phone, linkedin, github, website } = SAMPLE.personalInfo;
      const missingContacts = [email, phone, linkedin, github, website].filter((value) => !lines.some((line) => line.includes(value)));
      assert.deepEqual(missingContacts, [], "contact details missing from the text");

      // Every skill is still there as text (levels and other graphics are drawn, never text)
      const missingSkills = SAMPLE.skills.filter((skill) => !text.includes(skill));
      assert.deepEqual(missingSkills, [], "skills missing from the text");

      const spaced = lines.filter((line) => /\b(\p{L} ){3,}\p{L}\b/u.test(line));
      assert.deepEqual(spaced, [], "spaced-out letters (letter-spacing)");
    });
  }

  // Fit to one page: a resume a little over one page prints on two pages as designed, and on
  // exactly one page with the option on (the PDF is printed from the fitted preview)
  if (!ONLY || "classic-navy".startsWith(ONLY)) {
    await t.test("fit to one page: the PDF is exactly one page", async () => {
      const longId = (await api("POST", "/resumes", token, { ...SLIGHTLY_LONG, template: "classic-navy" })).body._id;
      const printPages = async (name) => {
        const pdf = await printToPdf(editor, printPage);
        fs.writeFileSync(path.join(PDF_DIR, `${name}.pdf`), pdf);
        return { pdf, pages: (await inspectFile({ buffer: pdf, mimetype: "application/pdf", originalname: `${name}.pdf` })).pages };
      };

      await editor.goto(`${APP}/editor/${longId}`, { waitUntil: "networkidle0" });
      await editor.waitForSelector('[data-fit-status="off"]');
      await sleep(300);
      assert.equal((await printPages("fit-off")).pages, 2, "the sample should be over one page without fitting");

      await api("PUT", `/resumes/${longId}`, token, { design: { fitOnePage: true } });
      await editor.goto(`${APP}/editor/${longId}`, { waitUntil: "networkidle0" });
      await editor.waitForSelector('[data-fit-status="fitted"]', { timeout: 20000 });
      await sleep(300);
      const { pdf, pages } = await printPages("fit-on");
      assert.equal(pages, 1, "a fitted resume should print on exactly one page");

      const text = await extractText({ buffer: pdf, mimetype: "application/pdf", originalname: "fit-on.pdf" });
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      assert.equal(lines[0], SLIGHTLY_LONG.personalInfo.fullName, "the name should still come first");
      const flat = text.replace(/\s+/g, " ");
      const missing = SLIGHTLY_LONG.experience.flatMap((job) => job.bullets).filter((bullet) => !flat.includes(bullet));
      assert.deepEqual(missing, [], "fitting must never drop content");
    });
  }

  // Cover letters: printed from the letter editor's preview (the resume's template, fitted to one
  // page). One page; the name first; then the subject, the greeting, the opening, the achievement
  // story, the close and the sign-off in that order (the name last, below the signature space); no stray separators or spaced-out letters. Checked in three different layouts.
  const LETTER_TEMPLATES = ["classic-navy", "sidebar-pro-navy", "color-block-navy"].filter((id) => !ONLY || id.startsWith(ONLY));
  if (LETTER_TEMPLATES.length) {
    const job = (await api("POST", "/jobs/tailor", token, { resumeId, job: { description: JOB_DESCRIPTION } })).body;
    const letter = (await api("POST", "/cover-letters/generate", token, {
      jobId: job.jobId,
      recipientName: "Anna Schmidt",
      recipientSalutation: "Frau",
      achievement: "When our nightly billing job kept timing out, I rewrote it as a stream and it now finishes in minutes",
      availability: "1 March 2027",
    })).body.coverLetter;
    for (const template of LETTER_TEMPLATES) {
      await t.test(`cover letter (${template})`, async () => {
        await api("PUT", `/resumes/${job.resume._id}`, token, { template });
        await editor.goto(`${APP}/cover-letters/${letter._id}`, { waitUntil: "networkidle0" });
        await editor.waitForSelector('[data-fit-status="fitted"]', { timeout: 20000 });
        await sleep(300);
        const pdf = await printToPdf(editor, printPage);
        const name = `cover-letter-${template}`;
        fs.writeFileSync(path.join(PDF_DIR, `${name}.pdf`), pdf);
        assert.equal((await inspectFile({ buffer: pdf, mimetype: "application/pdf", originalname: `${name}.pdf` })).pages, 1, "one page");

        const text = await extractText({ buffer: pdf, mimetype: "application/pdf", originalname: `${name}.pdf` });
        fs.writeFileSync(path.join(PDF_DIR, `${name}.txt`), text);
        const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
        assert.equal(lines[0], SAMPLE.personalInfo.fullName, "the name should come first");
        const at = (pattern) => lines.findIndex((line) => pattern.test(line));
        const order = [
          /^Application for Senior Backend Engineer$/,
          /^Dear Ms\. Schmidt,$/,
          /^(Your|The) Senior Backend Engineer role/,
          /^One result I.m particularly proud of/,
          /^I can start from 1 March 2027/,
          /^Kind regards,$/,
        ].map(at);
        assert.ok(order.every((index) => index > 0), `subject, greeting, opening, achievement, close and sign-off should all be there: ${order}`);
        assert.deepEqual([...order].sort((a, b) => a - b), order, "subject, greeting, opening, achievement, close, sign-off in that order");
        assert.equal(lines.at(-1), SAMPLE.personalInfo.fullName, "the letter ends with the name");
        assert.ok(at(/Frau Anna Schmidt|Anna Schmidt/) > 0 && at(/Frau Anna Schmidt|Anna Schmidt/) < order[0], "the recipient comes before the subject");

        const stray = lines.filter((line) => /^[\s·•|–—,/-]+$/.test(line) || /^[·•|]\s|\s[·|]$/.test(line));
        assert.deepEqual(stray, [], "stray separator characters");
        const spaced = lines.filter((line) => /\b(\p{L} ){3,}\p{L}\b/u.test(line));
        assert.deepEqual(spaced, [], "spaced-out letters (letter-spacing)");
      });
    }
  }
});
