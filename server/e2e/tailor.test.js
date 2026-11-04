// Browser test of the "Tailor to a job" page (/tailor):
//   dashboard entry point -> paste a job and pick a resume -> check the analysis (move and remove
//   skills) -> tailoring progress -> the match report (ring, breakdown, evidence on hover) ->
//   "I have this skill" (Skills + an edited bullet; a bullet that adds a number is refused;
//   Skills only) and "I don't have this" -> the match % goes up after each confirmation ->
//   "Review changes" -> saved jobs -> the resume card's entry point. The original never changes.
//
// Run: node --test e2e/tailor.test.js (in server/; part of npm run test:e2e)
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP, logIn, startStack } from "./helpers.js";

const JD = `Senior Backend Engineer
Northbeam is hiring a Senior Backend Engineer to join our payments platform team in London.

What you'll do:
- Design and build reliable payment APIs in Go and Node.js
- Own event-driven services on Kafka from design review to on-call
- Improve the performance of our PostgreSQL databases

Requirements:
- 5+ years of backend engineering experience
- Strong experience with Node.js, PostgreSQL and Kafka
- Experience with Docker and Kubernetes in production
- Solid understanding of REST API design

Nice to have:
- Experience with Terraform or AWS
- Familiarity with GraphQL`;

const RESUME = {
  title: "Meera CV",
  template: "classic-navy",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com" },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [
    { role: "Backend Engineer", company: "Harbour Health", startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js", "Cut Postgres query times by 60%"] },
    { role: "Software Engineer", company: "Tessellate", startDate: "Jul 2015", endDate: "Dec 2017", bullets: ["Moved 14 services to Kafka consumers"] },
  ],
  skills: ["Node.js", "Redis"],
  projects: [{ name: "Queuebench", description: "Load-testing tool for message queues with Docker.", link: "" }],
};

