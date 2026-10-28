// Individual ATS scoring checks, run on resume text (no server needed):
//   - "No overused words": technology names aren't flagged; suggestions fit the flagged word
//   - "Name and contact details at the top": what passes, and what costs partial points
import { test } from "node:test";
import analyzeKeywords from "../services/ats/keywords.js";
import { matchJobTitle } from "../services/ats/jobTitle.js";
import resumeToText from "../services/ats/resumeToText.js";
import savedResumeLayout from "../services/ats/savedResumeLayout.js";
import scoreResume from "../services/ats/scoreResume.js";
import { isJobSubtitle } from "../services/ats/textRules.js";
import parseWithRules from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";
import { checker, readFixture } from "./helpers/api.js";

// Scores resume text the way /api/ats/analyze does, laid out as a single-column resume
function score(text, jobDescription = "") {
  const parsed = sanitizeResume(parseWithRules(text));
  return scoreResume({ text, inspection: savedResumeLayout({ template: "classic-navy", design: {} }, text), parsed, jobDescription });
}
const checkOf = (result, id) => result.checks.find((c) => c.id === id);

// A small resume; `bullets` and the contact line vary per test
const resume = ({ contact = "priya@example.com | +91 98765 43210 | Pune, India | linkedin.com/in/priya", above = [], bullets }) =>
  [
    ...above,
    "Priya Sharma",
    "Software Engineer",
    contact,
    "SUMMARY",
    "Software engineer with 5 years of experience building web applications for retail and logistics companies.",
    "EXPERIENCE",
    "Software Engineer | Acme | Jan 2021 – Present",
    ...bullets,
    "EDUCATION",
    "B.Tech Computer Science, Pune University, 2020",
    "SKILLS",
    "JavaScript, TypeScript, React, Node.js, MongoDB, Docker",
  ].join("\n");

const NORMAL_BULLETS = [
  "Built a booking platform used by 20,000 customers",
  "Reduced page load time by 40% by caching product data",
  "Mentored 3 junior engineers through weekly code reviews",
];

test("overused words", async (t) => {
  const check = checker(t);

  const nodeHeavy = score(
    resume({
      bullets: [
        "Built a Node.js service that handles 2,000 orders a day",
        "Moved the reporting jobs to Node.js, cutting run time by 30%",
        "Wrote Node.js scripts that sync stock levels every hour",
        "Mentored 3 engineers on Node.js performance profiling",
        "Built a React Native app and a Next.js site on the same Node.js API",
      ],
    })
  );
  const overused = checkOf(nodeHeavy, "overused-words");
  await check("Node.js five times (+ React Native, Next.js) -> not flagged", overused.passed, overused.reason);

  const ledHeavy = score(
    resume({
      bullets: [
        "Led a team of 5 engineers building the checkout flow",
        "Led the migration of 40 services to Kubernetes",
        "Led weekly planning with product and design",
        "Led the hiring of 3 frontend developers",
        "Led incident reviews that cut repeat outages by 25%",
        "Led a cost review that saved $20,000 a year",
      ],
    })
  );
  const led = checkOf(ledHeavy, "overused-words");
  await check('"led" six times -> flagged', !led.passed && led.reason.includes('"led"'), led.reason);
  await check('  with synonyms for "led"', /instead of repeating "led", try "directed", "headed", "guided" or "oversaw"/.test(led.fix), led.fix);
  await check('  not the old fixed list ("ran")', !led.fix.includes('"ran"'), led.fix);

  const checkoutHeavy = score(
    resume({
      bullets: [
        "Built the checkout used by 20,000 customers",
        "Scaled the checkout to 3 regions with no downtime",
        "Added checkout monitoring that cut alerts by 40%",
        "Documented the checkout flow for 4 partner teams",
        "Moved checkout builds to a 10-minute pipeline",
        "Ran checkout reviews with 2 product managers",
      ],
    })
  );
  const checkout = checkOf(checkoutHeavy, "overused-words");
  await check('a word without synonyms ("checkout") -> "try varying this word"', !checkout.passed && checkout.fix.includes('"checkout": try varying this word'), checkout.fix ?? checkout.reason);

  const jobDescription = `${"We need someone who knows Terraform and Kubernetes well. ".repeat(4)}Terraform experience required.`;
  const terraformHeavy = score(
    resume({
      bullets: [
        "Wrote Terraform modules for 12 services",
        "Moved all Terraform state to a shared backend",
        "Reviewed Terraform changes for 3 teams",
        "Cut Terraform plan time by 50%",
        "Trained 6 engineers on Terraform",
      ],
    }),
    jobDescription
  );
  await check("a keyword from the job description isn't flagged", checkOf(terraformHeavy, "overused-words").passed, checkOf(terraformHeavy, "overused-words").reason);
});

