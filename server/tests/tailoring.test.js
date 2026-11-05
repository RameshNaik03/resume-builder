// Tailoring a resume to a job (services/jobs/tailorResume.js), without the API:
//   - the bugs found in the diagnosis: years ("1.5+" read as "5+"), sentence splitting at the
//     dot in "Node.js", duplicated words from spelling swaps ("REST APIs APIs") and skills
//     added on a generic word ("API security" as Cybersecurity)
//   - the safety check's scope: a bullet may name skills its own job shows, not other jobs'
//   - the AI path (a local stand-in for the Claude API): two different jobs get clearly
//     different headlines, summaries and bullets; the strength decides how many bullets
import { test } from "node:test";
import { checker } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";
import tailorResume, { splitSentences, statedYears } from "../services/jobs/tailorResume.js";
import { analyzeJobWithRules } from "../services/jobs/analyzeJob.js";
import matchReport from "../services/jobs/matchReport.js";
import { checkGermanRewrite, checkRewrite } from "../services/ats/rewriteBullets.js";
import { buildContent } from "../services/ats/optimizationOps.js";
import describeDifferences, { changedShare } from "../services/jobs/differences.js";
import resumeToText from "../services/ats/resumeToText.js";
import { htmlToText } from "../utils/richText.js";

const plain = (html) => htmlToText(String(html ?? "")).replace(/\s+/g, " ").trim();

const FRONTEND = `Frontend Developer (React)
Pixelcraft is hiring a Frontend Developer to build fast, accessible user interfaces.

What you'll do
- Build responsive, accessible UI components in React and TypeScript
- Turn Figma designs into pixel-perfect pages with Tailwind CSS
- Manage client state with Redux and talk to REST APIs
- Write component tests with Jest

Requirements
- 2+ years of experience with React, JavaScript and TypeScript
- Strong HTML5 and CSS3, responsive design and accessibility (WCAG)
- Experience with Redux, Git and REST APIs`;

const BACKEND = `Backend Developer (Node.js)
Datastream is hiring a Backend Developer to build and scale our APIs.

What you'll do
- Design and build RESTful APIs with Node.js and Express
- Model data and write efficient queries in MongoDB with Mongoose
- Implement authentication and authorization with JWT
- Deploy services with Docker on AWS

Requirements
- 2+ years of experience with Node.js, Express and MongoDB
- Solid understanding of REST API design, JWT authentication and security
- Experience with Docker, Git and CI/CD`;

// Northwind shows React, REST APIs, Node.js, Express and MongoDB; only Brightpath shows TypeScript
const RESUME = {
  title: "My CV",
  template: "classic-navy",
  personalInfo: { fullName: "Ravi Kumar", headline: "Full Stack Developer", email: "ravi@example.com" },
  summary:
    "<p>Full Stack Developer with 1.5+ years of experience building web applications and RESTful APIs with React, Node.js and MongoDB. Currently building an AI-powered coding assistant at Northwind in Berlin, with hands-on work in API security. Studying for an MSc in Information Technology.</p>",
  experience: [
    {
      role: "Full Stack Developer Intern",
      company: "Northwind",
      startDate: "Jan 2025",
      endDate: "Present",
      bullets: [
        "Built reusable, responsive React.js components for the assistant interface, improving usability across screens.",
        "Designed and implemented RESTful APIs connecting the React frontend to backend services.",
        "Implemented authentication, authorization and rate limiting to secure API traffic.",
        "Reduced redundant frontend-to-backend requests by streamlining API calls, improving page load speed.",
        "Designed MongoDB schemas and optimized queries for application data.",
        "Resolved bugs across the full stack, improving the reliability of Node.js/Express.js services.",
      ],
    },
    {
      role: "Front-End Developer",
      company: "Brightpath",
      startDate: "Jun 2023",
      endDate: "Dec 2024",
      bullets: [
        "Developed responsive front-end templates with HTML5, CSS3, JavaScript, Angular and TypeScript.",
        "Applied SEO best practices to improve website visibility.",
        "Contributed to back-end development with Node.js.",
      ],
    },
  ],
  education: [{ degree: "MSc Information Technology", school: "Berlin University", year: "2026" }],
  skills: ["JavaScript", "TypeScript", "React.js", "Angular", "HTML5", "CSS3", "Node.js", "Express.js", "MongoDB", "Git"],
  projects: [],
  design: {},
};

