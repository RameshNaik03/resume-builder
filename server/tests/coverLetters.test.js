// Cover letters: CRUD with ownership checks, and POST /api/cover-letters/generate. The key
// guarantees: no skill or number that isn't in the resume or the user's confirmed notes;
// placeholders for missing facts (the recipient, "Why this company?"); German letters use the
// formal greeting when no name is given; an AI letter that invents something (or uses a cliché)
// is dropped. Also: the guided answers, the three opening options and the strength check.
import { test } from "node:test";
import { findKnownSkills } from "../services/ats/keywords.js";
import { findBannedPhrase } from "../services/coverLetters/bannedPhrases.js";
import letterStrength from "../services/coverLetters/strength.js";
import { checker, register, startApi } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";

const JD = `Senior Backend Engineer
Northbeam is hiring a Senior Backend Engineer to join our payments platform team in London.

What you'll do:
- Design and build reliable payment APIs in Go and Node.js
- Own event-driven services on Kafka from design review to on-call

Requirements:
- 5+ years of backend engineering experience
- Strong experience with Node.js, PostgreSQL and Kafka
- Experience with Docker and Kubernetes in production

Nice to have:
- Experience with Terraform or AWS
- Familiarity with GraphQL`;

const RESUME = {
  title: "My CV",
  template: "classic-navy",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com" },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [
    { role: "Backend Engineer", company: "Harbour Health", startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js serving 2 million requests a day", "Cut Postgres query times by 60% with partitioning"] },
    { role: "Software Engineer", company: "Tessellate", startDate: "Jul 2015", endDate: "Dec 2017", bullets: ["Moved 14 services to Kafka consumers"] },
  ],
  skills: ["Node.js", "Redis"],
  projects: [{ name: "Queuebench", description: "Load-testing tool for message queues with Docker.", link: "" }],
};
const NOTE = "Ran our services on Kubernetes in production";

const ACHIEVEMENT = "When our nightly billing job kept timing out, I rewrote it as a Kafka stream and it now finishes in 4 minutes";

const plain = (html) => html.replace(/<br\s*\/?>/g, "\n").replace(/<\/p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
const numbersIn = (text) => text.replace(/\[[^\]]*\]/g, " ").match(/\d+(?:[.,]\d+)*/g) ?? [];

test("banned phrases: whole words, English and German, with German endings", async (t) => {
  const check = checker(t);
  for (const [text, expected] of [
    ["I am a team player.", "team player"],
    ["I'm passionate about APIs.", "passionate"],
    ["Hard working and reliable.", "hard-working"],
    ["I am writing to apply for the role.", "I am writing to apply"],
    ["Ich bin teamfähig und belastbar.", "teamfähig"],
    ["Hiermit bewerbe ich mich als Entwickler.", "Hiermit bewerbe ich mich"],
    ["Als hochmotivierter Entwickler...", "hochmotiviert"],
    ["in einem dynamischen Umfeld", "dynamisch"],
    ["I built a dynamic pricing engine.", "dynamic"],
    ["I migrated Microsoft Dynamics data.", null],
    ["Mit großer Sorgfalt habe ich APIs gebaut.", null],
    ["I cut query times by 60%.", null],
  ]) {
    await check(`${JSON.stringify(text)} -> ${expected}`, findBannedPhrase(text) === expected, findBannedPhrase(text));
  }
});