test("name and contact details at the top", async (t) => {
  const check = checker(t);

  const complete = checkOf(score(resume({ bullets: NORMAL_BULLETS })), "contact-top");
  await check("name, then email, phone, location and LinkedIn -> passes (3/3)", complete.passed && complete.points === 3, `${complete.points} ${complete.reason}`);

  const noLinkedIn = checkOf(score(resume({ contact: "priya@example.com | +91 98765 43210 | Pune, India", bullets: NORMAL_BULLETS })), "contact-top");
  await check("missing LinkedIn -> partial points (2.5/3)", !noLinkedIn.passed && noLinkedIn.points === 2.5, noLinkedIn.points);
  await check('  message names exactly "LinkedIn"', noLinkedIn.reason === "Your name, email and phone are at the top; missing: LinkedIn.", noLinkedIn.reason);
  await check("  fix says what to add", noLinkedIn.fix === "Add your LinkedIn to the contact line under your name.", noLinkedIn.fix);

  const noLocation = checkOf(score(resume({ contact: "priya@example.com | +91 98765 43210 | linkedin.com/in/priya", bullets: NORMAL_BULLETS })), "contact-top");
  await check('missing location -> partial points, message names exactly "location"', noLocation.points === 2.5 && noLocation.reason.endsWith("missing: location."), noLocation.reason);

  const onlyEmailPhone = checkOf(score(resume({ contact: "priya@example.com | +91 98765 43210", bullets: NORMAL_BULLETS })), "contact-top");
  await check("missing both -> still 2.5/3, both named", onlyEmailPhone.points === 2.5 && onlyEmailPhone.reason.endsWith("missing: location and LinkedIn."), onlyEmailPhone.reason);

  const noPhone = checkOf(score(resume({ contact: "priya@example.com | Pune, India | linkedin.com/in/priya", bullets: NORMAL_BULLETS })), "contact-top");
  await check("missing phone -> loses more (2/3) and says so", noPhone.points === 2 && noPhone.reason === "At the top, couldn't find: phone.", `${noPhone.points} ${noPhone.reason}`);

  // Some PDFs put all job/degree title lines above the name: the contact line is still right below it
  const titlesAbove = checkOf(
    score(
      resume({
        above: ["Software Engineer — Acme Jan 2021 – Present", "Intern — Globex Jun 2020 – Dec 2020", "B.Tech Computer Science — Pune University 2016 – 2020", "Shop App — Mobile store Mar 2020 – May 2020", "Chat App — Realtime chat Jan 2020 – Feb 2020", "Portfolio — Personal site Oct 2019 – Dec 2019"],
        bullets: NORMAL_BULLETS,
      })
    ),
    "contact-top"
  );
  await check("six title lines above the name -> still passes", titlesAbove.passed, titlesAbove.reason);
});

test("job title matching", async (t) => {
  const check = checker(t);
  const level = (title, titles, text = "") => matchJobTitle(title, text, titles);

  let match = level("Sr. Front-End Engineer", ["Senior Frontend Engineer"]);
  await check("exact: Sr./Senior and Front-End/Frontend are the same", match.level === "exact", match);
  match = level("Full Stack Developer", ["Full-Stack Developer"]);
  await check("exact: Full Stack = Full-Stack", match.level === "exact", match);

  match = level("Sr. Front-End Engineer", ["Front End Engineer"]);
  await check("close: same role, different seniority", match.level === "close" && match.reasons.includes("different seniority"), match);
  match = level("Senior Front-End Engineer", ["Senior Frontend Developer"]);
  await check("close: Developer = Engineer", match.level === "close" && match.reasons.some((r) => r.includes("Developer and Engineer")), match);
  match = level("Fullstack Programmer", ["Junior Full Stack Developer"]);
  await check("close: Programmer = Developer, seniority ignored", match.level === "close", match);
  match = level("Frontend Engineer", ["Frontend Engineering Lead"]);
  await check('"Lead" is seniority, not the role', match.level !== "exact", match);

  match = level("Front-End Engineer", ["Full Stack Developer Intern"]);
  await check("related: Full Stack vs Front-End", match.level === "related" && match.matched === "Full Stack Developer Intern", match);

  match = level("Data Scientist", ["Frontend Developer"]);
  await check("none: a different role", match.level === "none", match);

  match = level("Senior Frontend Engineer", [], "Experienced frontend developer building React apps");
  await check("close via the text, when the resume has no matching title", match.level === "close", match);

  // Points and messages in the score
  const jobDescription = `Senior Front-End Engineer\n${"We are looking for an engineer who builds fast, accessible web apps with React and TypeScript for our customers. ".repeat(3)}`;
  // The resume's headline and job title both become `role`
  const scored = (role) => checkOf(score(resume({ bullets: NORMAL_BULLETS }).replaceAll("Software Engineer", role), jobDescription), "job-title");
  let titleCheck = scored("Senior Front-End Engineer");
  await check("exact match = 5 points", titleCheck.points === 5 && titleCheck.reason.startsWith("Exact match"), titleCheck.reason);
  titleCheck = scored("Front-End Developer");
  await check("close match = 4 points, says how it matched", titleCheck.points === 4 && titleCheck.reason === 'Close match: your resume has "Front-End Developer" (Developer and Engineer count as the same role; different seniority).', titleCheck.reason);
  titleCheck = scored("Full Stack Developer");
  await check("related role = 2.5 points, says how it matched", titleCheck.points === 2.5 && titleCheck.reason.startsWith('Related role: your resume has "Full Stack Developer"'), titleCheck.reason);
});

