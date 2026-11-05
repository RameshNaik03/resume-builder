// Applications (a tailored resume + its job + its cover letters) through the API:
//   - the options panel (POST /api/jobs/options) and tailoring with options
//   - hidden bullets are kept and can be restored (review "reject", or the editor's save)
//   - tailoring a tailored copy is flagged, with its base resume
//   - the same resume for the same job: replace the existing version (no duplicate) or add one
//   - deleting: ownership is checked, and no cover letter or job is left orphaned
//   - the original resume never changes
import { test } from "node:test";
import { checker, register, startApi } from "./helpers/api.js";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import CoverLetter from "../models/CoverLetter.js";

const JD = `Backend Developer (Node.js)
Datastream is hiring a Backend Developer to build and scale our APIs.

What you'll do
- Design and build RESTful APIs with Node.js and Express
- Model data and write efficient queries in MongoDB with Mongoose
- Implement authentication and authorization with JWT
- Deploy services with Docker on AWS

Requirements
- 2+ years of experience with Node.js, Express and MongoDB
- Solid understanding of REST API design and JWT authentication
- Experience with Docker, Git and CI/CD`;

const RESUME = {
  title: "Base CV",
  template: "classic-navy",
  personalInfo: { fullName: "Ravi Kumar", headline: "Full Stack Developer", email: "ravi@example.com" },
  summary: "<p>Full Stack Developer with 1.5+ years of experience building RESTful APIs with Node.js and MongoDB.</p>",
  experience: [
    {
      role: "Full Stack Developer",
      company: "Northwind",
      startDate: "Jan 2025",
      endDate: "Present",
      bullets: [
        "Ran the office book club",
        "Designed RESTful APIs in Node.js and Express",
        "Planned the team offsite",
        "Designed MongoDB schemas for application data",
        "Organised the charity bake sale",
      ],
    },
  ],
  skills: ["Python", "Node.js", "MongoDB", "Git"],
  projects: [
    { name: "Recipe Book", description: "A personal cooking site.", link: "" },
    { name: "Queue Lab", description: "A job queue with JWT authentication, built with Node.js, Express and MongoDB, deployed with Docker on AWS.", link: "" },
  ],
};

