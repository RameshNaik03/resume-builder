// Browser test of the ATS checker page and the editor banners it leads to:
//   - guest: upload, optional job description, progress steps, results (score ring, top fixes,
//     categories, keywords, "What the ATS sees"), sign-up prompt for the ATS-friendly version
//   - logged in: a saved resume with a job description, generating the optimized version
//     (editor banner with the score before -> after), a clean file, phone width + dark mode
//   - the import banner's "couldn't tell which bullets belong to which job" note
// Screenshots are saved in <temp>/resume-builder-e2e/ats-checker.
//
// Run: npm run test:e2e (in server/). See e2e/helpers.js for what it starts.
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { checker, fixture, readFixture } from "../tests/helpers/api.js";
import { APP, OUT_DIR, logIn, sleep, startStack } from "./helpers.js";

const SHOTS = path.join(OUT_DIR, "ats-checker");

test("ATS checker page and editor banners", async (t) => {
  const { browser, api, register } = await startStack(t, "e2e");
  const check = checker(t);
  fs.mkdirSync(SHOTS, { recursive: true });
  const JD = readFixture("jd-frontend.txt", "utf8");

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));

  const shot = (name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
  const text = () => page.evaluate(() => document.body.innerText);
  const waitForText = (value, timeout = 30000) => page.waitForFunction((v) => document.body.innerText.includes(v), { timeout }, value);
  const clickText = async (selector, value) => {
    for (const handle of await page.$$(selector)) {
      if ((await handle.evaluate((element) => element.textContent)).includes(value)) return handle.click();
    }
    throw new Error(`No ${selector} containing "${value}"`);
  };
  const scoreOnPage = (body) => body.match(/(\d+)\nout of 100/)?.[1];

  // ---------- 1. Guest: weak resume, no job description ----------
  await page.goto(`${APP}/ats-checker`, { waitUntil: "networkidle0" });
  await check("analyze disabled with no file", await page.$eval("button[type=submit]", (button) => button.disabled));
  await (await page.$("input[type=file]")).uploadFile(fixture("weak.pdf"));
  await page.type("#job-description", "too short");
  await check("short job description blocks analyze", (await page.$eval("button[type=submit]", (button) => button.disabled)) && (await text()).includes("more words needed"));
  await page.$eval("#job-description", (element) => element.select());
  await page.keyboard.press("Backspace");
  await check("empty job description allowed", !(await page.$eval("button[type=submit]", (button) => button.disabled)));
  await shot("1-input");

  await page.click("button[type=submit]");
  await waitForText("Analyzing your resume");
  const ticked = new Set();
  const started = Date.now();
  while (Date.now() - started < 8000) {
    const now = await page.evaluate(() => document.body.textContent); // Includes the screen-reader "(done)"
    if (now.includes("Your ATS results")) break;
    for (const step of ["Reading file", "Checking ATS compatibility", "Scoring content", "Matching keywords"]) {
      if (now.includes(`${step} (done)`)) ticked.add(step);
    }
    if (ticked.size === 2) await shot("2-progress", false);
    await sleep(60);
  }
  await check("each progress step ticked before the results", ticked.size === 4, [...ticked].join(", "));
  await waitForText("Your ATS results");
  await sleep(1400); // Let the score ring finish
  let body = await text();
  await check("results: score + grade", /Needs work|Poor/.test(body), scoreOnPage(body));
  await check("results: top fixes", /Top 3 fixes/.test(body) && /\+\d+(\.5)? pts/.test(body));
  await check("results: call to action below 70", body.includes("Generate an ATS-friendly version"));
  await check("results: disclaimer", body.includes("don't come from any specific ATS"));
  await check("results: skills found (no job description)", body.includes("Paste a job description to see which"));
  await check("score ring warning/danger", await page.$eval("svg circle:nth-child(2)", (circle) => /stroke-(warning|danger)\b/.test(circle.getAttribute("class"))));
  await shot("3-results");

  await clickText("button[aria-expanded]", "Content quality");
  body = await text();
  await check("category expands with its checks", body.includes("How to fix:") && body.includes("No clichés") && body.includes("Not passed"));
  await check("aria-expanded true", await page.$$eval("button[aria-expanded=true]", (buttons) => buttons.length === 1));
  await shot("4-expanded");

  await clickText("[role=tab]", "What the ATS sees");
  body = await text();
  await check("ATS view shows the extracted text", body.includes("MY JOURNEY") && body.includes("How to read this"));
  await check("monospace panel", await page.$eval("pre", (pre) => getComputedStyle(pre).fontFamily.toLowerCase().includes("mono")));
  await shot("5-ats-view");

  await clickText("button", "Generate an ATS-friendly version");
  await waitForText("Create a free account to continue");
  await check("guest call to action -> sign-up prompt", true);
  await page.keyboard.press("Escape");

  // ---------- 2. Logged in: saved two-column resume + job description ----------
  const token = await register("ui");
  const saved = await api("POST", "/resumes", token, {
    title: "Sidebar resume",
    template: "sidebar-slate",
    personalInfo: { fullName: "Priya Sharma", headline: "Frontend Engineer", email: "priya@example.com", phone: "+91 98765 43210", location: "Pune" },
    summary: "Frontend engineer with 6 years of experience building fast, accessible React applications for SaaS products.",
    experience: [
      { role: "Senior Frontend Engineer", company: "Acme", startDate: "Jan 2022", endDate: "Present", bullets: ["Led migration of a 200k-line React codebase to TypeScript, cutting runtime errors by 35%", "Built a component library used by 6 product teams"] },
      { role: "Frontend Developer", company: "Globex", startDate: "Jun 2019", endDate: "Dec 2021", bullets: ["Developed a customer dashboard in React and Redux serving 50,000 monthly users"] },
    ],
    education: [{ degree: "B.Tech Computer Science", school: "Pune University", year: "2019" }],
    skills: ["React", "TypeScript", "JavaScript", "Redux", "Jest", "HTML", "CSS"],
  });
  await check("saved resume created", saved.status === 201, saved.body.message);

  await logIn(page, token);
  await page.goto(`${APP}/ats-checker`, { waitUntil: "networkidle0" });
  await clickText("[role=tab]", "My resumes");
  await waitForText("Sidebar resume");
  await clickText("[role=radio]", "Sidebar resume");
  await page.$eval(
    "#job-description",
    (element, value) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    JD
  );
  await page.click("button[type=submit]");
  await waitForText("Your ATS results");
  await sleep(1400);
  body = await text();
  await check("saved: keyword tags", body.includes("Keywords from the job") && body.includes("Missing (") && body.includes("Matched ("));
  await check("saved: job title shown", body.includes("Sr. Front-End Engineer"));
  await check("saved: edit link", body.includes("Edit this resume"));
  await clickText("button[aria-expanded]", "Parseability");
  body = await text();
  await check("saved: two-column template flagged", body.includes("Your template uses two columns"));
  await shot("6-saved-results");

  // A weak saved resume (below 70): generate the optimized version from it
  const weak = await api("POST", "/resumes", token, {
    title: "Weak saved",
    template: "split-modern-ocean",
    personalInfo: { fullName: "Rahul Verma", email: "rahul@example.com", phone: "+1 415 555 0199" },
    summary: "Hard-working team player and results-driven go-getter.",
    experience: [
      { role: "Operations", company: "Zomato", startDate: "03/2017", endDate: "08/2018", bullets: ["I was responsible for reports", "Managed stuff"] },
      { role: "Manager", company: "Flipkart", startDate: "January 2021", endDate: "Present", bullets: ["Worked on various projects and helped the team"] },
    ],
    skills: ["Communication", "Teamwork", "Excel"],
  });
  await page.goto(`${APP}/ats-checker`, { waitUntil: "networkidle0" }); // Reloads the saved list
  await clickText("[role=tab]", "My resumes");
  await waitForText("Weak saved");
  await clickText("[role=radio]", "Weak saved");
  await page.click("button[type=submit]");
  await waitForText("Generate an ATS-friendly version");
  await clickText("button", "Generate an ATS-friendly version");
  await page.waitForFunction(() => location.pathname.startsWith("/ats/review/"), { timeout: 30000 });
  const createdId = await page.evaluate(() => location.pathname.split("/").pop());
  const created = (await api("GET", `/resumes/${createdId}`, token)).body;
  await check(
    "optimize: new resume in Classic Navy, single column",
    createdId !== weak.body._id && created.template === "classic-navy" && !created.design.columns && created.title.includes("ATS-optimized"),
    `${created.title} ${created.template}`
  );
  await check("optimize: content kept, newest job first", created.experience.length === 2 && created.experience[0].endDate === "Present" && created.skills.length === 3);
  await waitForText("Review your ATS-optimized resume");
  await check("generate opens the review screen", true);
  await clickText("button", "Open in editor");
  await page.waitForFunction(() => location.pathname.startsWith("/editor/"), { timeout: 15000 });
  await waitForText("ATS-optimized copy created");
  body = await text();
  await check("editor banner shows the score before -> after", /\d+\s*→\s*(to\s*)?\d+/.test(body) && body.includes("your original resume is unchanged"), body.match(/.{0,20}→.{0,20}/)?.[0]);
  await check("editor banner explains the reset", body.includes("Fonts and layout were reset for ATS compatibility. You can still change colors in the Design tab."));
  await shot("7-editor-optimized-banner", false);

  // ---------- 3. Logged in: clean file (Excellent, no call to action), then a weak file ----------
  await page.goto(`${APP}/ats-checker`, { waitUntil: "networkidle0" });
  await (await page.$("input[type=file]")).uploadFile(fixture("clean.pdf"));
  await page.click("button[type=submit]");
  await waitForText("Your ATS results");
  await sleep(1400);
  body = await text();
  await check("clean: Excellent, no call to action", body.includes("Excellent") && !body.includes("Generate an ATS-friendly version"));
  await check("score ring green", await page.$eval("svg circle:nth-child(2)", (circle) => circle.getAttribute("class").includes("stroke-success")));

  await clickText("button", "Check another resume");
  await check("file kept after 'Check another resume'", (await text()).includes("clean.pdf"));
  await page.click("button[aria-label='Remove file']");
  await (await page.$("input[type=file]")).uploadFile(fixture("weak.pdf"));
  await page.click("button[type=submit]");
  await waitForText("Generate an ATS-friendly version");
  await clickText("button", "Generate an ATS-friendly version");
  await page.waitForFunction(() => location.pathname.startsWith("/ats/review/"), { timeout: 30000 });
  await waitForText("Review your ATS-optimized resume");
  body = await text();
  await check("optimize from a file opens the review screen", body.includes('Section "My Journey"'), body.slice(0, 200));
  await shot("8-review-after-file", false);

  // ---------- 4. Import banner note ----------
  // Opens the editor with the router state the import modal sends (the real trigger, a PDF
  // whose bullets can't be assigned to jobs, is covered by the import regression test)
  const NOTE = "We couldn't tell which bullets belong to which job. Please check your Experience section.";
  const openEditorWith = async (state) => {
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle0" });
    await page.evaluate(
      (url, usr) => {
        window.history.pushState({ usr, key: Math.random().toString(36).slice(2), idx: 1 }, "", url);
        window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      },
      `/editor/${saved.body._id}`,
      state
    );
    await waitForText("We imported your resume", 15000);
    return text();
  };
  await check("import note shown when the import warned", (await openEditorWith({ imported: true, importWarnings: ["experience-bullets-unassigned"] })).includes(NOTE));
  await check("no import note without the warning", !(await openEditorWith({ imported: true, importWarnings: [] })).includes(NOTE));
  await check("no import note when the state has no warnings", !(await openEditorWith({ imported: true })).includes(NOTE));

  // ---------- 5. Phone width + dark mode ----------
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${APP}/ats-checker`, { waitUntil: "networkidle0" });
  await (await page.$("input[type=file]")).uploadFile(fixture("twocol.pdf"));
  await page.click("button[type=submit]");
  await waitForText("Your ATS results");
  await sleep(1400);
  await clickText("button[aria-expanded]", "Parseability");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await check("no horizontal scroll on a phone", scrollWidth <= 390, scrollWidth);
  await shot("9-phone-dark");
  await clickText("[role=tab]", "What the ATS sees");
  await check("phone: ATS view has no horizontal scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await shot("10-phone-ats-view");

  await check("no console or page errors", errors.length === 0, errors.join(" | "));
});