const bulletsOf = (resume) => resume.experience.flatMap((job) => job.bullets.map(plain));

test("tailoring bugs: years, sentences, duplicated words, generic skills", async (t) => {
  const check = checker(t);

  // ---------- 1. Years ----------
  await check("years: '1.5+ years' is 1.5+", statedYears("Developer with 1.5+ years of experience") === "1.5+");
  await check("years: '1,5 years' is 1,5", statedYears("Entwickler with 1,5 years of experience") === "1,5");
  await check("years: 'two years' is two", statedYears("Two roles over two years") === "two");
  await check("years: '8 years' is 8", statedYears("Backend engineer with 8 years of experience") === "8");
  await check("safety check: '5' isn't the '1.5' in the original", /new number: 5/.test(checkRewrite("Built it in 1.5 years", "Built it in 5 years", "")), checkRewrite("Built it in 1.5 years", "Built it in 5 years", ""));
  await check("safety check: a number written as a word is a number", /new number: three/.test(checkRewrite("Led the API team", "Led the three-person API team", "")));

  const frontend = await tailorResume(RESUME, analyzeJobWithRules(FRONTEND), { jobDescription: FRONTEND });
  const summary = plain(frontend.resume.summary);
  await check("the summary keeps the resume's own '1.5+ years'", summary.includes("1.5+ years of experience") && !/(?<![\d.])5\+/.test(summary), summary);
  const undated = { ...RESUME, summary: "<p>Full Stack Developer building web applications with React. Enjoys clean code.</p>" };
  const noYears = plain((await tailorResume(undated, analyzeJobWithRules(FRONTEND), { jobDescription: FRONTEND })).resume.summary);
  await check("no years in the summary when the resume's summary states none (not from the job dates)", !/years/i.test(noYears), noYears);

  // ---------- 2. Sentences ----------
  await check(
    "sentences: never split at Node.js, Next.js, e.g., i.e. or 1.5",
    JSON.stringify(splitSentences("Uses Node.js and Next.js daily, e.g. Express APIs, i.e. Backend work. Has 1.5 years. Ships fast.")) ===
      JSON.stringify(["Uses Node.js and Next.js daily, e.g. Express APIs, i.e. Backend work.", "Has 1.5 years.", "Ships fast."]),
    splitSentences("Uses Node.js and Next.js daily, e.g. Express APIs, i.e. Backend work. Has 1.5 years. Ships fast.")
  );
  await check("the summary has no stray 'js and MongoDB.' fragment", !/\.\s+js\b/.test(summary) && !/\.\s+[a-z]/.test(summary), summary);
  await check("  the rest of the summary is kept whole", summary.includes("Currently building an AI-powered coding assistant at Northwind in Berlin, with hands-on work in API security. Studying for an MSc in Information Technology."), summary);

  // ---------- 3. Duplicated words ----------
  const bullets = bulletsOf(frontend.resume);
  await check("swap: 'RESTful APIs' becomes 'REST APIs' (the whole phrase)", bullets.includes("Designed and implemented REST APIs connecting the React frontend to backend services."), bullets);
  await check("  no doubled word anywhere", !bullets.some((bullet) => /\b(\w+) \1\b/i.test(bullet)), bullets);
  await check("  a spelling the job uses too is left alone (the job writes CSS3)", bullets.some((bullet) => bullet.includes("HTML5, CSS3,")), bullets);
  await check("safety check: a doubled word is rejected", /repeated word: apis/.test(checkRewrite("Built RESTful APIs", "Built REST APIs APIs", "")));

  // ---------- 4. Generic words aren't evidence ----------
  const backendAnalysis = analyzeJobWithRules(BACKEND);
  await check("the job's 'security' still counts as Cybersecurity in the job", backendAnalysis.mustHave.includes("Cybersecurity"), backendAnalysis.mustHave);
  const backend = await tailorResume(RESUME, backendAnalysis, { jobDescription: BACKEND });
  await check("'API security' in the resume doesn't add Cybersecurity", !backend.changes.some((c) => c.op.kind === "addSkill" && c.after === "Cybersecurity") && !backend.resume.skills.includes("Cybersecurity"), backend.resume.skills);
  await check("  ...and the match report counts it as missing", matchReport(backendAnalysis, backend.original).missingMustHave.includes("Cybersecurity"));
  const lambda = analyzeJobWithRules(`Cloud Engineer\nRequirements\n- Experience with lambda functions and serverless\n- Docker and AWS\n${"More words about the role here. ".repeat(6)}`);
  const withLambda = { ...RESUME, experience: [{ ...RESUME.experience[0], bullets: ["Wrote lambda functions in Python for data cleanup"] }] };
  await check(
    "other generic words: 'lambda functions' in a resume isn't evidence of Serverless",
    matchReport({ ...lambda, mustHave: ["Serverless"], niceToHave: [] }, withLambda).missingMustHave.includes("Serverless")
  );
});

