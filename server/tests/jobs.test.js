// Job tailoring: POST /api/jobs/analyze, /tailor and /confirm-skill. The key guarantees:
//   - a skill the resume doesn't show is never added without the user confirming it
//   - the original resume never changes
//   - the match % never counts a skill the resume doesn't show unless the user confirmed it
import { test } from "node:test";
import { checker, register, startApi } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";

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
- Familiarity with GraphQL

About us: Northbeam builds payment infrastructure for marketplaces. Competitive salary and benefits.`;

// Shows Node.js (as "nodejs"), PostgreSQL (as "Postgres"), Kafka and Docker, but not
// Kubernetes, Terraform, AWS or GraphQL
const RESUME = {
  title: "My CV",
  template: "sidebar-pro-navy",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com" },
  summary: "<p>Backend engineer with 8 years of experience building APIs. Enjoys owning services end to end.</p>",
  experience: [
    {
      role: "Backend Engineer",
      company: "Harbour Health",
      startDate: "Jan 2018",
      endDate: "Present",
      bullets: ["Wrote the incident runbooks for on-call", "Built the appointments API in nodejs serving 2 million requests a day", "Cut Postgres query times by 60% with partitioning"],
    },
    { role: "Software Engineer", company: "Tessellate", startDate: "Jul 2015", endDate: "Dec 2017", bullets: ["Ran weekly demos for sales", "Moved 14 services to Kafka consumers"] },
  ],
  education: [{ degree: "M.Sc. Software Engineering", school: "University of Manchester", year: "2015" }],
  skills: ["Python", "Redis", "Node.js"],
  projects: [
    { name: "Recipe Book", description: "A personal cooking site.", link: "" },
    { name: "Queuebench", description: "Load-testing tool for Kafka queues with Docker.", link: "" },
  ],
  design: { columns: 2 },
};

const MISSING = ["Kubernetes", "Terraform", "AWS", "GraphQL"];
// Everything a tailored resume says, as one lowercase text
const allText = (resume) =>
  JSON.stringify([resume.personalInfo, resume.summary, resume.experience, resume.projects, resume.skills, resume.additional]).toLowerCase();

test("job tailoring", async (t) => {
  const base = await startApi(t, "jobs");
  const check = checker(t);
  const call = async (method, url, token, body) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const token = await register(base, "jobs@example.com");
  const other = await register(base, "other@example.com");

  // ---------- Analyze ----------
  let r = await call("POST", "/jobs/analyze", null, { jobDescription: JD });
  await check("analyze without a token -> 401", r.status === 401, r.status);
  r = await call("POST", "/jobs/analyze", token, { jobDescription: "Backend engineer wanted" });
  await check("a too-short description -> 400", r.status === 400, r.body.message);

  r = await call("POST", "/jobs/analyze", token, { jobDescription: JD });
  const analysis = r.body.analysis;
  await check("analyze -> 200 with rules", r.status === 200 && analysis.analyzedWith === "rules", r.body);
  await check("  title, company and seniority", analysis.title === "Senior Backend Engineer" && analysis.company === "Northbeam" && analysis.seniority === "senior", analysis);
  await check(
    "  must-haves from the requirements and duties",
    ["Node.js", "PostgreSQL", "Kafka", "Docker", "Kubernetes"].every((skill) => analysis.mustHave.includes(skill)),
    analysis.mustHave
  );
  await check("  nice-to-haves from their section", ["Terraform", "AWS", "GraphQL"].every((skill) => analysis.niceToHave.includes(skill)), analysis.niceToHave);
  await check("  responsibilities", analysis.responsibilities.length === 3 && analysis.responsibilities[1].startsWith("Own event-driven services"), analysis.responsibilities);
  await check("  keywords leave out the company and title", !analysis.keywords.some((k) => /northbeam|backend engineer/i.test(k)), analysis.keywords);

  // ---------- Tailor ----------
  const original = (await call("POST", "/resumes", token, RESUME)).body;
  const originalSnapshot = JSON.stringify((await call("GET", `/resumes/${original._id}`, token)).body);

  r = await call("POST", "/jobs/tailor", other, { resumeId: original._id, job: { description: JD, analysis } });
  await check("tailoring someone else's resume -> 404", r.status === 404, r.status);

  // A forged analysis: a skill the job never mentions ("Rust") must be dropped
  const forged = { ...analysis, mustHave: [...analysis.mustHave, "Rust"] };
  r = await call("POST", "/jobs/tailor", token, { resumeId: original._id, job: { description: JD, analysis: forged } });
  await check("tailor -> 201", r.status === 201, r.body.message);
  const tailored = r.body;
  const jobId = tailored.jobId;
  await check("  skills not in the job description are dropped from the analysis", !tailored.analysis.mustHave.includes("Rust"), tailored.analysis.mustHave);
  await check("  titled '<Role> – <Company>'", tailored.resume.title === "Senior Backend Engineer – Northbeam", tailored.resume.title);
  await check(
    "  every change in the review format",
    tailored.changes.length > 0 && tailored.changes.every((c) => ["id", "section", "before", "after", "reason"].every((key) => typeof c[key] === "string" && c[key]) && c.op?.kind),
    tailored.changes
  );

  const copy = (await call("GET", `/resumes/${tailored.resume._id}`, token)).body;
  await check("  ATS-friendly template with Fit to one page on", copy.template === "classic-navy" && copy.design.fitOnePage === true && !copy.design.columns, copy.design);
  await check("  Kafka, PostgreSQL and Docker (shown in the resume) are added to Skills", ["Kafka", "PostgreSQL", "Docker"].every((skill) => copy.skills.includes(skill)), copy.skills);
  const kafkaChange = tailored.changes.find((c) => c.op.kind === "addSkill" && c.after === "Kafka");
  await check("  ...quoting where the resume shows it", kafkaChange?.reason.includes("Moved 14 services to Kafka consumers"), kafkaChange?.reason);
  await check("  job skills first in Skills", copy.skills.slice(0, 4).join() === "Node.js,Kafka,PostgreSQL,Docker", copy.skills);
  await check("  bullets that match the job come first", copy.experience[0].bullets[0].includes("appointments API"), copy.experience[0].bullets);
  await check("  the job's spelling of a skill the bullet shows (nodejs -> Node.js)", copy.experience[0].bullets[0].includes("Node.js") && !copy.experience[0].bullets[0].includes("nodejs"), copy.experience[0].bullets[0]);
  await check("  the most relevant project first", copy.projects[0].name === "Queuebench", copy.projects.map((p) => p.name));
  await check("  the summary aims at the job with the person's own '8 years'", /8 years of experience in Node\.js/.test(copy.summary), copy.summary);
  await check("  missing skills are never added without confirmation", MISSING.every((skill) => !allText(copy).includes(skill.toLowerCase())), copy.skills);

  const report = tailored.matchReport;
  await check(
    "match report: missing must-haves and nice-to-haves",
    ["Kubernetes", "REST APIs"].every((s) => report.missingMustHave.includes(s)) && ["Terraform", "AWS", "GraphQL"].every((s) => report.missingNiceToHave.includes(s)),
    report
  );
  await check(
    "  matched skills come with evidence from the resume",
    report.matched.every((m) => m.evidence?.text && m.evidence.section !== "confirmed by you") && report.matched.find((m) => m.skill === "PostgreSQL")?.evidence.text.includes("Postgres"),
    report.matched
  );
  // Must-haves weigh 3, nice-to-haves 1: 4 of 6 must-haves (Node.js, Kafka, PostgreSQL, Docker), 0 of 3 nice
  await check("  the % counts only what the resume shows (must-haves weighted higher)", report.score === Math.round((4 * 3) / (6 * 3 + 3 * 1) * 100), report.score);

  await check("the original resume is unchanged", JSON.stringify((await call("GET", `/resumes/${original._id}`, token)).body) === originalSnapshot);

  // ---------- Confirm a missing skill ----------
  r = await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "Kubernetes" });
  await check("confirming without a note -> 400", r.status === 400, r.body.message);
  r = await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "Rust", note: "I used Rust for years" });
  await check("a skill the job doesn't list -> 400", r.status === 400, r.body.message);
  r = await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "Kafka", note: "Used Kafka at Tessellate" });
  await check("a skill the resume already shows -> 400", r.status === 400, r.body.message);
  r = await call("POST", "/jobs/confirm-skill", other, { jobId, skill: "Kubernetes", note: "Ran services on Kubernetes at Harbour Health" });
  await check("someone else's job -> 404", r.status === 404, r.status);

  r = await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "kubernetes", note: "Ran our services on Kubernetes at Harbour Health" });
  await check("confirm Kubernetes -> 200, added to Skills and as a bullet", r.status === 200 && r.body.skill === "Kubernetes" && r.body.bullet === "Ran our services on Kubernetes at Harbour Health", r.body);
  const afterConfirm = r.body.matchReport;
  await check(
    "  now counted, with the note as its evidence",
    afterConfirm.matched.find((m) => m.skill === "Kubernetes")?.evidence.section === "confirmed by you" && afterConfirm.score > report.score && !afterConfirm.missingMustHave.includes("Kubernetes"),
    afterConfirm
  );
  let confirmedCopy = (await call("GET", `/resumes/${tailored.resume._id}`, token)).body;
  await check(
    "  in the tailored resume: Skills and a bullet under the job the note names",
    confirmedCopy.skills.includes("Kubernetes") && confirmedCopy.experience.find((j) => j.company === "Harbour Health").bullets.includes("Ran our services on Kubernetes at Harbour Health"),
    confirmedCopy.skills
  );

  r = await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "Terraform", note: "used it for side projects at home" });
  await check("a note that doesn't name a job: Skills only, no bullet", r.status === 200 && r.body.bullet === null, r.body);
  await check("  other unconfirmed skills still don't count", ["AWS", "GraphQL"].every((s) => r.body.matchReport.missingNiceToHave.includes(s)), r.body.matchReport);

  // Rejecting every tailoring change in the review keeps the confirmed skills
  const pending = confirmedCopy.atsOptimization.changes.filter((c) => c.status === "pending").map((c) => ({ id: c.id, status: "rejected" }));
  r = await call("PATCH", `/ats/review/${tailored.resume._id}`, token, { decisions: pending });
  confirmedCopy = (await call("GET", `/resumes/${tailored.resume._id}`, token)).body;
  await check(
    "rejecting all tailoring changes keeps the confirmed skills",
    r.status === 200 && confirmedCopy.skills.includes("Kubernetes") && confirmedCopy.skills.includes("Terraform") && !confirmedCopy.skills.includes("Kafka"),
    confirmedCopy.skills
  );
  await check("the original is still unchanged", JSON.stringify((await call("GET", `/resumes/${original._id}`, token)).body) === originalSnapshot);

  // ---------- With AI (a local stand-in for the Claude API) ----------
  const fake = await startFakeClaude((request) => {
    if (request.system.includes("You read job descriptions")) {
      return {
        title: "Senior Backend Engineer",
        company: "Northbeam",
        seniority: "senior",
        mustHave: ["Node.js", "Kafka", "Kubernetes", "Rust"], // Rust isn't in the description
        niceToHave: ["GraphQL"],
        responsibilities: ["Build payment APIs"],
        keywords: ["payments platform", "blockchain"], // "blockchain" isn't either
      };
    }
    // The bullets' ids, from the request ("- id: <id>\n  text: <text>")
    const content = request.messages[0].content;
    const idOf = (text) => content.match(new RegExp(`- id: (\\S+)\\n  text: ${text}`))?.[1];
    return {
      summary: "Backend engineer with 8 years of experience running Kubernetes clusters.", // Adds a skill: dropped
      bullets: [
        { id: "unknown-id", after: "Not a bullet of this resume", reason: "ignored" },
        { id: idOf("Moved 14 services"), after: "Moved 20 services to Kafka consumers", reason: "Adds a number: dropped" },
        { id: idOf("Ran weekly demos"), after: "Led weekly demos for the sales team", reason: "Clearer verb" }, // Safe: kept
      ],
    };
  });
  t.after(() => fake.close());

  r = await call("POST", "/jobs/analyze", token, { jobDescription: JD });
  await check("AI analysis -> only skills and keywords the description has", r.body.analysis.analyzedWith === "rules+ai" && !r.body.analysis.mustHave.includes("Rust") && r.body.analysis.mustHave.includes("Kubernetes") && !r.body.analysis.keywords.includes("blockchain"), r.body.analysis);

  r = await call("POST", "/jobs/tailor", token, { resumeId: original._id, job: { description: JD, analysis: r.body.analysis } });
  const aiCopy = (await call("GET", `/resumes/${r.body.resume._id}`, token)).body;
  await check(
    "AI tailoring: a summary adding Kubernetes is dropped by the safety check",
    r.status === 201 && r.body.tailoredWith === "rules+ai" && !allText(aiCopy).includes("kubernetes"),
    aiCopy.summary
  );
  const bullets = aiCopy.experience.flatMap((job) => job.bullets);
  await check(
    "  a rewrite adding a number is dropped; a safe rewording is kept",
    r.body.rewritesRejected === 2 && bullets.includes("Moved 14 services to Kafka consumers") && bullets.includes("Led weekly demos for the sales team"),
    { rejected: r.body.rewritesRejected, bullets }
  );
  await check("the original is unchanged after AI tailoring too", JSON.stringify((await call("GET", `/resumes/${original._id}`, token)).body) === originalSnapshot);
});