test("letter strength check", async (t) => {
  const check = checker(t);
  const analysis = { title: "Senior Backend Engineer", company: "Northbeam", mustHave: ["Node.js", "PostgreSQL", "Kafka"] };
  const html = (paragraphs) => paragraphs.map((p) => `<p>${p}</p>`).join("");
  const filler = "I moved our reporting jobs onto a queue and kept them fast as traffic grew over the years.";
  const good = {
    language: "en",
    length: "short",
    companyName: "Northbeam",
    whyCompany: "I use Northbeam to pay my suppliers",
    subject: "Application for Senior Backend Engineer",
    body: html([
      "Dear Ms. Schmidt,",
      "Your Senior Backend Engineer role puts Node.js at its centre: at Harbour Health, I built an API in Node.js serving 2 million requests a day.",
      `In my role as Backend Engineer at Harbour Health, I cut PostgreSQL query times by 60%. ${filler} ${filler}`,
      `At Tessellate, I moved 14 services to Kafka consumers written in Node.js. ${filler}`,
      "I use Northbeam to pay my suppliers, and I'd like to help build it.",
      "I can start from March. I'd welcome the chance to talk.",
      "Kind regards,<br>Meera Iyer",
    ]),
  };
  const result = letterStrength(good, analysis);
  await check("a specific letter passes every check", result.passed === 6 && result.total === 6 && result.checks.every((c) => c.tip === ""), result);
  await check("  ids: opening, evidence, motivation, cliches, length, placeholders", result.checks.map((c) => c.id).join() === "opening,evidence,motivation,cliches,length,placeholders");

  const failing = (letter) => letterStrength(letter, analysis).checks.filter((c) => !c.passed).map((c) => c.id);
  await check(
    "a cliché opener fails the opening (and the cliché check)",
    failing({ ...good, body: good.body.replace(/<p>Your Senior[^<]*<\/p>/, "<p>I am writing to apply for the Senior Backend Engineer role at Northbeam.</p>") }).join() === "opening,cliches"
  );
  await check(
    "an opening without a skill or result isn't specific",
    failing({ ...good, body: good.body.replace(/<p>Your Senior[^<]*<\/p>/, "<p>I would like to join Northbeam as a Senior Backend Engineer and grow with the team.</p>") }).includes("opening")
  );
  const noPostgres = letterStrength({ ...good, body: good.body.replace("PostgreSQL", "database") }, analysis).checks.find((c) => c.id === "evidence");
  await check("a top must-have with no evidence fails, naming it", !noPostgres.passed && noPostgres.tip.includes("PostgreSQL"), noPostgres);
  await check(
    "the motivation placeholder fails 'Why this company'",
    failing({ ...good, whyCompany: "", body: good.body.replace(/<p>I use Northbeam[^<]*<\/p>/, "<p>[Why this company? Add one or two sentences in your own words.]</p>") }).join() === "motivation,placeholders"
  );
  const cliche = letterStrength({ ...good, body: good.body.replace("I'd welcome", "I'm a team player and I'd welcome") }, analysis).checks.find((c) => c.id === "cliches");
  await check("a cliché anywhere fails, with the phrase in the tip", !cliche.passed && cliche.tip.includes('"team player"'), cliche);
  const long = letterStrength({ ...good, length: "short", body: good.body.replace(filler, `${filler} `.repeat(12)) }, analysis).checks.find((c) => c.id === "length");
  await check("too long for its length setting", !long.passed && /long for a "short" letter/.test(long.tip), long);
  const short = letterStrength({ ...good, length: "detailed" }, analysis).checks.find((c) => c.id === "length");
  await check("too short for its length setting", !short.passed && /short for a "detailed" letter/.test(short.tip), short);
  const left = letterStrength({ ...good, subject: "Application for [Job title]", body: good.body.replace("Ms. Schmidt", "[Hiring Manager]") }, analysis).checks.find((c) => c.id === "placeholders");
  await check("unfilled placeholders are listed (subject too)", !left.passed && left.tip.includes("[Hiring Manager]") && left.tip.includes("[Job title]"), left);
});

