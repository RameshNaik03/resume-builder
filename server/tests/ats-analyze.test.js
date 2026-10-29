// POST /api/ats/analyze: the ATS score (validation, categories and checks, job description
// keywords, risky layouts, saved resumes, the optional AI review, rate limit).
import { test } from "node:test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { checker, DOCX, PDF, readFixture, register, startApi } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";

const SERVER_DIR = fileURLToPath(new URL("..", import.meta.url));

test("ATS analyze", async (t) => {
  const base = await startApi(t, "ats_analyze");
  const check = checker(t);
  let userCount = 0;
  const newUser = () => register(base, `user${++userCount}@example.com`);
  const analyze = async (token, { file, type, fields = {}, route = "analyze" } = {}) => {
    const form = new FormData();
    if (file) form.append("file", new Blob([readFixture(file)], { type }), file);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const res = await fetch(`${base}/ats/${route}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    return { status: res.status, body: await res.json() };
  };
  const JD = readFixture("jd-frontend.txt", "utf8");
  const failed = (body) => body.checks.filter((c) => !c.passed).map((c) => c.id);

  // Files written anywhere under server/ during the test (there should be none)
  const listFiles = () => fs.readdirSync(SERVER_DIR, { recursive: true }).filter((file) => !String(file).startsWith("node_modules"));
  const filesBefore = new Set(listFiles());

  // ---------- Validation ----------
  let token = await newUser();
  let r = await analyze(token);
  await check("no file -> 400", r.status === 400, `${r.status} ${r.body.message}`);
  r = await analyze(token, { file: "notes.txt", type: "text/plain" });
  await check("txt file -> 415", r.status === 415, `${r.status} ${r.body.message}`);
  r = await analyze(token, { file: "fake.pdf", type: PDF });
  await check("renamed non-PDF -> 415", r.status === 415, `${r.status} ${r.body.message}`);
  r = await analyze(token, { file: "clean.pdf", type: PDF, fields: { jobDescription: "React developer wanted" } });
  await check("short job description -> 400", r.status === 400, `${r.status} ${r.body.message}`);
  r = await analyze(token, {
    file: "clean.pdf",
    type: PDF,
    fields: { jobDescription: "We are a friendly group of people and we want someone who is kind and nice to everybody they meet every single day of the week at our lovely office near the river in town" },
  });
  await check("job description without keywords -> 422", r.status === 422, `${r.status} ${r.body.message}`);
  r = await analyze(token, { file: "clean.pdf", type: PDF, fields: { jobTitle: "x".repeat(200) } });
  await check("very long job title -> 400", r.status === 400, `${r.status} ${r.body.message}`);

  // ---------- Clean resume, no job description ----------
  token = await newUser();
  r = await analyze(null, { file: "clean.pdf", type: PDF });
  const clean = r.body;
  await check("guest can analyze -> 200", r.status === 200, r.status);
  await check("score is 85+ with grade Excellent", clean.score >= 85 && clean.grade === "Excellent", `${clean.score} ${clean.grade}`);
  await check("five categories adding up to 100", clean.categories?.length === 5 && clean.categories.reduce((sum, c) => sum + c.maxScore, 0) === 100, clean.categories?.map((c) => c.id).join());
  await check("category maxScores 25/15/25/25/10", clean.categories.map((c) => c.maxScore).join() === "25,15,25,25,10");
  await check("each category lists its checks", clean.categories.every((c) => c.checks.length > 0 && c.checks.every((k) => k.category === c.id)));
  await check("category score = sum of its checks", clean.categories.every((c) => Math.abs(c.checks.reduce((sum, k) => sum + k.points, 0) - c.score) < 0.01));
  await check(
    "every check is explainable",
    clean.checks.every((k) => k.id && k.label && typeof k.passed === "boolean" && k.points <= k.maxPoints && k.reason && (k.passed ? k.fix === null : Boolean(k.fix)))
  );
  await check("atsView is the extracted text", typeof clean.atsView === "string" && clean.atsView.includes("EXPERIENCE"));
  await check("parsedResume in Resume shape", clean.parsedResume?.personalInfo?.fullName && Array.isArray(clean.parsedResume.experience) && clean.parsedResume.experience.length > 0, clean.parsedResume?.personalInfo?.fullName);
  await check("no job description -> skills-section checks", clean.checks.some((k) => k.id === "skills-section") && !clean.keywords.jobDescriptionProvided);
  await check("analyzedWith rules, ruleScore = score", clean.analyzedWith === "rules" && clean.ai === null && clean.ruleScore === clean.score);
  await check("file info", clean.file.type === "pdf" && clean.file.pages === 1 && clean.file.words > 100, clean.file);

  const again = await analyze(token, { file: "clean.pdf", type: PDF });
  await check("same file twice -> same score and checks", again.body.score === clean.score && JSON.stringify(again.body.checks) === JSON.stringify(clean.checks));

  // ---------- With a job description ----------
  r = await analyze(token, { file: "clean.pdf", type: PDF, fields: { jobDescription: JD } });
  await check("with JD -> 200", r.status === 200, `${r.status} ${r.body.message ?? ""}`);
  await check("matched/missing keywords", r.body.matchedKeywords.length > 0 && r.body.missingKeywords.some((k) => k.term === "Next.js"), r.body.missingKeywords.map((k) => k.term).join());
  await check("JS in JD matches JavaScript", r.body.matchedKeywords.some((k) => k.term === "JavaScript"));
  await check("job title found and matched", r.body.keywords.jobTitle === "Sr. Front-End Engineer" && r.body.checks.find((k) => k.id === "job-title").passed, r.body.keywords.jobTitle);
  r = await analyze(token, { file: "clean.pdf", type: PDF, fields: { jobDescription: JD, jobTitle: "Data Scientist" } });
  await check("jobTitle override", r.body.keywords.jobTitle === "Data Scientist" && !r.body.checks.find((k) => k.id === "job-title").passed);

  // ---------- Risky files ----------
  token = await newUser();
  r = await analyze(token, { file: "twocol.pdf", type: PDF });
  await check("two columns flagged", failed(r.body).includes("single-column"));
  r = await analyze(token, { file: "headerfooter.pdf", type: PDF });
  await check("header contact flagged", failed(r.body).includes("header-footer"));
  r = await analyze(token, { file: "columns-textbox-docx.docx", type: DOCX });
  await check("docx columns + text box + font flagged", ["single-column", "no-tables", "fonts-symbols"].every((id) => failed(r.body).includes(id)) && r.body.file.type === "docx");
  r = await analyze(token, { file: "weak.pdf", type: PDF });
  await check("weak resume scores low", r.body.score < 60, `${r.body.score} ${r.body.grade}`);
  await check(
    "weak resume content problems",
    ["no-pronouns", "no-cliches", "consistent-dates", "reverse-chronological", "spelling", "overused-words"].every((id) => failed(r.body).includes(id)),
    failed(r.body).join()
  );
  r = await analyze(token, { file: "scanned.pdf", type: PDF });
  await check("scanned resume -> 200 Poor (not rejected)", r.status === 200 && r.body.grade === "Poor" && failed(r.body).includes("readable-text"), `${r.status} ${r.body.score}`);

  // ---------- AI review (fake Claude API) ----------
  let fakeMode = "ok";
  const claude = await startFakeClaude(() =>
    fakeMode === "error"
      ? { status: 500, error: "api_error" }
      : {
          summary: "Strong, measurable bullets; the summary is generic.",
          contentChecks: [
            { id: "summary", points: 1, reason: "Your summary is generic." },
            { id: "action-verbs", points: 99, reason: "Every bullet opens with a strong verb." },
          ],
          fixes: [
            { checkId: "summary", fix: "Name your specialism and one achievement in the summary." },
            { checkId: "not-a-check", fix: "ignore me" },
          ],
          weakBullets: [
            { original: "Built a component library used by 6 product teams, reducing UI development time by 25%", issue: "fine", rewrite: "Built ... [X]" },
            { original: "Invented bullet that is not in the resume", issue: "x", rewrite: "y" },
          ],
          strengths: ["Numbers everywhere"],
        }
  );
  token = await newUser();
  r = await analyze(token, { file: "clean.pdf", type: PDF });
  const ai = r.body;
  const summary = ai.checks?.find((k) => k.id === "summary");
  const verbs = ai.checks?.find((k) => k.id === "action-verbs");
  await check("AI: analyzedWith rules+ai", ai.analyzedWith === "rules+ai", `${r.status} ${ai.analyzedWith} ${ai.message ?? ""}`);
  await check("AI: content judgment applied", summary?.points === 1 && summary.judgedBy === "ai" && summary.rulePoints === 3 && !summary.passed);
  await check("AI: tailored fix used", summary?.fix === "Name your specialism and one achievement in the summary.");
  await check("AI: points clamped to max", verbs?.points === 6 && verbs.passed);
  await check("AI: total recomputed, ruleScore kept", ai.score === ai.ruleScore - 2 && ai.ruleScore === clean.score, `${ai.score} vs ${ai.ruleScore}`);
  await check("AI: invented bullet dropped", ai.ai?.weakBullets.length === 1);
  await check("AI: other categories untouched", ai.checks.filter((k) => k.category !== "content").every((k) => k.judgedBy === "rules"));

  fakeMode = "error";
  const consoleError = console.error;
  console.error = () => {}; // The expected "API error 500" log
  r = await analyze(token, { file: "clean.pdf", type: PDF });
  console.error = consoleError;
  await check("AI error -> rule-based fallback", r.status === 200 && r.body.analyzedWith === "rules" && r.body.score === clean.score, `${r.status} ${r.body.analyzedWith}`);
  claude.close();

  // ---------- Saved resumes ----------
  token = await newUser();
  const sidebar = await fetch(`${base}/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: "Mine",
      template: "sidebar-slate",
      personalInfo: { fullName: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210" },
      summary: "<p>Frontend engineer with <strong>6 years</strong> of experience building accessible React apps for SaaS products.</p>",
      experience: [{ role: "Frontend Engineer", company: "Acme", startDate: "Jan 2022", endDate: "Present", bullets: ["Led migration to TypeScript, cutting errors by 35%"] }],
      skills: ["React", "TypeScript"],
    }),
  }).then((res) => res.json());
  r = await analyze(null, { fields: { resumeId: sidebar._id } });
  await check("saved resume as guest -> 401", r.status === 401, r.status);
  r = await analyze(await newUser(), { fields: { resumeId: sidebar._id } });
  await check("someone else's resume -> 404", r.status === 404, r.status);
  r = await analyze(token, { fields: { resumeId: "not-an-id" } });
  await check("bad resume id -> 404", r.status === 404, r.status);
  r = await analyze(token, { fields: { resumeId: sidebar._id } });
  const columns = r.body.checks?.find((k) => k.id === "single-column");
  await check("saved -> 200 with source", r.status === 200 && r.body.source.type === "saved" && r.body.file.type === "saved" && r.body.file.pagesEstimated, `${r.status} ${r.body.message ?? ""}`);
  await check("saved sidebar template -> two columns flagged", columns && !columns.passed && columns.reason.includes("template"), columns?.reason);
  await check("short saved resume is scored normally (not 'unreadable')", !r.body.checks.some((k) => k.reason.includes("almost no text")) && r.body.checks.find((k) => k.id === "no-cliches").passed);
  await check("rich text converted for the ATS view", !r.body.atsView.includes("<strong>") && r.body.atsView.includes("6 years"));
  await fetch(`${base}/resumes/${sidebar._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ design: { columns: 1 } }) });
  r = await analyze(token, { fields: { resumeId: sidebar._id } });
  await check("design set to 1 column -> passes", r.body.checks.find((k) => k.id === "single-column").passed);

  // ---------- The old endpoint is gone ----------
  r = await analyze(token, { file: "clean.pdf", type: PDF, fields: { jobDescription: JD }, route: "check" });
  await check("/api/ats/check removed -> 404", r.status === 404, r.status);

  // ---------- Files are only read in memory ----------
  const newFiles = listFiles().filter((file) => !filesBefore.has(file));
  await check("no files written under server/", newFiles.length === 0, newFiles.join());

  // ---------- Rate limit: 15 per hour ----------
  token = await newUser();
  const statuses = [];
  for (let i = 0; i < 16; i++) statuses.push((await analyze(token, { file: "clean.pdf", type: PDF })).status);
  await check("16th request -> 429", statuses.slice(0, 15).every((status) => status === 200) && statuses[15] === 429, statuses.join());
});
