// Individual ATS scoring checks, run on resume text (no server needed):
//   - "No overused words": technology names aren't flagged; suggestions fit the flagged word
//   - "Name and contact details at the top": what passes, and what costs partial points
import { test } from "node:test";
import savedResumeLayout from "../services/ats/savedResumeLayout.js";
import scoreResume from "../services/ats/scoreResume.js";
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