test("cover letters", async (t) => {
  const base = await startApi(t, "cover_letters");
  const check = checker(t);
  const call = async (method, url, token, body) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const token = await register(base, "letters@example.com");
  const other = await register(base, "other@example.com");

  // A tailored resume and its job, with Kubernetes confirmed (Skills only)
  const resume = (await call("POST", "/resumes", token, RESUME)).body;
  const tailored = (await call("POST", "/jobs/tailor", token, { resumeId: resume._id, job: { description: JD } })).body;
  const jobId = tailored.jobId;
  await call("POST", "/jobs/confirm-skill", token, { jobId, skill: "Kubernetes", note: NOTE, placement: "skills" });
  const tailoredResume = (await call("GET", `/resumes/${tailored.resume._id}`, token)).body;
  // What a letter may draw facts from
  const sourceText = `${JSON.stringify(tailoredResume)}\n${NOTE}\nKubernetes\nSenior Backend Engineer\nNorthbeam\n${ACHIEVEMENT}\n1 March 2027`;
  const allowedSkills = new Set(findKnownSkills(sourceText));
  const allowedNumbers = new Set(numbersIn(sourceText));
  const honest = (text) => ({
    skills: findKnownSkills(text.replace(/\[[^\]]*\]/g, " ")).filter((skill) => !allowedSkills.has(skill)),
    numbers: numbersIn(text).filter((n) => !allowedNumbers.has(n)),
  });

  // ---------- Generate (rules) ----------
  let r = await call("POST", "/cover-letters/generate", null, { jobId });
  await check("generate without a token -> 401", r.status === 401, r.status);
  r = await call("POST", "/cover-letters/generate", other, { jobId });
  await check("generate for someone else's job -> 404", r.status === 404, r.status);
  r = await call("POST", "/cover-letters/generate", other, { jobId: "000000000000000000000000", resumeId: resume._id });
  await check("  ...or a missing job -> 404", r.status === 404, r.status);
  r = await call("POST", "/cover-letters/generate", token, { jobId, tone: "sarcastic" });
  await check("an unknown tone -> 400", r.status === 400, r.body.message);

  r = await call("POST", "/cover-letters/generate", token, { jobId });
  const letter = r.body;
  const text = plain(letter.coverLetter?.body ?? "");
  await check("generate -> 201, saved, linked to the tailored resume and job", r.status === 201 && letter.coverLetter.resumeId === tailored.resume._id && letter.coverLetter.jobId === jobId && letter.generatedWith === "rules", r.body);
  await check("  titled with the role and company", letter.coverLetter.title === "Cover letter – Senior Backend Engineer – Northbeam", letter.coverLetter.title);
  await check(
    "  the opening links the top need to the strongest evidence",
    /^Dear \[Hiring Manager\],\nYour Senior Backend Engineer role puts Node\.js at its centre, and that's where my strongest work lies: at Harbour Health, I built the appointments API in Node\.js serving 2 million requests a day\.\n/.test(text),
    text
  );
  const options = letter.coverLetter.openingOptions;
  await check(
    "  three different openings to choose from, the first in the letter, none a cliché",
    options.length === 3 && new Set(options).size === 3 && text.includes(options[0]) && options.every((o) => o.includes("Senior Backend Engineer") && !findBannedPhrase(o) && honest(o).numbers.length === 0),
    options
  );
  await check("  [Hiring Manager] when no name is given", text.startsWith("Dear [Hiring Manager],") && letter.placeholders.includes("[Hiring Manager]"), text);
  await check(
    "  a placeholder instead of an invented reason for the company",
    letter.placeholders.some((p) => p.startsWith("[Why this company?")) && text.includes("[Why this company?"),
    letter.placeholders
  );
  await check(
    "  real evidence for the next must-haves in natural sentences (not quoted lines)",
    text.includes("In my role as Software Engineer at Tessellate, I moved 14 services to Kafka consumers.") && text.includes("As Backend Engineer at Harbour Health, I cut PostgreSQL query times by 60% with partitioning."),
    text
  );
  await check("  the opening's example isn't repeated in the body", text.split("appointments API").length === 2, text);
  await check("  no quotes or pasted resume lines", !/["“”]|: [A-Z][a-z]+ed\b/.test(text), text);
  const issues = honest(text);
  await check("  no skill or number that isn't in the resume or confirmed notes", issues.skills.length === 0 && issues.numbers.length === 0, issues);
  await check("  never mentions skills the user hasn't confirmed", !/Terraform|GraphQL|\bAWS\b/.test(text), text);
  await check("  no banned phrases", findBannedPhrase(text) === null, findBannedPhrase(text));
  await check("  a short closing and sign-off with the name", /Kind regards,\nMeera Iyer/.test(text), text);
  const strength = letter.coverLetter.strength;
  const strengthCheck = (id) => strength?.checks.find((c) => c.id === id);
  await check(
    "  with its strength check: specific opening and evidence pass; motivation and placeholders fail with tips",
    strength?.total === 6 && ["opening", "evidence", "cliches"].every((id) => strengthCheck(id).passed) && ["motivation", "placeholders"].every((id) => !strengthCheck(id).passed && strengthCheck(id).tip),
    strength
  );

  // A confirmed skill's note is real evidence too (when it's among the top must-haves used)
  r = await call("POST", "/cover-letters/generate", token, { jobId, length: "detailed" });
  const detailed = plain(r.body.coverLetter.body);
  const detailedWords = r.body.words;
  await check("detailed: uses the confirmed note in the user's words", detailed.includes(`I also ${NOTE[0].toLowerCase()}${NOTE.slice(1)}.`), detailed);
  const detailedIssues = honest(detailed);
  await check("  still nothing invented", detailedIssues.skills.length === 0 && detailedIssues.numbers.length === 0, detailedIssues);

  r = await call("POST", "/cover-letters/generate", token, { jobId, length: "short" });
  const short = r.body;
  // (a detailed letter is only longer when there is more real evidence to use)
  await check("short < standard, and short < detailed", short.words < letter.words && short.words < detailedWords, { short: short.words, standard: letter.words, detailed: detailedWords });

  // The user's answers are used as given
  r = await call("POST", "/cover-letters/generate", token, {
    jobId,
    recipientName: "Anna Schmidt",
    whyCompany: "Your marketplace payments work is the kind of infrastructure problem I enjoy",
    tone: "warm",
  });
  const personal = plain(r.body.coverLetter.body);
  await check(
    "with a name and a reason: no placeholders for them",
    personal.startsWith("Dear Anna Schmidt,") && personal.includes("Your marketplace payments work") && !r.body.placeholders.some((p) => /Hiring Manager|Why this company/.test(p)),
    r.body.placeholders
  );
  await check("tones change the closing", personal.includes("I'd be glad to meet the team and talk about how I could help Northbeam") && text.includes("I'd welcome the chance"), personal);
  await check("  a reason given: 'Why this company' passes", r.body.coverLetter.strength.checks.find((c) => c.id === "motivation").passed, r.body.coverLetter.strength);

  // ---------- Guided answers ----------
  r = await call("POST", "/cover-letters/generate", token, {
    jobId,
    tone: "confident",
    achievement: ACHIEVEMENT,
    companyInterest: "your open-source ledger library",
    availability: "1 March 2027",
    salary: "75k",
  });
  const guided = plain(r.body.coverLetter.body);
  await check(
    "the achievement story in the user's own words, linked to the must-have it mentions",
    guided.includes("One result I'm particularly proud of involved Kafka: when our nightly billing job kept timing out, I rewrote it as a Kafka stream and it now finishes in 4 minutes."),
    guided
  );
  await check("the company interest becomes the motivation (no placeholder)", guided.includes("What interests me most at Northbeam is your open-source ledger library.") && !guided.includes("[Why this company?"), guided);
  await check("availability in the close, with the invitation", guided.includes("I can start from 1 March 2027. I'm ready to take on the Senior Backend Engineer role"), guided);
  await check(
    "the answers are saved for regenerating; no salary in an English letter",
    r.body.coverLetter.achievement === ACHIEVEMENT && r.body.coverLetter.availability === "1 March 2027" && r.body.coverLetter.salary === "" && !guided.includes("75k"),
    r.body.coverLetter
  );
  const guidedIssues = honest(guided);
  await check("  still nothing invented", guidedIssues.skills.length === 0 && guidedIssues.numbers.length === 0, guidedIssues);
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de", achievement: "Ich habe unsere Abrechnung auf Kafka umgestellt", availability: "1. April 2027", salary: "75.000 Euro brutto im Jahr" });
  const germanGuided = plain(r.body.coverLetter.body);
  await check(
    "German: the achievement, start date and salary expectation in the close",
    germanGuided.includes("Ein Ergebnis, auf das ich besonders stolz bin, betrifft Kafka: Ich habe unsere Abrechnung auf Kafka umgestellt.") &&
      germanGuided.includes("Ein Eintritt ist ab 1. April 2027 möglich. Meine Gehaltsvorstellung liegt bei 75.000 Euro brutto im Jahr.") &&
      r.body.coverLetter.salary === "75.000 Euro brutto im Jahr",
    germanGuided
  );
  r = await call("POST", "/cover-letters/generate", token, { jobId, achievement: "x".repeat(601) });
  await check("an achievement over 600 characters -> 400", r.status === 400 && /achievement/.test(r.body.message), r.body.message);

  // ---------- Choosing an opening ----------
  const openId = letter.coverLetter._id;
  r = await call("POST", `/cover-letters/${openId}/opening`, token, { index: 2 });
  const reopened = plain(r.body.body ?? "");
  await check(
    "choosing another opening replaces only the paragraph after the greeting",
    r.status === 200 && reopened.split("\n")[1] === options[2] && reopened.replace(options[2], "") === text.replace(options[0], "") && r.body.bodyEdited === false,
    reopened
  );
  await check("  and comes back with its strength check", r.body.strength?.total === 6, r.body.strength);
  r = await call("POST", `/cover-letters/${openId}/opening`, token, { index: 3 });
  await check("  an opening that doesn't exist -> 400", r.status === 400, r.body.message);
  r = await call("POST", `/cover-letters/${openId}/opening`, other, { index: 0 });
  await check("  someone else's letter -> 404", r.status === 404, r.status);
  r = await call("POST", `/cover-letters/${openId}/opening`, token, { index: 0 });
  await check("  back to the first: the original letter", plain(r.body.body) === text, plain(r.body.body));

  // ---------- German ----------
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de" });
  const german = plain(r.body.coverLetter.body);
  await check("German without a name: 'Sehr geehrte Damen und Herren,'", r.status === 201 && german.startsWith("Sehr geehrte Damen und Herren,") && r.body.coverLetter.language === "de", german);
  await check("  continues in lower case and closes formally", /\nfür die Stelle als Senior Backend Engineer bei Northbeam ist Node\.js entscheidend/.test(german) && /Mit freundlichen Grüßen\nMeera Iyer/.test(german), german);
  await check("  no German clichés", findBannedPhrase(german) === null, findBannedPhrase(german));
  await check("  German placeholders for the missing facts", r.body.placeholders.some((p) => p.startsWith("[Warum dieses Unternehmen?")), r.body.placeholders);
  const germanIssues = honest(german);
  await check("  nothing invented", germanIssues.skills.length === 0 && germanIssues.numbers.length === 0, germanIssues);
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de", recipientName: "Anna Schmidt" });
  await check("German with a name: a formal greeting with the full name", plain(r.body.coverLetter.body).startsWith("Guten Tag Anna Schmidt,"), plain(r.body.coverLetter.body));

  // ---------- Salutations ----------
  const greetingFor = async (body) => {
    const response = await call("POST", "/cover-letters/generate", token, { jobId, recipientName: "Anna Schmidt", ...body });
    return plain(response.body.coverLetter.body).split("\n")[0];
  };
  await check("German, Frau: 'Sehr geehrte Frau Schmidt,'", (await greetingFor({ language: "de", recipientSalutation: "Frau" })) === "Sehr geehrte Frau Schmidt,");
  await check("German, Herr: 'Sehr geehrter Herr Schmidt,'", (await greetingFor({ language: "de", recipientSalutation: "Herr" })) === "Sehr geehrter Herr Schmidt,");
  await check("German, none: 'Guten Tag Anna Schmidt,'", (await greetingFor({ language: "de", recipientSalutation: "" })) === "Guten Tag Anna Schmidt,");
  await check("English, Frau: 'Dear Ms. Schmidt,'", (await greetingFor({ recipientSalutation: "Frau" })) === "Dear Ms. Schmidt,");
  await check("English, Herr: 'Dear Mr. Schmidt,'", (await greetingFor({ recipientSalutation: "Herr" })) === "Dear Mr. Schmidt,");
  await check("English, none: 'Dear Anna Schmidt,'", (await greetingFor({})) === "Dear Anna Schmidt,");
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de", recipientSalutation: "Frau" });
  await check(
    "a salutation without a name: the no-name greeting, and no salutation saved",
    plain(r.body.coverLetter.body).startsWith("Sehr geehrte Damen und Herren,") && r.body.coverLetter.recipientSalutation === "",
    r.body.coverLetter.recipientSalutation
  );
  r = await call("POST", "/cover-letters/generate", token, { jobId, recipientName: "Anna Schmidt", recipientSalutation: "Dr." });
  await check("an unknown salutation -> 400", r.status === 400, r.body.message);
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de", recipientName: "Anna Schmidt", recipientSalutation: "Frau" });
  await check(
    "the subject line and saved fields follow the language",
    r.body.coverLetter.subject === "Bewerbung als Senior Backend Engineer" && r.body.coverLetter.recipientSalutation === "Frau" && r.body.coverLetter.bodyEdited === false,
    r.body.coverLetter
  );

  // ---------- Regenerate ----------
  const regenId = r.body.coverLetter._id;
  r = await call("PUT", `/cover-letters/${regenId}`, token, { body: "<p>My own words</p>" });
  await check("editing the body by hand marks it edited", r.body.bodyEdited === true, r.body.bodyEdited);
  r = await call("PUT", `/cover-letters/${regenId}`, token, { title: "Renamed" });
  await check("  other edits don't change that", r.body.bodyEdited === true);
  r = await call("POST", `/cover-letters/${regenId}/regenerate`, token, { language: "en", tone: "confident", length: "short", whyCompany: "Your payments work is close to what I do" });
  await check(
    "regenerate: a new body for the options, no longer marked edited",
    r.status === 200 && r.body.coverLetter.bodyEdited === false && r.body.coverLetter.subject === "Application for Senior Backend Engineer" && plain(r.body.coverLetter.body).includes("Your payments work is close to what I do") && !r.body.coverLetter.body.includes("My own words"),
    r.body
  );
  r = await call("POST", `/cover-letters/${regenId}/regenerate`, other, {});
  await check("  someone else's letter -> 404", r.status === 404, r.status);
  r = await call("GET", "/jobs", token);
  await check("saved jobs link to their latest cover letter", r.body[0].coverLetterId === regenId, r.body[0]);

  // ---------- CRUD and ownership ----------
  const id = letter.coverLetter._id;
  r = await call("GET", "/cover-letters", token);
  await check("list: the user's letters, without bodies", r.status === 200 && r.body.length >= 6 && r.body.every((l) => l.body === undefined), r.body.length);
  r = await call("GET", "/cover-letters", other);
  await check("  another user sees none of them", r.status === 200 && r.body.length === 0, r.body.length);
  r = await call("GET", `/cover-letters/${id}`, other);
  await check("another user can't read a letter -> 404", r.status === 404, r.status);
  r = await call("PUT", `/cover-letters/${id}`, other, { title: "Mine now" });
  await check("  ...or change it -> 404", r.status === 404, r.status);
  r = await call("DELETE", `/cover-letters/${id}`, other);
  await check("  ...or delete it -> 404", r.status === 404, r.status);

  r = await call("PUT", `/cover-letters/${id}`, token, { title: "Northbeam letter", body: '<p>Hello<script>alert(1)</script></p><p onclick="x()">Thanks</p>' });
  await check("update: title saved, body sanitized", r.status === 200 && r.body.title === "Northbeam letter" && !/script|onclick/.test(r.body.body) && r.body.body.includes("Hello"), r.body.body);
  r = await call("PUT", `/cover-letters/${id}`, token, { language: "fr" });
  await check("an unsupported language -> 400", r.status === 400, r.body.message);

  const otherResume = (await call("POST", "/resumes", other, { title: "Other CV" })).body;
  r = await call("POST", "/cover-letters", token, { resumeId: otherResume._id, body: "<p>Hi</p>" });
  await check("create on someone else's resume -> 404", r.status === 404, r.status);
  r = await call("PUT", `/cover-letters/${id}`, token, { resumeId: otherResume._id });
  await check("move a letter to someone else's resume -> 404", r.status === 404, r.status);
  r = await call("POST", "/cover-letters", token, { resumeId: resume._id, title: "By hand", body: "<p>Written myself</p>", tone: "confident" });
  await check("create by hand -> 201", r.status === 201 && r.body.title === "By hand" && r.body.jobId === null, r.body);
  r = await call("DELETE", `/cover-letters/${r.body._id}`, token);
  await check("delete -> 200", r.status === 200, r.body);

  // ---------- With AI (a local stand-in for the Claude API) ----------
  // A second account with the same resume and job (generating is rate limited per user)
  const aiToken = await register(base, "ai@example.com");
  const aiResume = (await call("POST", "/resumes", aiToken, RESUME)).body;
  const aiJobId = (await call("POST", "/jobs/tailor", aiToken, { resumeId: aiResume._id, job: { description: JD } })).body.jobId;
  await call("POST", "/jobs/confirm-skill", aiToken, { jobId: aiJobId, skill: "Kubernetes", note: NOTE, placement: "skills" });

  let reply;
  const fake = await startFakeClaude(() => reply);
  t.after(() => fake.close());

  const honestParts = {
    openings: [
      "The Senior Backend Engineer role at Northbeam fits the systems I build: the appointments API at Harbour Health serves 2 million requests a day.",
      "Node.js is the core of the Senior Backend Engineer role, and it's the core of my work at Harbour Health.",
      "Kafka sits at the heart of the Senior Backend Engineer role, and I moved 14 services to Kafka consumers at Tessellate.",
    ],
    body: [
      "At Harbour Health I built the appointments API in Node.js serving 2 million requests a day, and I cut Postgres query times by 60%.",
      "At Tessellate I moved 14 services to Kafka consumers, and I've run services on Kubernetes in production.",
    ],
    motivation: "[Why this company? Add one or two sentences in your own words.]",
    close: "I would welcome a conversation about the role.",
  };
  reply = honestParts;
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId });
  const aiText = plain(r.body.coverLetter.body);
  await check(
    "an honest AI letter is used, in letter order with the template's greeting and sign-off",
    r.status === 201 &&
      r.body.generatedWith === "ai" &&
      aiText.startsWith(`Dear [Hiring Manager],\n${honestParts.openings[0]}\n${honestParts.body[0]}`) &&
      /would welcome a conversation about the role\.\nKind regards,\nMeera Iyer/.test(aiText),
    r.body
  );
  await check("  its three openings are offered", r.body.coverLetter.openingOptions.join("|") === honestParts.openings.join("|"), r.body.coverLetter.openingOptions);
  await check("  the request asks for three openings and names the clichés", /three different openings/.test(JSON.stringify(fake.requests.at(-1)?.system)) && /teamfähig|team player/.test(JSON.stringify(fake.requests.at(-1)?.system)));

  reply = { ...honestParts, openings: [honestParts.openings[0], "I am writing to apply for the Senior Backend Engineer role at Northbeam.", "At Google I led the payments team."] };
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId });
  await check(
    "an AI opening with a cliché or an invented fact is replaced by a template opening; the rest of the AI letter stays",
    r.body.generatedWith === "ai" && r.body.coverLetter.openingOptions.length === 3 && r.body.coverLetter.openingOptions[0] === honestParts.openings[0] && !r.body.coverLetter.openingOptions.some((o) => /writing to apply|Google/.test(o)),
    r.body.coverLetter.openingOptions
  );

  for (const [label, line] of [
    ["a new number", "I led a team of 12 engineers at Harbour Health."],
    ["a skill that isn't in the resume or notes", "I also automated our infrastructure with Terraform."],
    ["an invented employer", "Before that I worked at Stripe on payments."],
    ["a cliché", "I thrive in a dynamic environment."],
    ["another cliché", "I am a passionate team player."],
  ]) {
    reply = { ...honestParts, body: [honestParts.body[0], line] };
    r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId });
    await check(`an AI letter with ${label} is dropped for the template`, r.status === 201 && r.body.generatedWith === "rules" && r.body.aiRejected && !plain(r.body.coverLetter.body).includes(line), r.body.aiRejected);
  }

  const germanParts = {
    openings: ["die Stelle als Senior Backend Engineer bei Northbeam passt zu meiner Erfahrung mit Node.js."],
    body: ["Bei Harbour Health habe ich mit Node.js gearbeitet.", "Bei Tessellate habe ich mit Kafka gearbeitet."],
    motivation: "[Warum dieses Unternehmen? Ergänzen Sie ein bis zwei Sätze in eigenen Worten.]",
    close: "Über die Einladung zu einem persönlichen Gespräch freue ich mich.",
  };
  reply = germanParts;
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId, language: "de" });
  await check("an honest German AI letter is used (with fewer than three openings, the template's fill in)", r.body.generatedWith === "ai" && r.body.coverLetter.openingOptions.length === 3, r.body);
  reply = { ...germanParts, body: ["Bei Google habe ich als Teamleiter gearbeitet.", germanParts.body[1]] };
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId, language: "de" });
  await check("a German AI letter with an invented employer and title is dropped", r.body.generatedWith === "rules" && /new name/.test(r.body.aiRejected ?? ""), r.body.aiRejected);
  reply = { ...germanParts, body: ["Ich bin teamfähig und arbeite gern mit Node.js.", germanParts.body[1]] };
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId, language: "de" });
  await check("a German AI letter with 'teamfähig' is dropped", r.body.generatedWith === "rules" && /teamfähig/.test(r.body.aiRejected ?? ""), r.body.aiRejected);
});
