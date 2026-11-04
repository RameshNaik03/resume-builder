// Cover letters: CRUD with ownership checks, and POST /api/cover-letters/generate. The key
// guarantees: no skill or number that isn't in the resume or the user's confirmed notes;
// placeholders for missing facts (the recipient, "Why this company?"); German letters use the
// formal greeting when no name is given; an AI letter that invents something is dropped.
import { test } from "node:test";
import { findKnownSkills } from "../services/ats/keywords.js";
import { GENERIC_PHRASES } from "../services/coverLetters/generateLetter.js";
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

const plain = (html) => html.replace(/<br\s*\/?>/g, "\n").replace(/<\/p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
const numbersIn = (text) => text.replace(/\[[^\]]*\]/g, " ").match(/\d+(?:[.,]\d+)*/g) ?? [];

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
  const sourceText = `${JSON.stringify(tailoredResume)}\n${NOTE}\nKubernetes\nSenior Backend Engineer\nNorthbeam`;
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
  await check("  the opening names the role", /The Senior Backend Engineer role at Northbeam/.test(text), text);
  await check("  [Hiring Manager] when no name is given", text.startsWith("Dear [Hiring Manager],") && letter.placeholders.includes("[Hiring Manager]"), text);
  await check(
    "  a placeholder instead of an invented reason for the company",
    letter.placeholders.some((p) => p.startsWith("[Why this company?")) && text.includes("[Why this company?"),
    letter.placeholders
  );
  await check(
    "  real evidence from the resume for the top must-haves",
    text.includes("At Harbour Health, as Backend Engineer, I built the appointments API in Node.js") && text.includes("At Tessellate, as Software Engineer, I moved 14 services to Kafka consumers"),
    text
  );
  const issues = honest(text);
  await check("  no skill or number that isn't in the resume or confirmed notes", issues.skills.length === 0 && issues.numbers.length === 0, issues);
  await check("  never mentions skills the user hasn't confirmed", !/Terraform|GraphQL|\bAWS\b/.test(text), text);
  await check("  no generic phrases", !GENERIC_PHRASES.some((pattern) => pattern.test(text)), text);
  await check("  a short closing and sign-off with the name", /Kind regards,\nMeera Iyer/.test(text), text);

  // A confirmed skill's note is real evidence too (when it's among the top must-haves used)
  r = await call("POST", "/cover-letters/generate", token, { jobId, length: "detailed" });
  const detailed = plain(r.body.coverLetter.body);
  const detailedWords = r.body.words;
  await check("detailed: uses the confirmed note in the user's words", detailed.includes(`I've also worked with Kubernetes: ${NOTE}.`), detailed);
  const detailedIssues = honest(detailed);
  await check("  still nothing invented", detailedIssues.skills.length === 0 && detailedIssues.numbers.length === 0, detailedIssues);

  r = await call("POST", "/cover-letters/generate", token, { jobId, length: "short" });
  const short = r.body;
  await check("short < standard < detailed", short.words < letter.words && letter.words < detailedWords, { short: short.words, standard: letter.words, detailed: detailedWords });

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
  await check("tones change the closing", personal.includes("I'd be glad to talk about how I could help Northbeam") && text.includes("I would welcome the chance"), personal);

  // ---------- German ----------
  r = await call("POST", "/cover-letters/generate", token, { jobId, language: "de" });
  const german = plain(r.body.coverLetter.body);
  await check("German without a name: 'Sehr geehrte Damen und Herren,'", r.status === 201 && german.startsWith("Sehr geehrte Damen und Herren,") && r.body.coverLetter.language === "de", german);
  await check("  continues in lower case and closes formally", /\ndie ausgeschriebene Stelle als Senior Backend Engineer bei Northbeam/.test(german) && /Mit freundlichen Grüßen\nMeera Iyer/.test(german), german);
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

  reply = {
    paragraphs: [
      "Dear [Hiring Manager],",
      "The Senior Backend Engineer role at Northbeam fits the systems I build. [Why this company? Add one or two sentences in your own words.]",
      "At Harbour Health I built the appointments API in Node.js serving 2 million requests a day, and I cut Postgres query times by 60%.",
      "At Tessellate I moved 14 services to Kafka consumers, and I've run services on Kubernetes in production.",
      "I would welcome a conversation about the role.",
      "Kind regards,\nMeera Iyer",
    ],
  };
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId });
  await check("an honest AI letter is used", r.status === 201 && r.body.generatedWith === "ai" && plain(r.body.coverLetter.body).includes("fits the systems I build"), r.body);

  for (const [label, line] of [
    ["a new number", "I led a team of 12 engineers at Harbour Health."],
    ["a skill that isn't in the resume or notes", "I also automated our infrastructure with Terraform."],
    ["an invented employer", "Before that I worked at Stripe on payments."],
    ["a generic phrase", "I am a passionate team player."],
  ]) {
    reply = { paragraphs: ["Dear [Hiring Manager],", "The Senior Backend Engineer role at Northbeam fits the systems I build.", line, "Kind regards,\nMeera Iyer"] };
    r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId });
    await check(`an AI letter with ${label} is dropped for the template`, r.status === 201 && r.body.generatedWith === "rules" && r.body.aiRejected && !plain(r.body.coverLetter.body).includes(line), r.body.aiRejected);
  }

  reply = {
    paragraphs: [
      "Sehr geehrte Damen und Herren,",
      "die Stelle als Senior Backend Engineer bei Northbeam passt zu meiner Erfahrung.",
      "Bei Google habe ich als Teamleiter gearbeitet.",
      "Mit freundlichen Grüßen\nMeera Iyer",
    ],
  };
  r = await call("POST", "/cover-letters/generate", aiToken, { jobId: aiJobId, language: "de" });
  await check("a German AI letter with an invented employer and title is dropped", r.body.generatedWith === "rules" && /new name/.test(r.body.aiRejected ?? ""), r.body.aiRejected);
});