test("Tailor to a job", async (t) => {
  const { browser, api, register } = await startStack(t, "tailor");
  const token = await register("tailor");
  const original = (await api("POST", "/resumes", token, RESUME)).body;
  const originalSnapshot = JSON.stringify((await api("GET", `/resumes/${original._id}`, token)).body);

  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 1000 });
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
  const textOf = (selector) => page.$eval(selector, (el) => el.innerText);
  const score = () => page.$eval('[data-testid="match-score"]', (el) => Number(el.dataset.score));
  let jobUrl;

  await t.test("from the dashboard: paste a job, pick a resume, analyze", async () => {
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    await clickText("a", "Tailor to a job");
    await page.waitForSelector("#job-description");
    assert.match(await textOf('[data-testid="honest-note"]'), /We only use what's true in your resume\. Missing skills are listed so you can decide what to learn or mention\./);

    await page.type("#job-description", JD, { delay: 0 });
    await page.select("#base-resume", original._id);
    await clickText("button", "Analyze job");
    await page.waitForSelector('[data-testid="must-have"]', { timeout: 20000 });
    const must = await textOf('[data-testid="must-have"]');
    for (const skill of ["Node.js", "Kafka", "PostgreSQL", "Docker", "Kubernetes"]) assert.ok(must.includes(skill), `${skill} should be a must-have`);
    assert.match(await page.evaluate(() => document.body.innerText), /Northbeam/);
  });

  await t.test("check the analysis: move a skill and remove one", async () => {
    await page.click('button[aria-label="Move to nice-to-have: Docker"]');
    await page.click('button[aria-label="Remove REST APIs"]');
    const must = await textOf('[data-testid="must-have"]');
    const nice = await textOf('[data-testid="nice-to-have"]');
    assert.ok(!must.includes("Docker") && nice.includes("Docker"), "Docker moved to nice-to-have");
    assert.ok(!must.includes("REST APIs") && !nice.includes("REST APIs"), "REST APIs removed");
  });

  await t.test("tailor: progress, then the match report", async () => {
    await clickText("button", "Tailor my resume");
    await page.waitForFunction(() => location.pathname.startsWith("/tailor/jobs/"), { timeout: 30000 });
    jobUrl = page.url();
    await page.waitForSelector('[data-testid="match-score"]');
    assert.ok((await score()) > 0 && (await score()) < 100);
    assert.match(await textOf('[data-testid="breakdown"]'), /Must-haves\s*3 of 4/); // Node.js, Kafka, PostgreSQL of 4 (Docker moved, REST APIs removed)

    // The evidence quote shows on hover
    await page.hover('[data-skill="Kafka"]');
    const tooltip = await page.$eval("#evidence-Kafka", (el) => ({ visible: getComputedStyle(el).display !== "none", text: el.innerText }));
    assert.ok(tooltip.visible && tooltip.text.includes("Moved 14 services to Kafka consumers"), JSON.stringify(tooltip));
  });

  await t.test("I have this skill: Skills + an edited bullet, and the % goes up", async () => {
    const before = await score();
    await page.evaluate(() => [...document.querySelectorAll('[data-testid="missing-skills"] li[data-skill="Kubernetes"] button')].find((b) => b.textContent === "I have this skill").click());
    await page.waitForSelector("#where-kubernetes");
    const harbour = await page.$eval("#where-kubernetes", (select) => [...select.options].find((option) => option.textContent === "Backend Engineer at Harbour Health").value);
    await page.select("#where-kubernetes", harbour);
    await page.type("#note-kubernetes", "ran our services on Kubernetes in production");
    await page.click('input[name="placement-kubernetes"][value="bullet"]');
    // The draft follows the note; edit it
    assert.equal(await page.$eval("#bullet-kubernetes", (el) => el.value), "Ran our services on Kubernetes in production");
    await page.click("#bullet-kubernetes", { clickCount: 3 });
    await page.type("#bullet-kubernetes", "Ran the team's services on Kubernetes in production");
    await clickText("button", "Add it");
    await page.waitForFunction((value) => Number(document.querySelector('[data-testid="match-score"]').dataset.score) > value, { timeout: 10000 }, before);
    assert.ok((await textOf('[data-testid="matched-skills"]')).includes("Kubernetes"));

    const copy = (await api("GET", `/resumes/${(await api("GET", `/jobs/${jobUrl.split("/").pop()}`, token)).body.tailoredResumeId}`, token)).body;
    assert.ok(copy.skills.includes("Kubernetes"));
    assert.ok(copy.experience.find((job) => job.company === "Harbour Health").bullets.includes("Ran the team's services on Kubernetes in production"));
  });

  await t.test("a bullet that adds a number is refused; Skills only works", async () => {
    await page.evaluate(() => [...document.querySelectorAll('[data-testid="missing-skills"] li[data-skill="GraphQL"] button')].find((b) => b.textContent === "I have this skill").click());
    await page.waitForSelector("#where-graphql");
    await page.select("#where-graphql", "project:Queuebench");
    await page.type("#note-graphql", "Queuebench has a GraphQL API for its results");
    await page.click('input[name="placement-graphql"][value="bullet"]');
    await page.click("#bullet-graphql", { clickCount: 3 });
    await page.type("#bullet-graphql", "Built a GraphQL API used by 500 teams");
    await clickText("button", "Add it");
    await page.waitForSelector('form[aria-label="Confirm GraphQL"] [role="alert"]', { timeout: 10000 });
    assert.match(await textOf('form[aria-label="Confirm GraphQL"] [role="alert"]'), /isn't in your note or resume/);

    const before = await score();
    await page.click('input[name="placement-graphql"][value="skills"]');
    await clickText("button", "Add it");
    await page.waitForFunction((value) => Number(document.querySelector('[data-testid="match-score"]').dataset.score) > value, { timeout: 10000 }, before);
  });

  await t.test("I don't have this: remembered, nothing added", async () => {
    await page.evaluate(() => [...document.querySelectorAll('[data-testid="missing-skills"] li[data-skill="AWS"] button')].find((b) => b.textContent === "I don't have this").click());
    await page.waitForFunction(() => document.querySelector('[data-testid="missing-skills"] li[data-skill="AWS"]').innerText.includes("You don't have this yet"));
    await page.reload({ waitUntil: "networkidle0" });
    assert.ok((await textOf('[data-testid="missing-skills"] li[data-skill="AWS"]')).includes("You don't have this yet"), "kept after a reload");
  });

  await t.test("Review changes opens the review screen", async () => {
    await clickText("a", "Review changes");
    await page.waitForFunction(() => location.pathname.startsWith("/ats/review/"), { timeout: 10000 });
    await page.waitForFunction(() => document.body.innerText.includes("Original"), { timeout: 20000 });
  });

  await t.test("saved jobs list, and the resume card's entry point", async () => {
    await page.goto(`${APP}/tailor`, { waitUntil: "networkidle0" });
    const saved = await textOf('[data-testid="saved-jobs"]');
    assert.match(saved, /Senior Backend Engineer/);
    assert.match(saved, /Northbeam/);
    assert.match(saved, /\d+%/);

    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    await page.click(`a[aria-label="Tailor ${RESUME.title} to a job"]`);
    await page.waitForSelector("#base-resume");
    assert.equal(await page.$eval("#base-resume", (el) => el.value), original._id, "the card's resume is preselected");
  });

  await t.test("the original resume never changed", async () => {
    assert.equal(JSON.stringify((await api("GET", `/resumes/${original._id}`, token)).body), originalSnapshot);
  });
});