test("keyword matching ignores seniority and job-ad words", async (t) => {
  const check = checker(t);
  const jobDescription = [
    "We're hiring a junior or senior engineer to join the team. The ideal candidate has 3+ years of experience.",
    "As a lead or intern in this role you will work with Kubernetes and Terraform. Junior candidates welcome.",
    "Senior engineers mentor the team. Experience with Kubernetes and Terraform is required. Remote or hybrid, office in Berlin.",
  ].join("\n");
  const { matched, missing } = analyzeKeywords(jobDescription, "");
  const terms = [...matched, ...missing].map((k) => k.term.toLowerCase());
  const generic = ["junior", "senior", "lead", "intern", "team", "role", "candidate", "candidates", "experience", "years", "remote", "hybrid", "office"];
  await check("no seniority or generic job-ad words", !terms.some((term) => term.split(" ").some((word) => generic.includes(word))), terms.join(", "));
  await check("real skills still found", terms.includes("kubernetes") && terms.includes("terraform"), terms.join(", "));
});

test("job subtitles (product or project lines)", async (t) => {
  const check = checker(t);
  for (const line of ["DevAssist Pro, an AI-powered coding agent (React, Node.js)", "Project Atlas (React, GraphQL)", "Acme Pay, a payments app for small shops"]) {
    await check(`subtitle: "${line}"`, isJobSubtitle(line));
  }
  for (const line of [
    "Built a booking platform (React, Node.js) used by 20,000 customers",
    "Responsible for reports, payroll and onboarding",
    "I led the team, hired 3 engineers",
    "Reduced costs by 30%, saving $20,000 a year",
    "Shipped the checkout, the cart and the search page.",
  ]) {
    await check(`not a subtitle: "${line}"`, !isJobSubtitle(line));
  }

  // Import: the line under the job header becomes the subtitle; bullets are unchanged
  const SUBTITLE = "BookIt, a booking platform for clinics (React, Node.js)";
  const text = resume({ bullets: [SUBTITLE, ...NORMAL_BULLETS] });
  const parsed = sanitizeResume(parseWithRules(text));
  await check("import: the line becomes the job's subtitle", parsed.experience[0].subtitle === SUBTITLE, parsed.experience[0]);
  await check("import: and isn't a bullet", parsed.experience[0].bullets.length === 3 && parsed.experience[0].bullets[0] === NORMAL_BULLETS[0], parsed.experience[0].bullets);

  // Scoring: the subtitle doesn't count toward action verbs or quantified results
  const result = score(text);
  const verbs = checkOf(result, "action-verbs");
  const quantified = checkOf(result, "quantified");
  await check("action verbs counted on the 3 real bullets only", verbs.passed && verbs.reason.startsWith("3 of 3 bullets"), verbs.reason);
  await check("quantified results counted on the 3 real bullets only", quantified.passed && quantified.reason.startsWith("3 of 3 bullets"), quantified.reason);

  // A saved resume with a subtitle reads back the same way (what the ATS checker scores)
  const saved = { personalInfo: { fullName: "Priya Sharma", email: "priya@example.com" }, experience: [{ role: "Software Engineer", company: "Acme", startDate: "Jan 2021", endDate: "Present", subtitle: SUBTITLE, bullets: NORMAL_BULLETS }] };
  const reread = sanitizeResume(parseWithRules(resumeToText(saved)));
  await check("saved resume -> ATS text -> parser keeps the subtitle", reread.experience[0].subtitle === SUBTITLE && reread.experience[0].bullets.length === 3, reread.experience[0]);
});

test("the anonymised CV fixtures", async (t) => {
  const check = checker(t);
  for (const file of ["cv-extracted-reading-order.txt", "cv-extracted-raw-order.txt"]) {
    const result = score(readFixture(file, "utf8"));
    const overused = checkOf(result, "overused-words");
    const contact = checkOf(result, "contact-top");
    await check(`${file}: "node" (Node.js) not flagged as overused`, overused.passed, overused.reason);
    await check(`${file}: contact details at the top pass`, contact.passed, contact.reason);
  }
});