test("tailoring safety check: skills from the same job only", async (t) => {
  const check = checker(t);
  const northwind = ["React", "Node.js", "Express", "REST APIs", "MongoDB"];
  const before = "Designed and implemented RESTful APIs connecting the React frontend to backend services.";
  const resumeText = resumeToText(RESUME);
  const after = "Designed and built RESTful APIs with Node.js and Express.js for the React frontend.";
  await check("a skill another bullet of the same job shows is allowed", checkRewrite(before, after, resumeText, { allowedSkills: northwind }) === null, checkRewrite(before, after, resumeText, { allowedSkills: northwind }));
  await check("  ...but not without the same-job list", /new skill: Node\.js/.test(checkRewrite(before, after, resumeText)));
  await check("a skill only another job shows is still blocked", /new skill: TypeScript/.test(checkRewrite(before, "Designed RESTful APIs in TypeScript for the React frontend.", resumeText, { allowedSkills: northwind })));
});

test("AI tailoring: different jobs get different resumes", async (t) => {
  const check = checker(t);
  let answer = () => ({});
  const fake = await startFakeClaude((request) => answer(request.messages[0].content));
  t.after(() => fake.close());
  t.mock.method(console, "info", () => {}); // Dropped rewrites are logged
  // A bullet's id in the request, by its start ("- id: <id>\n  rewrite: yes|no\n  text: <text>")
  const idOf = (content, text) => content.match(new RegExp(`- id: (\\S+)\\n  rewrite: \\w+\\n  text: ${text}`))?.[1];

  const ANSWERS = {
    "Frontend Developer": (content) => ({
      headline: "Front-End Developer | React, TypeScript",
      summary: "Front-end focused developer with 1.5+ years building responsive React interfaces and reusable components, and HTML5, CSS3 and TypeScript front ends in Angular.",
      bullets: [
        { id: idOf(content, "Built reusable"), after: "Built reusable, responsive React UI components for the assistant interface, improving usability across screens.", reason: "Leads with React UI components." },
        // TypeScript is only shown at Brightpath: dropped for a Northwind bullet
        { id: idOf(content, "Designed and implemented RESTful"), after: "Designed and implemented RESTful APIs in TypeScript for the React frontend.", reason: "Adds TypeScript." },
        { id: idOf(content, "Developed responsive"), after: "Built responsive front-end templates in TypeScript, HTML5 and CSS3, with JavaScript and Angular.", reason: "Leads with TypeScript." },
      ],
    }),
    "Backend Developer": (content) => ({
      headline: "Full Stack Developer | Node.js, MongoDB",
      summary: "Full Stack Developer with 1.5+ years building RESTful APIs with Node.js, Express.js and MongoDB, including schema design, query optimization, authentication and rate limiting.",
      bullets: [
        // Node.js and Express are shown by another Northwind bullet: allowed
        { id: idOf(content, "Designed and implemented RESTful"), after: "Designed and built RESTful APIs with Node.js and Express.js connecting backend services to the React frontend.", reason: "Leads with the API work." },
        { id: idOf(content, "Designed MongoDB"), after: "Modeled application data in MongoDB, designing schemas and optimizing queries for backend performance.", reason: "Leads with data modelling." },
      ],
    }),
  };
  answer = (content) => ANSWERS[content.match(/title: (.+)/)[1]](content);

  const run = (jd, strength = "strong") => tailorResume(RESUME, analyzeJobWithRules(jd), { jobDescription: jd, useAI: true, strength });
  const frontend = await run(FRONTEND);
  const frontendRequest = fake.requests.at(-1).messages[0].content;
  const backend = await run(BACKEND);
  const backendRequest = fake.requests.at(-1).messages[0].content;

  await check("the AI gets the job's must-haves, nice-to-haves and responsibilities", /must-have skills \(most important first\): .*Node\.js/.test(backendRequest) && /nice-to-have skills:/.test(backendRequest) && backendRequest.includes("- Model data and write efficient queries in MongoDB"), backendRequest.slice(0, 600));
  await check("  ...the titles it may use, and the years exactly as written", /<allowed_headlines>\nFull Stack Developer\nFull Stack Developer Intern\nFront-End Developer/.test(frontendRequest) && frontendRequest.includes('"1.5+ years"'), frontendRequest);
  await check("  ...and each job's own skills", /job: Full Stack Developer Intern at Northwind\nshows: React, Node\.js, Express, REST APIs, MongoDB/.test(backendRequest), backendRequest);
  await check("both tailored with AI", frontend.tailoredWith === "rules+ai" && backend.tailoredWith === "rules+ai");

  const headline = (result) => result.resume.personalInfo.headline;
  await check("headlines differ, both titles the person has held", headline(frontend) === "Front-End Developer | React, TypeScript" && headline(backend) === "Full Stack Developer | Node.js, MongoDB", [headline(frontend), headline(backend)]);
  await check("summaries differ and are written fresh", plain(frontend.resume.summary).startsWith("Front-end focused developer") && plain(backend.resume.summary).startsWith("Full Stack Developer with 1.5+ years building RESTful APIs"), [plain(frontend.resume.summary), plain(backend.resume.summary)]);
  const frontendBullets = bulletsOf(frontend.resume);
  const backendBullets = bulletsOf(backend.resume);
  await check("bullets differ", frontendBullets.filter((bullet) => !backendBullets.includes(bullet)).length >= 3, { frontendBullets, backendBullets });
  await check("  a same-job skill is kept (Node.js in a Northwind bullet)", backendBullets.includes("Designed and built RESTful APIs with Node.js and Express.js connecting backend services to the React frontend."), backendBullets);
  await check(
    "  another job's skill is dropped and logged with its reason (TypeScript in a Northwind bullet)",
    frontend.rejectedRewrites.some((r) => r.section === "bullet" && r.problem === "new skill: TypeScript") && console.info.mock.calls.some((call) => /new skill: TypeScript/.test(call.arguments[0])),
    frontend.rejectedRewrites
  );

  // Strength: how many bullets are offered for rewriting (the relevant ones, most relevant first)
  const offered = (content) => (content.match(/rewrite: yes/g) ?? []).length;
  const counts = {};
  for (const strength of ["light", "balanced", "strong"]) {
    await run(BACKEND, strength);
    counts[strength] = offered(fake.requests.at(-1).messages[0].content);
  }
  // 5 relevant bullets for this job (APIs, MongoDB, Node.js/Express, authentication, Node.js)
  await check("strength: light none, balanced the top half, strong every relevant bullet", counts.light === 0 && counts.balanced === 3 && counts.strong === 5, counts);
  const light = await run(BACKEND, "light");
  await check("  light rewrites no bullet wording, even one the AI returns", !light.changes.some((c) => c.op.kind === "bullet"), light.changes.map((c) => c.op.kind));

  await check("AI tailoring isn't nearly identical to the base resume", !frontend.differences.nearlyIdentical && !backend.differences.nearlyIdentical, [frontend.differences, backend.differences]);

  // German: the AI writes in German ("1,5+ Jahren" is the resume's own "1.5+ years")
  answer = (content) => ({
    headline: "Full Stack Developer | Node.js, MongoDB",
    summary: "Full Stack Developer mit 1,5+ Jahren Erfahrung mit RESTful APIs in Node.js, Express.js und MongoDB.",
    bullets: [{ id: idOf(content, "Designed MongoDB"), after: "Entwarf MongoDB-Schemas und optimierte Abfragen für Anwendungsdaten.", reason: "Auf Deutsch." }],
  });
  const germanAgain = await tailorResume(RESUME, analyzeJobWithRules(BACKEND), { jobDescription: BACKEND, useAI: true, strength: "strong", language: "de" });
  const germanRequest = fake.requests.at(-1).messages[0].content;
  await check("German: the AI is asked to write in German", germanRequest.includes("<language>Write the headline's focus, the summary and the bullets in German") && germanRequest.includes('"1.5+ Jahre"'), germanRequest.slice(0, 300));
  await check(
    "  German summary and bullet pass the German safety check; headings are German",
    plain(germanAgain.resume.summary).startsWith("Full Stack Developer mit 1,5+ Jahren") &&
      bulletsOf(germanAgain.resume).includes("Entwarf MongoDB-Schemas und optimierte Abfragen für Anwendungsdaten.") &&
      germanAgain.resume.design.sectionHeadings.experience === "Berufserfahrung",
    { summary: plain(germanAgain.resume.summary), rejected: germanAgain.rejectedRewrites }
  );
  await check("  ...but a name after 'bei' that the resume doesn't have is still dropped", /new name: Google/.test(checkGermanRewrite("Designed MongoDB schemas", "Entwarf MongoDB-Schemas bei Google", resumeToText(RESUME))));

  // Unsafe headline and summary: dropped with reasons, the rules' versions are used instead
  answer = () => ({ headline: "Senior Backend Engineer", summary: "Full Stack Developer with 5+ years of experience in Node.js and MongoDB.", bullets: [] });
  const unsafe = await run(BACKEND);
  await check(
    "a headline the person hasn't held, and years that don't match, are dropped",
    unsafe.rejectedRewrites.some((r) => r.section === "headline" && /not a title you've held/.test(r.problem)) &&
      unsafe.rejectedRewrites.some((r) => r.section === "summary" && /years don't match the resume: 5\+ \(the resume says 1\.5\+\)/.test(r.problem)),
    unsafe.rejectedRewrites
  );
  await check("  the rules' summary is used instead", plain(unsafe.resume.summary).startsWith("Full Stack Developer with 1.5+ years of experience in Node.js") && unsafe.resume.personalInfo.headline === "Full Stack Developer", plain(unsafe.resume.summary));
});

test("tailoring options: skills, projects, bullets, template, language, one page", async (t) => {
  const check = checker(t);
  const analysis = analyzeJobWithRules(FRONTEND);
  const withProjects = {
    ...RESUME,
    projects: [
      { name: "Notes", description: "A notes app in Python.", link: "" },
      { name: "Shopfront", description: "An e-commerce site built with React, TypeScript, Redux, Tailwind CSS and Jest.", link: "" },
    ],
  };
  const run = (options, resume = withProjects) => tailorResume(resume, analysis, { jobDescription: FRONTEND, ...options });

  let result = await run({ featuredSkills: ["TypeScript", "React", "Kubernetes"] });
  await check("featured skills lead Skills in the chosen order (one the resume doesn't show is ignored)", result.resume.skills[0] === "TypeScript" && result.resume.skills[1] === "React.js" && !result.resume.skills.includes("Kubernetes"), result.resume.skills);
  await check("  ...and the summary leads with them", plain(result.resume.summary).includes("in TypeScript and React."), plain(result.resume.summary));

  result = await run({ excludedProjects: ["Notes"] });
  await check("an excluded project is left out of the copy", result.resume.projects.map((p) => p.name).join() === "Shopfront" && withProjects.projects.length === 2, result.resume.projects);
  await check("Projects go before Experience when a project matches better", result.resume.design.sectionOrder.indexOf("projects") < result.resume.design.sectionOrder.indexOf("experience"), result.resume.design.sectionOrder);
  const noProjectsFirst = await run({}, RESUME);
  await check("  ...not otherwise", !noProjectsFirst.changes.some((c) => c.op.key === "sectionOrder"));

  result = await run({ maxBulletsPerJob: 2 });
  const northwind = result.resume.experience[0];
  await check(
    "max bullets per job: only bullets beyond the limit that show nothing the job asks for are hidden",
    // The two React / REST bullets stay; the four that show nothing a frontend job asks for are hidden
    northwind.bullets.length === 2 && northwind.hiddenBullets.length === 4 && northwind.hiddenBullets.every((b) => !/React|REST/.test(b)) && northwind.bullets.every((b) => /React|REST/.test(plain(b))),
    { bullets: northwind.bullets.map(plain), hidden: northwind.hiddenBullets }
  );
  const restored = buildContent(result.original, result.changes.map((c) => ({ ...c, status: c.op.kind === "hideBullets" ? "rejected" : "accepted" })));
  await check("  rejecting the change restores them", restored.experience[0].bullets.length === 6 && restored.experience[0].hiddenBullets.length === 0, restored.experience[0]);

  result = await run({ template: "modern-line-teal", fitOnePage: false });
  await check("the chosen template, and Fit to one page off", result.resume.template === "modern-line-teal" && !result.resume.design.fitOnePage, { template: result.resume.template, design: result.resume.design });
  result = await run({});
  await check("Fit to one page on by default", result.resume.design.fitOnePage === true);

  result = await run({ language: "de" });
  await check("German: German section headings", result.resume.design.sectionHeadings.experience === "Berufserfahrung" && result.resume.design.sectionHeadings.skills === "Kenntnisse", result.resume.design.sectionHeadings);
  await check("  without AI the summary stays as written (no English lead added)", plain(result.resume.summary) === plain(RESUME.summary), plain(result.resume.summary));

  // How this version differs
  const rules = await run({}, RESUME);
  await check(
    "differences: counted by type, with the share of words changed",
    rules.differences.byType.find((e) => e.type === "bulletsReworded")?.count === 2 && rules.differences.byType.some((e) => e.type === "summary") && rules.differences.changedShare > 0,
    rules.differences
  );
  await check("  reordering alone isn't a change of words", changedShare("Built APIs. Led the team.", "Led the team. Built APIs.") === 0);
  const same = describeDifferences([], RESUME, RESUME, { aiUsed: false, strength: "balanced" });
  await check("  nearly identical without AI, and why", same.nearlyIdentical && same.reasons[0] === "AI is off, so only reordering and small wording fixes were possible.", same);
  const sparse = describeDifferences([], RESUME, RESUME, { aiUsed: true, strength: "balanced", rejected: 2, skillsShown: 1, jobSkills: 10 });
  await check(
    "  with AI: dropped rewrites and few matching skills are the reasons",
    sparse.reasons.some((reason) => reason.startsWith("2 AI rewrites were dropped")) && sparse.reasons.some((reason) => reason.includes("only 1 of the job's 10 skills")),
    sparse.reasons
  );
});
