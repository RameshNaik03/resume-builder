// The ATS optimizer's review step: the review state saved on the new resume, accepting and
// rejecting changes (each one reverts exactly), the skills checklist, re-scoring, the lock once
// the resume is edited in the editor, and the dashboard's ATS badge.
import { test } from "node:test";
import { checker, PDF, readFixture, register, startApi } from "./helpers/api.js";

// A saved resume with something for every kind of change: a renamed heading, a two-column
// template with its own font, jobs out of order with mixed date formats, a project line as
// the first bullet, an "I led" bullet, and Docker mentioned only in a bullet
const SAVED = {
  title: "Frontend CV",
  template: "sidebar-slate",
  personalInfo: { fullName: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210", location: "Pune, India" },
  summary: "Frontend engineer with 6 years of experience building accessible web apps.",
  experience: [
    { role: "Frontend Developer", company: "Globex", startDate: "06/2019", endDate: "12/2021", bullets: ["Developed a customer dashboard serving 50,000 monthly users"] },
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
  design: { sectionHeadings: { summary: "About Me" }, columns: 2, fontFamily: "playfair-display", accentColor: "#0f766e" },
};

const JD = `${readFixture("jd-frontend.txt", "utf8")}\nDocker and Kubernetes experience is required. We deploy with Docker and Kubernetes.`;
const plainBullets = (resume) => resume.experience.map((job) => job.bullets.map((b) => b.replace(/<[^>]+>/g, "")));

test("ATS optimization review", async (t) => {
  const base = await startApi(t, "ats_review");
  const check = checker(t);
  const token = await register(base, "review@example.com");
  const call = async (method, url, body, as = token) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...(as && { Authorization: `Bearer ${as}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  // ---------- The review state is saved on the new resume ----------
  const saved = (await call("POST", "/resumes", SAVED)).body;
  let r = await call("POST", "/ats/optimize", { resumeId: saved._id, jobDescription: JD });
  await check("optimize -> 201", r.status === 201, r.body.message);
  const id = r.body.resume._id;
  const created = (await call("GET", `/resumes/${id}`)).body;
  const review = created.atsOptimization;
  await check("atsOptimization saved on the new resume", review && review.changes.length === r.body.changes.length && review.scores.after === r.body.scores.after);
  await check("  every change starts as pending", review.changes.every((c) => c.status === "pending"));
  await check("  with the original to compare with", review.original.template === "sidebar-slate" && review.original.experience.length === 2);
  await check("  and the skills to consider", review.skillsToConsider.some((s) => s.term === "Kubernetes"));
  await check("atsScore badge set (the score after)", created.atsScore?.score === r.body.scores.after);

  const byKind = (kind) => review.changes.find((c) => c.op.kind === kind);
  const kinds = ["subtitle", "heading", "jobField", "order", "bullet", "addSkill", "layout"];
  await check("one change of every kind", kinds.every((kind) => byKind(kind)), review.changes.map((c) => c.op.kind).join(", "));
  await check("project line moved to the subtitle", created.experience.find((j) => j.company === "Acme").subtitle === "BookIt, a booking platform for clinics (React, Node.js)");
  await check("changes say what to highlight", byKind("bullet").marks.optimized[0] === "Led a team of 4 engineers" && byKind("bullet").marks.original[0] === "I led a team of 4 engineers");

  const decide = (changeId, status, extra = {}) => call("PATCH", `/ats/review/${id}`, { decisions: [{ id: changeId, status }], ...extra });
  const acme = (resume) => resume.experience.find((job) => job.company === "Acme");
  const globex = (resume) => resume.experience.find((job) => job.company === "Globex");

  // ---------- Rejecting reverts each change; accepting again re-applies it ----------
  r = await decide(byKind("subtitle").id, "rejected");
  await check("reject subtitle -> back to the first bullet", r.status === 200 && acme(r.body).subtitle === "" && acme(r.body).bullets[0].includes("BookIt"), acme(r.body ?? {}) ?? r.body.message);
  r = await decide(byKind("subtitle").id, "accepted");
  await check("accept again -> subtitle again", acme(r.body).subtitle.startsWith("BookIt") && !acme(r.body).bullets.some((b) => b.includes("BookIt")));

  const startDate = review.changes.find((c) => c.op.kind === "jobField" && c.op.field === "startDate" && c.before.includes("06/2019"));
  r = await decide(startDate.id, "rejected");
  await check("reject a date fix -> 06/2019 again", globex(r.body).startDate === "06/2019" && globex(r.body).endDate === "Dec 2021", `${globex(r.body).startDate} – ${globex(r.body).endDate}`);

  r = await decide(byKind("order").id, "rejected");
  await check("reject newest-first -> original order", r.body.experience[0].company === "Globex", r.body.experience.map((j) => j.company).join(", "));
  r = await decide(byKind("order").id, "accepted");
  await check("accept it again -> newest first", r.body.experience[0].company === "Acme");

  r = await decide(byKind("bullet").id, "rejected");
  await check('reject "Led a team" -> "I led a team" again', plainBullets(r.body).flat().includes("I led a team of 4 engineers"), plainBullets(r.body).flat().join(" | "));

  r = await decide(byKind("addSkill").id, "rejected");
  await check("reject adding Docker -> not in Skills", !r.body.skills.includes("Docker"), r.body.skills.join(", "));

  r = await decide(byKind("heading").id, "rejected");
  await check('reject the heading -> "About Me" again', r.body.design.sectionHeadings?.summary === "About Me", r.body.design);

  r = await decide(byKind("layout").id, "rejected");
  await check("reject the layout -> original template and design", r.body.template === "sidebar-slate" && r.body.design.columns === 2 && r.body.design.fontFamily === "playfair-display", `${r.body.template} ${JSON.stringify(r.body.design)}`);

  // ---------- Accept all / reject all ----------
  const all = (status) => call("PATCH", `/ats/review/${id}`, { decisions: review.changes.map((c) => ({ id: c.id, status })) });
  r = await all("accepted");
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  await check(
    "accept all -> exactly the optimized resume",
    same(r.body.experience, created.experience) && same(r.body.skills, created.skills) && r.body.template === created.template && same(r.body.design, created.design)
  );
  await check("  statuses saved", r.body.atsOptimization.changes.every((c) => c.status === "accepted"));
  r = await all("rejected");
  await check(
    "reject all -> exactly the original resume",
    same(plainBullets(r.body), plainBullets(saved)) &&
      same(r.body.experience.map((j) => [j.company, j.startDate, j.endDate, j.subtitle]), saved.experience.map((j) => [j.company, j.startDate, j.endDate, ""])) &&
      same(r.body.skills, saved.skills) &&
      r.body.template === "sidebar-slate" &&
      r.body.design.sectionHeadings?.summary === "About Me",
    r.body.experience.map((j) => `${j.company} ${j.startDate}`).join(", ")
  );
  await all("accepted");

  // ---------- Skills to consider (checklist) ----------
  r = await call("PATCH", `/ats/review/${id}`, { selectedSkills: ["Kubernetes", "Hacking"] });
  await check("ticked suggested skill added; unknown ones ignored", r.body.skills.includes("Kubernetes") && !r.body.skills.includes("Hacking") && r.body.atsOptimization.selectedSkills.join() === "Kubernetes", r.body.skills.join(", "));
  r = await call("PATCH", `/ats/review/${id}`, { selectedSkills: [] });
  await check("unticked -> removed again", !r.body.skills.includes("Kubernetes"));

  // ---------- Re-score ----------
  const beforeRescore = (await call("GET", `/resumes/${id}`)).body;
  r = await call("POST", `/ats/rescore/${id}`);
  await check("re-score -> score and grade", r.status === 200 && Number.isInteger(r.body.score) && r.body.grade && r.body.withJobDescription, r.body);
  const afterRescore = (await call("GET", `/resumes/${id}`)).body;
  await check("  saved as the badge and the review's current score", afterRescore.atsScore.score === r.body.score && afterRescore.atsOptimization.currentScore.score === r.body.score);
  await check("  not counted as an edit (updatedAt unchanged)", afterRescore.updatedAt === beforeRescore.updatedAt);

  // ---------- Edited in the editor since the review: decisions are locked ----------
  await check("review steps and re-scoring don't lock the review", !afterRescore.atsOptimization.lockedAt);
  const unchanged = (await call("GET", `/resumes/${id}`)).body;
  r = await call("PUT", `/resumes/${id}`, { ...unchanged, title: "Renamed copy" });
  await check("saving without changing the content (or only the title) doesn't lock it", r.status === 200 && !r.body.atsOptimization.lockedAt);
  r = await call("PUT", `/resumes/${id}`, { summary: "Edited in the editor" });
  await check("an editor edit locks the review", Boolean(r.body.atsOptimization.lockedAt));
  const lockedAt = r.body.atsOptimization.lockedAt;
  r = await decide(byKind("addSkill").id, "rejected");
  await check("  then accepting / rejecting -> 409", r.status === 409 && r.body.message.includes("Run the ATS check again"), r.body.message);
  r = await decide(byKind("addSkill").id, "rejected", { force: true });
  await check("  even with force", r.status === 409);
  const afterLock = (await call("GET", `/resumes/${id}`)).body;
  await check("  and nothing changed", afterLock.summary.replace(/<[^>]+>/g, "") === "Edited in the editor" && afterLock.skills.includes("Docker") && afterLock.atsOptimization.changes.every((c) => c.status === "accepted"));
  r = await call("PATCH", `/ats/review/${id}`, { selectedSkills: ["Kubernetes"] });
  await check("ticking a skill still works and keeps the edits", r.status === 200 && r.body.skills.includes("Kubernetes") && r.body.summary.replace(/<[^>]+>/g, "") === "Edited in the editor", r.body.message);
  await call("PUT", `/resumes/${id}`, { skills: [...r.body.skills, "GraphQL"] });
  r = await call("PATCH", `/ats/review/${id}`, { selectedSkills: [] });
  await check("  unticking removes only that skill", r.status === 200 && !r.body.skills.includes("Kubernetes") && r.body.skills.includes("GraphQL") && r.body.summary.replace(/<[^>]+>/g, "") === "Edited in the editor", r.body.skills.join(", "));
  await check("  and the lock stays as it was", r.body.atsOptimization.lockedAt === lockedAt);
  r = await call("POST", `/ats/rescore/${id}`);
  await check("re-score still works after an edit", r.status === 200 && Number.isInteger(r.body.score));
  const afterRescore2 = (await call("GET", `/resumes/${id}`)).body;

  // ---------- Dashboard badge ----------
  const list = (await call("GET", "/resumes")).body;
  const listed = list.find((item) => item._id === id);
  await check("dashboard list has the badge (no job description in it)", listed.atsScore?.score === afterRescore2.atsScore.score && listed.atsScore.jobDescription === undefined, listed);
  r = await call("POST", `/ats/rescore/${saved._id}`);
  await check("re-check works on any resume", r.status === 200 && Number.isInteger(r.body.score) && r.body.before === null);
  const form = new FormData();
  form.append("resumeId", saved._id);
  await fetch(`${base}/ats/analyze`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const analyzed = (await call("GET", `/resumes/${saved._id}`)).body;
  await check("analyzing a saved resume sets its badge", Number.isInteger(analyzed.atsScore?.score));
  const copy = (await call("POST", `/resumes/${id}/duplicate`)).body;
  await check("a duplicate has no review or badge of its own", copy.atsOptimization === undefined && copy.atsScore === undefined);

  // ---------- Access and validation ----------
  const other = await register(base, "other@example.com");
  r = await call("PATCH", `/ats/review/${id}`, { decisions: [] }, other);
  await check("someone else's review -> 404", r.status === 404);
  r = await call("POST", `/ats/rescore/${id}`, undefined, other);
  await check("someone else's re-score -> 404", r.status === 404);
  r = await call("PATCH", `/ats/review/${saved._id}`, { decisions: [] });
  await check("a resume without a review -> 404", r.status === 404, r.body.message);
  r = await call("PATCH", `/ats/review/${id}`, { decisions: [{ id: "change-999", status: "rejected" }] });
  await check("unknown change -> 400", r.status === 400);
  r = await call("PATCH", `/ats/review/${id}`, { decisions: [{ id: review.changes[0].id, status: "maybe" }] });
  await check("unknown status -> 400", r.status === 400);
  r = await call("PATCH", `/ats/review/${id}`, { decisions: [], atsOptimization: { changes: [], lockedAt: null } });
  await check("the review can't be overwritten through the request", r.status === 200 && r.body.atsOptimization.changes.length === review.changes.length && r.body.atsOptimization.lockedAt);
  r = await call("PUT", `/resumes/${id}`, { atsScore: { score: 100 }, atsOptimization: null });
  await check("nor through a normal resume update", r.body.atsScore.score !== 100 && r.body.atsOptimization);
});

test("ATS optimization review for an uploaded file", async (t) => {
  const base = await startApi(t, "ats_review_file");
  const check = checker(t);
  const token = await register(base, "file@example.com");
  const form = new FormData();
  form.append("file", new Blob([readFixture("weak.pdf")], { type: PDF }), "weak.pdf");
  const analysis = await fetch(`${base}/ats/analyze`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }).then((res) => res.json());
  const call = async (method, url, body) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const optimized = (await call("POST", "/ats/optimize", { parsedResume: analysis.parsedResume, fileName: "weak.pdf", headerFooterText: analysis.headerFooterText, originalScore: analysis.score })).body;
  const id = optimized.resume._id;
  const layout = optimized.changes.find((c) => c.op.kind === "layout");
  const convert = optimized.changes.find((c) => c.op.kind === "convertSection");

  await check("an uploaded file's layout can't be rejected", layout.revertible === false);
  let r = await call("PATCH", `/ats/review/${id}`, { decisions: [{ id: layout.id, status: "rejected" }] });
  await check("  -> 400 if tried", r.status === 400, r.body.message);

  r = await call("PATCH", `/ats/review/${id}`, { decisions: [{ id: convert.id, status: "rejected" }] });
  await check('reject "My Journey -> Experience" -> the section is back, its jobs gone', r.body.additional.some((s) => s.heading === "My Journey") && r.body.experience.length === 0, `${r.body.experience.length} jobs`);
  r = await call("PATCH", `/ats/review/${id}`, { decisions: [{ id: convert.id, status: "accepted" }] });
  await check("accept again -> jobs back, newest first, dates fixed", r.body.experience.length === 3 && r.body.experience[0].endDate === "Present" && r.body.experience.every((j) => !j.startDate.includes("/")), r.body.experience.map((j) => `${j.startDate}-${j.endDate}`).join(", "));
});
