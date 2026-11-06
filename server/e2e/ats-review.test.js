// Browser test of the ATS optimizer's review screen (/ats/review/:id):
//   scores, side-by-side previews with highlights, accepting / rejecting changes (and that it
//   survives a refresh), the skills checklist, re-scoring, placeholders, opening the editor,
//   the read-only review once the resume was edited in the editor, and the dashboard's ATS badge.
// Screenshots are saved in <temp>/resume-builder-e2e/ats-review.
//
// Run: npm run test:e2e (in server/). See e2e/helpers.js for what it starts.
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { checker, readFixture } from "../tests/helpers/api.js";
import { APP, OUT_DIR, logIn, sleep, startStack } from "./helpers.js";

const SHOTS = path.join(OUT_DIR, "ats-review");

// A resume with something for every kind of change (see tests/ats-review.test.js), plus a
// "[X%]" placeholder that the review screen and the editor must highlight
const SAVED = {
  title: "Frontend CV",
  template: "sidebar-slate",
  personalInfo: { fullName: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210", location: "Pune, India" },
  summary: "Frontend engineer with 6 years of experience building accessible web apps.",
  experience: [
    { role: "Frontend Developer", company: "Globex", startDate: "06/2019", endDate: "12/2021", bullets: ["Developed a customer dashboard serving 50,000 monthly users", "Raised sign-up conversion by [X%] with A/B tests"] },
    {
      role: "Senior Frontend Engineer",
      company: "Acme",
      startDate: "Jan 2022",
      endDate: "Present",
      bullets: ["BookIt, a booking platform for clinics (React, Node.js)", "Containerised the build with Docker and cut deploy time by 30%", "I led a team of 4 engineers"],
    },
  ],
  education: [{ degree: "B.Tech", school: "Pune University", year: "2019" }],
  skills: ["React", "TypeScript"],
  design: { sectionHeadings: { summary: "About Me" }, columns: 2, fontFamily: "playfair-display" },
};

test("ATS review screen", async (t) => {
  const { browser, api, register } = await startStack(t, "e2e_review");
  const check = checker(t);
  fs.mkdirSync(SHOTS, { recursive: true });

  const token = await register("review");
  const saved = (await api("POST", "/resumes", token, SAVED)).body;
  const jobDescription = `${readFixture("jd-frontend.txt", "utf8")}\nDocker and Kubernetes experience is required. We deploy with Docker and Kubernetes.`;
  const optimized = (await api("POST", "/ats/optimize", token, { resumeId: saved._id, jobDescription })).body;
  const id = optimized.resume._id;

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && !message.text().includes("409") && errors.push(message.text()));
  const text = () => page.evaluate(() => document.body.innerText);
  const waitForText = (value, timeout = 20000) => page.waitForFunction((v) => document.body.innerText.includes(v), { timeout }, value);
  const clickText = async (selector, value) => {
    for (const handle of await page.$$(selector)) {
      if ((await handle.evaluate((element) => element.textContent)).includes(value)) return handle.click();
    }
    throw new Error(`No ${selector} containing "${value}"`);
  };
  // The Accept / Reject button of the change whose "after" text contains `afterText`
  const changeButton = async (afterText, label) => {
    const rows = await page.$$("li[data-change]");
    for (const row of rows) {
      if ((await row.evaluate((element) => element.textContent)).includes(afterText)) {
        for (const button of await row.$$("button")) if ((await button.evaluate((b) => b.textContent)).includes(label)) return button;
      }
    }
    throw new Error(`No change "${afterText}" with a ${label} button`);
  };
  const pressed = (button) => button.evaluate((b) => b.getAttribute("aria-pressed") === "true");
  const previewText = (index) => page.$$eval("section[aria-label='Original and optimized resume'] .rounded-lg", (boxes, i) => boxes[i]?.innerText ?? "", index);

  // ---------- Opened directly (like after a refresh: no navigation state) ----------
  await logIn(page, token);
  await page.goto(`${APP}/ats/review/${id}`, { waitUntil: "networkidle0" });
  await waitForText("Review your ATS-optimized resume");
  await sleep(1400); // Score rings
  let body = await text();
  const { before, after } = optimized.scores;
  await check("header: before -> after with the improvement", body.includes(`${before} → ${after}, +${after - before} points`), body.match(/\d+ → \d+.{0,20}/)?.[0]);
  await check("two score rings", (await page.$$("[role=img][aria-label^='ATS score']")).length === 2);
  await check("every change listed", (await page.$$("li[data-change]")).length === optimized.changes.length);
  await check("grouped by section", ["Experience", "Skills", "Layout"].every((label) => body.toUpperCase().includes(label.toUpperCase())));
  await check("changes highlighted in both previews", (await page.$$(".ats-changed-new")).length > 0 && (await page.$$(".ats-changed-old")).length > 0);
  await check("placeholder reminder", body.includes("Fill in 1 placeholder") && (await page.$$("mark.ats-placeholder")).length >= 2);
  await check("skills checklist", (await page.$$("input[type=checkbox]")).length > 0 && body.includes("Kubernetes"));
  await page.screenshot({ path: path.join(SHOTS, "1-review.png"), fullPage: true });

  // ---------- Reject / accept one change ----------
  let reject = await changeButton("Led a team of 4 engineers", "Reject");
  await reject.click();
  await page.waitForFunction(() => document.body.innerText.includes("Undone in your optimized resume"), { timeout: 15000 });
  reject = await changeButton("Led a team of 4 engineers", "Reject");
  await check("reject -> marked as rejected", await pressed(reject));
  await check("  and undone in the optimized preview", (await previewText(1)).includes("I led a team of 4 engineers"));
  await page.reload({ waitUntil: "networkidle0" });
  await waitForText("Review your ATS-optimized resume");
  reject = await changeButton("Led a team of 4 engineers", "Reject");
  await check("the decision survives a refresh", await pressed(reject));
  const accept = await changeButton("Led a team of 4 engineers", "Accept");
  await accept.click();
  await page.waitForFunction(() => !document.body.innerText.includes("Undone in your optimized resume"), { timeout: 15000 });
  await check("accept again -> applied again", (await previewText(1)).includes("Led a team of 4 engineers"));

  // ---------- Accept all / reject all ----------
  await clickText("button", "Reject all");
  await page.waitForFunction((n) => document.querySelectorAll("li[data-change] button[aria-pressed='true']").length === n, { timeout: 15000 }, optimized.changes.length);
  await check("reject all -> the original in the optimized preview", (await previewText(1)).includes("I led a team") && (await previewText(1)).includes("06/2019"));
  await clickText("button", "Accept all");
  await page.waitForFunction(() => [...document.querySelectorAll("li[data-change]")].every((row) => row.querySelector("button[aria-pressed='true']")?.textContent.includes("Accept")), { timeout: 15000 });
  await check("accept all -> every change accepted", true);

  // ---------- Skills checklist ----------
  for (const label of await page.$$("label")) {
    if ((await label.evaluate((l) => l.textContent)).includes("Kubernetes")) await label.click();
  }
  await page.waitForFunction(() => document.querySelector("section[aria-label='Original and optimized resume']")?.innerText.includes("Kubernetes"), { timeout: 15000 });
  const withSkill = (await api("GET", `/resumes/${id}`, token)).body;
  await check("ticked skill added to Skills", withSkill.skills.includes("Kubernetes"));

  // ---------- Re-score ----------
  await clickText("button", "Re-score");
  await waitForText("Current score:");
  const rescored = (await api("GET", `/resumes/${id}`, token)).body;
  await check("re-score saves the current score", rescored.atsOptimization.currentScore.score === rescored.atsScore.score);

  // ---------- Open in editor ----------
  await clickText("button", "Open in editor");
  await page.waitForFunction(() => location.pathname.startsWith("/editor/"), { timeout: 15000 });
  await waitForText("ATS-optimized copy created");
  body = await text();
  await sleep(2500); // Longer than the autosave delay
  await check("editor keeps the fonts/layout reset note", body.includes("Fonts and layout were reset for ATS compatibility."));
  await check("editor: placeholder banner", /1 placeholder still needs real numbers/.test(body), body.match(/.{0,40}placeholder.{0,40}/)?.[0]);
  await check("editor: placeholder highlighted in the preview", (await page.$$("[data-page] mark.ats-placeholder")).length >= 1);
  await check("  but not on the printed copy", (await page.$$("div.invisible mark.ats-placeholder")).length === 0);
  await check("editor: Download PDF and Design work as usual", body.includes("Download PDF") && body.includes("Design"));
  await page.screenshot({ path: path.join(SHOTS, "2-editor.png"), fullPage: false });
  await check("just opening the editor doesn't lock the review", !(await api("GET", `/resumes/${id}`, token)).body.atsOptimization.lockedAt);

  // ---------- Edited in the editor since the review: read-only decisions ----------
  await api("PUT", `/resumes/${id}`, token, { summary: "Edited in the editor" });
  await page.goto(`${APP}/ats/review/${id}`, { waitUntil: "networkidle0" });
  await waitForText("You've edited this resume since the review, so changes can no longer be accepted or rejected here. Run the ATS check again to get a fresh review.");
  await check("locked: shows the note", true);
  const decisionButtons = await page.$$eval("li[data-change] button", (buttons) => buttons.map((b) => b.disabled));
  await check("  every Accept / Reject is disabled", decisionButtons.length > 0 && decisionButtons.every(Boolean));
  const bulkButtons = await page.$$eval("button", (buttons) => buttons.filter((b) => /Accept all|Reject all/.test(b.textContent)).map((b) => b.disabled));
  await check("  and Accept all / Reject all", bulkButtons.length === 2 && bulkButtons.every(Boolean));
  await check("  the changes and scores are still shown", (await page.$$("li[data-change]")).length === optimized.changes.length && (await page.$$("[role=img][aria-label^='ATS score']")).length === 2);
  await check("  with a link to the ATS checker", Boolean(await page.$("[data-testid=review-locked] a[href='/ats-checker']")));
  for (const label of await page.$$("label")) {
    if ((await label.evaluate((l) => l.textContent)).includes("Kubernetes")) await label.click();
  }
  await page.waitForFunction(() => !document.querySelector("section[aria-label='Original and optimized resume']")?.innerText.includes("Kubernetes"), { timeout: 15000 });
  const afterUntick = (await api("GET", `/resumes/${id}`, token)).body;
  await check("  the skills checklist still works and keeps the edit", !afterUntick.skills.includes("Kubernetes") && afterUntick.summary.replace(/<[^>]+>/g, "") === "Edited in the editor");
  await clickText("button", "Re-score");
  await waitForText("Current score:");
  await check("  Re-score still works", true);
  await page.screenshot({ path: path.join(SHOTS, "2b-locked.png"), fullPage: true });

  // ---------- Dashboard badge ----------
  await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
  const badges = await page.$$eval("[data-testid=ats-badge]", (items) => items.map((item) => item.textContent));
  await check("dashboard shows ATS badges", badges.length >= 1 && badges.every((badge) => /^ATS \d+$/.test(badge)), badges.join(", "));
  await page.click('[data-testid="resume-card"] button[aria-label^="Actions for"]'); // A card's actions are in its menu
  await clickText('[role="menuitem"]', "Re-check");
  await waitForText("ATS score:");
  await check("Re-check updates the score", true);
  await page.screenshot({ path: path.join(SHOTS, "3-dashboard.png"), fullPage: false });

  await check("no console or page errors", errors.length === 0, errors.join(" | "));
});