test("applications: options, hidden bullets, versions and deleting", async (t) => {
  const base = await startApi(t, "applications");
  const check = checker(t);
  const call = async (method, url, token, body) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const token = await register(base, "apps@example.com");
  const other = await register(base, "apps-other@example.com");

  const original = (await call("POST", "/resumes", token, RESUME)).body;
  const snapshot = async () => JSON.stringify((await call("GET", `/resumes/${original._id}`, token)).body);
  const originalSnapshot = await snapshot();
  const { analysis } = (await call("POST", "/jobs/analyze", token, { jobDescription: JD })).body;
  const job = { description: JD, analysis };

  // ---------- Options ----------
  let r = await call("POST", "/jobs/options", token, { resumeId: original._id, job });
  const options = r.body;
  await check("options -> 200", r.status === 200, r.body);
  await check("  skills the resume shows, must-haves first", options.skills.length > 0 && options.skills.every((s) => s.shownIn > 0) && options.skills[0].required && options.skills.some((s) => s.skill === "MongoDB"), options.skills);
  await check("  projects with how much of the job they show", options.projects.find((p) => p.name === "Queue Lab")?.score > options.projects.find((p) => p.name === "Recipe Book")?.score, options.projects);
  await check("  each job's bullet scores (0 = would be hidden over the limit)", options.jobs[0].scores.length === 5 && options.jobs[0].scores.filter((s) => s === 0).length === 3, options.jobs);
  await check("  a default title '<Role> – <Company>'", options.suggestedTitle === "Backend Developer – Datastream", options.suggestedTitle);
  await check("  not a tailored copy, no earlier versions", options.tailoredFrom === null && options.existingVersions.length === 0, options);
  r = await call("POST", "/jobs/options", other, { resumeId: original._id, job });
  await check("  someone else's resume -> 404", r.status === 404, r.status);

  // ---------- Tailor with options ----------
  r = await call("POST", "/jobs/tailor", token, {
    resumeId: original._id,
    job,
    options: { maxBulletsPerJob: 2, excludedProjects: ["Recipe Book"], featuredSkills: ["MongoDB", "Node.js"], fitOnePage: false },
  });
  await check("tailor with options -> 201, titled '<Role> – <Company>'", r.status === 201 && r.body.resume.title === "Backend Developer – Datastream", r.body);
  const first = r.body;
  let copy = (await call("GET", `/resumes/${first.resume._id}`, token)).body;
  const northwind = copy.experience[0];
  await check("  only irrelevant bullets beyond the limit are hidden (kept, not deleted)", northwind.bullets.length === 2 && northwind.hiddenBullets.length === 3 && northwind.hiddenBullets.includes("Ran the office book club"), northwind);
  await check("  the excluded project is left out", copy.projects.length === 1 && copy.projects[0].name === "Queue Lab", copy.projects);
  await check("  featured skills first, in the chosen order", copy.skills[0] === "MongoDB" && copy.skills[1] === "Node.js", copy.skills);
  await check("  Projects before Experience (a project shows more of the job)", copy.design.sectionOrder.indexOf("projects") < copy.design.sectionOrder.indexOf("experience"), copy.design.sectionOrder);
  await check("  Fit to one page as chosen (off)", !copy.design.fitOnePage, copy.design);
  const differences = first.tailoring.differences;
  await check(
    "  'how this version differs', by type",
    ["bulletsHidden", "projectsExcluded", "sectionOrder", "skillsReordered"].every((type) => differences.byType.some((entry) => entry.type === type)) && differences.byType.find((e) => e.type === "bulletsHidden").count === 3,
    differences
  );

  // ---------- Hidden bullets can be restored ----------
  const hideChange = copy.atsOptimization.changes.find((change) => change.op.kind === "hideBullets");
  r = await call("PATCH", `/ats/review/${copy._id}`, token, { decisions: [{ id: hideChange.id, status: "rejected" }] });
  copy = (await call("GET", `/resumes/${first.resume._id}`, token)).body;
  await check("restore: rejecting the change in the review brings the bullets back", r.status === 200 && copy.experience[0].bullets.length === 5 && copy.experience[0].hiddenBullets.length === 0, copy.experience[0]);

  // The editor: a second copy, restored by saving the bullet back (what the "Restore" button does)
  r = await call("POST", "/jobs/tailor", token, { resumeId: original._id, job, options: { maxBulletsPerJob: 2 } });
  const second = r.body;
  copy = (await call("GET", `/resumes/${second.resume._id}`, token)).body;
  const [restore, ...stillHidden] = copy.experience[0].hiddenBullets;
  const experience = [{ ...copy.experience[0], bullets: [...copy.experience[0].bullets, restore], hiddenBullets: stillHidden }];
  r = await call("PUT", `/resumes/${second.resume._id}`, token, { experience });
  copy = (await call("GET", `/resumes/${second.resume._id}`, token)).body;
  await check("restore: the editor's save moves a hidden bullet back", r.status === 200 && copy.experience[0].bullets.includes(restore) && copy.experience[0].hiddenBullets.length === 2, copy.experience[0]);

  // ---------- A tailored copy is flagged ----------
  r = await call("POST", "/jobs/options", token, { resumeId: first.resume._id, job });
  await check("options for a tailored copy point to its base resume", r.body.tailoredFrom?.resumeId === original._id && r.body.tailoredFrom.title === "Base CV", r.body.tailoredFrom);

  // ---------- Versions: replace or add ----------
  r = await call("POST", "/jobs/options", token, { resumeId: original._id, job });
  await check("earlier versions of this resume for this job are listed", r.body.existingVersions.length === 2 && r.body.existingVersions.every((v) => v.jobId && v.resumeId && v.title), r.body.existingVersions);

  // A cover letter and a confirmed skill on the first version, which is then replaced
  const letter = (await call("POST", "/cover-letters", token, { resumeId: first.resume._id, jobId: first.jobId, title: "Letter", body: "<p>Hello</p>" })).body;
  r = await call("POST", "/jobs/confirm-skill", token, { jobId: first.jobId, skill: "CI/CD", note: "Set up CI/CD pipelines at Northwind", placement: "skills" });
  await check("(setup) CI/CD confirmed on the first version", r.status === 200, r.body);
  const counts = async () => ({ jobs: await Job.countDocuments(), resumes: await Resume.countDocuments(), letters: await CoverLetter.countDocuments() });
  const before = await counts();
  r = await call("POST", "/jobs/tailor", token, { resumeId: original._id, job, replaceJobId: first.jobId, options: { strength: "strong" }, title: "Datastream (v2)" });
  await check("replace -> 200, the same job and resume ids", r.status === 200 && r.body.replaced && r.body.jobId === first.jobId && r.body.resume._id === first.resume._id && r.body.resume.title === "Datastream (v2)", r.body);
  await check("  no duplicate: the same number of jobs, resumes and letters", JSON.stringify(await counts()) === JSON.stringify(before), { before, after: await counts() });
  copy = (await call("GET", `/resumes/${first.resume._id}`, token)).body;
  await check("  the new tailoring replaced the old one (no hidden bullets now) and keeps the confirmed skill", copy.experience[0].hiddenBullets.length === 0 && copy.skills.includes("CI/CD"), copy);
  await check("  the cover letter is still linked", String((await CoverLetter.findById(letter._id)).resumeId) === first.resume._id, letter);

  r = await call("POST", "/jobs/tailor", token, { resumeId: first.resume._id, job, replaceJobId: second.jobId });
  await check("replacing a version of another resume -> 400", r.status === 400, r.body);
  r = await call("POST", "/jobs/tailor", other, { resumeId: original._id, job, replaceJobId: first.jobId });
  await check("replacing as someone else -> 404", r.status === 404, r.status);
  r = await call("POST", "/jobs/tailor", token, { resumeId: original._id, job });
  const third = r.body;
  await check("create a new version instead -> a third application", r.status === 201 && (await Job.countDocuments()) === before.jobs + 1, r.body);

  // ---------- Deleting ----------
  const otherResume = (await call("POST", "/resumes", other, { ...RESUME, title: "Other CV" })).body;
  r = await call("DELETE", `/jobs/${first.jobId}`, other);
  await check("deleting someone else's application -> 404", r.status === 404 && (await Job.exists({ _id: first.jobId })), r.status);
  r = await call("DELETE", `/resumes/${first.resume._id}`, other);
  await check("deleting someone else's resume -> 404", r.status === 404 && (await Resume.exists({ _id: first.resume._id })), r.status);
  r = await call("POST", "/resumes/delete-many", other, { resumeIds: [original._id], jobIds: [first.jobId] });
  await check("bulk delete ignores ids that aren't yours", r.status === 200 && r.body.resumes === 0 && r.body.applications === 0 && (await Resume.exists({ _id: original._id })), r.body);
  r = await call("POST", "/resumes/delete-many", token, { resumeIds: [], jobIds: [] });
  await check("bulk delete with nothing chosen -> 400", r.status === 400, r.body);

  // Resume only: the job stays, its cover letter moves to the base resume
  r = await call("DELETE", `/resumes/${first.resume._id}`, token);
  await check("delete resume only -> the job stays", r.status === 200 && !(await Resume.exists({ _id: first.resume._id })) && (await Job.exists({ _id: first.jobId })), r.body);
  await check("  its cover letter moves to the base resume (not orphaned)", String((await CoverLetter.findById(letter._id))?.resumeId) === original._id && r.body.lettersMoved === 1, r.body);

  // The whole application: job, resume and cover letters
  const letter3 = (await call("POST", "/cover-letters", token, { resumeId: third.resume._id, jobId: third.jobId, title: "Letter 3", body: "<p>Hi</p>" })).body;
  r = await call("DELETE", `/jobs/${third.jobId}`, token);
  await check(
    "delete the whole application -> job, resume and cover letter gone",
    r.status === 200 && !(await Job.exists({ _id: third.jobId })) && !(await Resume.exists({ _id: third.resume._id })) && !(await CoverLetter.exists({ _id: letter3._id })),
    r.body
  );

  // Bulk: the first job (its resume is already gone) as a whole application, and the second copy
  r = await call("POST", "/resumes/delete-many", token, { resumeIds: [second.resume._id], jobIds: [first.jobId] });
  await check("bulk delete -> an application and a resume", r.status === 200 && r.body.applications === 1 && r.body.resumes === 1, r.body);
  const resumeIds = (await Resume.find({}, { _id: 1 }).lean()).map((resume) => String(resume._id));
  const orphanLetters = (await CoverLetter.find({}).lean()).filter((l) => !resumeIds.includes(String(l.resumeId)));
  const orphanJobs = await Job.countDocuments({ userId: (await Resume.findById(original._id)).userId, tailoredResumeId: { $nin: resumeIds } });
  await check("no cover letter without its resume, no job left behind", orphanLetters.length === 0 && orphanJobs === 1, { orphanLetters, orphanJobs }); // The second copy's job: its resume was deleted on its own, as asked
  await check("the other user's resume is untouched", Boolean(await Resume.exists({ _id: otherResume._id })));

  await check("the original resume never changed", (await snapshot()) === originalSnapshot);
});
