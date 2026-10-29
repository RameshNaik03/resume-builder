// POST /api/ats/optimize: the improved copy of a resume (structure fixes, keywords, AI bullet
// rewrites and their safety checks). Includes the key guarantee: the optimizer never adds a
// skill that isn't already in the original resume.
import { test } from "node:test";
import { findKnownSkills } from "../services/ats/keywords.js";
import { checkRewrite } from "../services/ats/rewriteBullets.js";
import resumeToText from "../services/ats/resumeToText.js";
import { checker, DOCX, PDF, readFixture, register, startApi } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";

const isChange = (change) => ["id", "section", "before", "after", "reason"].every((key) => typeof change[key] === "string" && change[key]);
const sortedJson = (object) => JSON.stringify(Object.fromEntries(Object.entries(object).sort()));

// A saved resume with things to fix: jobs in the wrong order, weak bullets, a renamed
// heading, a two-column design, and Docker mentioned only in a bullet (not in Skills)
const SAVED = {
  title: "Frontend CV",
  template: "sidebar-slate",
  personalInfo: { fullName: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210" },
  summary: "<p>Frontend engineer with <strong>6 years</strong> of experience building accessible web apps.</p>",
  experience: [
    { role: "Frontend Developer", company: "Globex", startDate: "Jun 2019", endDate: "Dec 2021", bullets: ["Developed a customer dashboard serving 50,000 monthly users"] },
    { role: "Senior Frontend Engineer", company: "Acme", startDate: "Jan 2022", endDate: "Present", bullets: ["Worked on the checkout page", "Containerised the build with Docker and cut deploy time by 30%", "I led a team of 4 engineers"] },
  ],
  education: [{ degree: "B.Tech", school: "Pune University", year: "2019" }],
  skills: ["React", "TypeScript"],
  design: {
    sectionHeadings: { summary: "About Me" },
    columns: 2,
    hiddenSections: ["projects"],
    fontFamily: "playfair-display",
    accentColor: "#0f766e",
    showPhoto: true,
    photoShape: "square",
    textColor: "#333333",
  },
};

test("ATS optimize", async (t) => {
  const base = await startApi(t, "ats_optimize");
  const check = checker(t);
  let userCount = 0;
  const newUser = () => register(base, `user${++userCount}@example.com`);
  const call = async (method, url, token, body) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const analyze = async (token, file, type) => {
    const form = new FormData();
    form.append("file", new Blob([readFixture(file)], { type }), file);
    return fetch(`${base}/ats/analyze`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }).then((res) => res.json());
  };
  // The request body the client sends after analyzing a file
  const fromAnalysis = (analysis) => ({
    parsedResume: analysis.parsedResume,
    fileName: analysis.file.name,
    headerFooterText: analysis.headerFooterText,
    originalScore: analysis.score,
    failedChecks: analysis.checks.filter((c) => !c.passed).map((c) => c.id),
  });
  const JD = readFixture("jd-frontend.txt", "utf8");

  // ---------- Access and validation ----------
  let token = await newUser();
  let r = await call("POST", "/ats/optimize", null, { parsedResume: {} });
  await check("no token -> 401", r.status === 401, r.status);
  r = await call("POST", "/ats/optimize", token, {});
  await check("nothing to optimize -> 400", r.status === 400, r.body.message);
  r = await call("POST", "/ats/optimize", token, { parsedResume: { skills: [] } });
  await check("empty resume -> 422", r.status === 422, r.body.message);
  r = await call("POST", "/ats/optimize", token, { parsedResume: { personalInfo: { fullName: "A B" } }, jobDescription: "too short" });
  await check("short job description -> 400", r.status === 400, r.body.message);

  // ---------- Weak file: structure fixes without AI ----------
  const weak = await analyze(token, "weak.pdf", PDF);
  r = await call("POST", "/ats/optimize", token, fromAnalysis(weak));
  const optimized = r.body;
  await check("weak file -> 201", r.status === 201, `${r.status} ${optimized.message ?? ""}`);
  await check("works without AI", optimized.optimizedWith === "rules");
  await check("every change is reviewable { id, section, before, after, reason }", optimized.changes.length > 0 && optimized.changes.every(isChange), optimized.changes.find((c) => !isChange(c)));
  await check("change ids are unique", new Set(optimized.changes.map((c) => c.id)).size === optimized.changes.length);
  await check('"My Journey" turned into Experience', optimized.changes.some((c) => c.section === "experience" && c.before.includes("My Journey")));
  await check("dates made consistent", optimized.changes.some((c) => c.before.includes("03/2017") && c.after.includes("Mar 2017")));
  await check("reordered newest first", optimized.changes.some((c) => c.reason.includes("newest first")));
  await check("layout change listed", optimized.changes.some((c) => c.section === "layout" && c.before.includes("weak.pdf")));
  await check("before = the file's analysis score", optimized.scores.before === weak.score && optimized.scores.beforeFrom === "file-analysis");
  await check("score improves", optimized.scores.after > optimized.scores.before, `${optimized.scores.before} -> ${optimized.scores.after}`);
  let created = (await call("GET", `/resumes/${optimized.resume._id}`, token)).body;
  await check("saved as a new resume in Classic Navy", created.template === "classic-navy" && created.title.includes("ATS-optimized") && JSON.stringify(created.design) === "{}");
  await check("newest job first in the new resume", created.experience[0].endDate === "Present" && created.experience.length === 3, created.experience.map((job) => `${job.startDate}-${job.endDate}`).join(", "));
  await check("all dates in one format", created.experience.every((job) => /^[A-Z][a-z]{2} \d{4}$/.test(job.startDate) && /^([A-Z][a-z]{2} \d{4}|Present)$/.test(job.endDate)));
  await check("'I was responsible...' bullet not rewritten by the rules", created.experience.flatMap((job) => job.bullets).some((bullet) => bullet.includes("I was responsible")));

  // ---------- Contact details only in the header ----------
  const headerDoc = await analyze(token, "header-table-docx.docx", DOCX);
  await check("analyze returns headerFooterText", headerDoc.headerFooterText.some((text) => text.includes("@")));
  r = await call("POST", "/ats/optimize", token, fromAnalysis(headerDoc));
  created = (await call("GET", `/resumes/${r.body.resume._id}`, token)).body;
  await check("contact moved into the body", created.personalInfo.email === "priya.sharma@example.com" && created.personalInfo.phone.includes("98765"), created.personalInfo);
  await check("contact changes listed", r.body.changes.filter((c) => c.section === "personalInfo").length >= 2);

  // ---------- Saved resume + job description: keywords ----------
  const saved = (await call("POST", "/resumes", token, SAVED)).body;
  const jdDocker = `${JD}\nRequirements also include Docker and Kubernetes for deployments. Docker and Kubernetes experience is a must for this role.`;
  r = await call("POST", "/ats/optimize", token, { resumeId: saved._id, jobDescription: jdDocker, failedChecks: ["reverse-chronological"] });
  const fromSaved = r.body;
  await check("saved resume -> 201", r.status === 201, `${r.status} ${fromSaved.message ?? ""}`);
  created = (await call("GET", `/resumes/${fromSaved.resume._id}`, token)).body;
  const originalAfter = (await call("GET", `/resumes/${saved._id}`, token)).body;
  await check(
    "original never overwritten",
    originalAfter.updatedAt === saved.updatedAt && JSON.stringify(originalAfter.experience) === JSON.stringify(saved.experience) && originalAfter.template === "sidebar-slate"
  );
  await check("new resume is a different document", fromSaved.resume._id !== saved._id);
  await check(
    "design: accent color and hidden sections kept; fonts, columns, photo, headings, text color reset",
    sortedJson(created.design) === sortedJson({ hiddenSections: ["projects"], accentColor: "#0f766e" }),
    created.design
  );
  await check("custom heading reset is listed", fromSaved.changes.some((c) => c.section === "summary" && c.before.includes("About Me")));
  await check("two-column layout change listed", fromSaved.changes.some((c) => c.section === "layout" && c.before.includes("two columns")));
  await check("rule fix: 'I led' -> 'Led'", created.experience.flatMap((job) => job.bullets).some((bullet) => bullet.includes("Led a team of 4")) && fromSaved.changes.some((c) => c.after.startsWith("Led a team")));
  await check("Docker (shown in a bullet) added to Skills with evidence", created.skills.includes("Docker") && fromSaved.changes.some((c) => c.section === "skills" && c.after === "Docker" && c.reason.includes("Containerised")));
  await check("Kubernetes (not in the resume) only suggested", !created.skills.includes("Kubernetes") && fromSaved.skillsToConsider.some((k) => k.term === "Kubernetes"));
  await check("Next.js (not in the resume) only suggested", !created.skills.includes("Next.js") && fromSaved.skillsToConsider.some((k) => k.term === "Next.js"));
  await check("saved resume's before score computed by the server", fromSaved.scores.beforeFrom === "saved-resume" && Number.isInteger(fromSaved.scores.before));

  // The key guarantee: every skill in the new resume was already in the original resume
  const originalSkills = new Set(findKnownSkills(resumeToText(saved)));
  const addedSkills = findKnownSkills(`${created.skills.join(", ")}\n${resumeToText(created)}`).filter((skill) => !originalSkills.has(skill));
  await check("never adds a skill that isn't in the original resume", addedSkills.length === 0, addedSkills.join(", "));

  r = await call("POST", "/ats/optimize", await newUser(), { resumeId: saved._id });
  await check("someone else's resume -> 404", r.status === 404, r.status);

  // ---------- AI rewrites (fake Claude API) ----------
  // Only weak bullets are sent: "Worked on...", "Containerised..." (no known action verb) and
  // "I led..." (pronoun). The unsafe rewrites come first, so a later safe one still wins.
  let fakeMode = "ok";
  const claude = await startFakeClaude((request) => {
    if (fakeMode === "error") return { status: 500, error: "api_error" };
    const content = request.messages[0].content;
    const ids = Object.fromEntries([...content.matchAll(/- id: (\S+)\n {2}text: (.*)/g)].map((m) => [m[2], m[1]]));
    const idOf = (start) => ids[Object.keys(ids).find((text) => text.startsWith(start))];
    return {
      rewrites: [
        { id: idOf("Worked on the checkout"), after: "Rebuilt the checkout page, raising conversion by [40%]", reason: "x" }, // number in a placeholder
        { id: idOf("Worked on the checkout"), after: "Partnered with Google to rebuild the checkout page", reason: "x" }, // new company
        { id: idOf("Worked on the checkout"), after: "Rebuilt the checkout page, raising conversion by [X%]", reason: "Action verb and a measurable result." },
        { id: idOf("Containerised"), after: "Containerised the build with Docker and Kubernetes, cutting deploy time by 30%", reason: "x" }, // new skill
        { id: idOf("I led a team"), after: "Led a team of 4 engineers, cutting bugs by 60%", reason: "x" }, // invented number
      ],
    };
  });
  r = await call("POST", "/ats/optimize", token, { resumeId: saved._id, jobDescription: jdDocker, failedChecks: ["quantified", "action-verbs"] });
  const ai = r.body;
  created = (await call("GET", `/resumes/${ai.resume._id}`, token)).body;
  const bullets = created.experience.flatMap((job) => job.bullets).join("\n");
  await check("AI: optimizedWith rules+ai", ai.optimizedWith === "rules+ai", `${r.status} ${ai.message ?? ""}`);
  await check("AI: failed checks passed to the model", claude.requests.at(-1).messages[0].content.includes("quantified, action-verbs"));
  await check(
    "AI: safe rewrite applied with a placeholder",
    bullets.includes("Rebuilt the checkout page, raising conversion by [X%]") && ai.changes.some((c) => c.before === "Worked on the checkout page" && c.reason === "Action verb and a measurable result.")
  );
  await check("AI: 4 unsafe rewrites rejected", ai.rewritesRejected === 4, ai.rewritesRejected);
  await check("AI: no invented skill, number or company in bullets", !/Kubernetes|60%|Google|\[40%\]/.test(bullets), bullets);
  await check("AI: 'I led' still fixed by the rules after the AI's rewrite was rejected", bullets.includes("Led a team of 4 engineers"));
  const aiAdded = findKnownSkills(`${created.skills.join(", ")}\n${resumeToText(created)}`).filter((skill) => !originalSkills.has(skill));
  await check("AI: never adds a skill that isn't in the original resume", aiAdded.length === 0, aiAdded.join(", "));

  fakeMode = "error";
  const consoleError = console.error;
  console.error = () => {}; // The expected "API error 500" log
  r = await call("POST", "/ats/optimize", token, { resumeId: saved._id });
  console.error = consoleError;
  await check("AI error -> rule-based result still saved", r.status === 201 && r.body.optimizedWith === "rules" && r.body.changes.some((c) => c.after.startsWith("Led a team")), `${r.status} ${r.body.optimizedWith}`);
  claude.close();

  // ---------- Rate limit: 10 per user per hour ----------
  token = await newUser();
  const small = { parsedResume: { personalInfo: { fullName: "Asha Rao" }, skills: ["Excel"] } };
  const statuses = [];
  for (let i = 0; i < 11; i++) statuses.push((await call("POST", "/ats/optimize", token, small)).status);
  await check("11th optimization -> 429", statuses.slice(0, 10).every((status) => status === 201) && statuses[10] === 429, statuses.join());
});

test("checkRewrite: AI rewrites never invent facts", async (t) => {
  const check = checker(t);
  const resumeText = resumeToText(SAVED);
  await check("placeholder allowed", checkRewrite("Worked on the checkout page", "Rebuilt the checkout page, raising conversion by [X%]", resumeText) === null);
  await check("kept number and skill allowed", checkRewrite("Cut deploy time by 30% using Docker", "Reduced deploy time by 30% with Docker", resumeText) === null);
  await check("invented number rejected", /new number/.test(checkRewrite("Worked on the checkout page", "Rebuilt the checkout page, raising conversion by 40%", resumeText)));
  await check("numeric placeholder rejected", /placeholder/.test(checkRewrite("Worked on the checkout page", "Rebuilt the checkout page [40%]", resumeText)));
  await check("new skill rejected", /new skill/.test(checkRewrite("Worked on the checkout page", "Rebuilt the checkout page in Kubernetes", resumeText)));
  await check("new company rejected", /new name/.test(checkRewrite("Worked on the checkout page", "Partnered with Google on the checkout page", resumeText)));
  await check("a capital at a sentence start is fine", checkRewrite("Worked on the checkout page and the cart", "Rebuilt the checkout page. Simplified the cart", resumeText) === null);
});
