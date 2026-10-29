// Rich text (summary, bullets, project descriptions): sanitizing, plain-text conversion,
// and what the ATS checker reads from it.
import { test } from "node:test";
import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import resumeToText from "../services/ats/resumeToText.js";
import { htmlToText, sanitizeRichText } from "../utils/richText.js";
import { checker, register, startApi } from "./helpers/api.js";

test("sanitizeRichText and htmlToText", async (t) => {
  const check = checker(t);
  const block = (value) => sanitizeRichText(value);
  const inline = (value) => sanitizeRichText(value, { inline: true });
  const cases = [
    ["plain text -> paragraph", block("Built APIs"), "<p>Built APIs</p>"],
    ["plain special chars escaped", block("R&D < 5ms > target"), "<p>R&amp;D &lt; 5ms &gt; target</p>"],
    ["plain blank line -> 2 paragraphs, newline -> br", block("One\nline two\n\nPara 2"), "<p>One<br />line two</p><p>Para 2</p>"],
    ["inline plain text stays plain (escaped)", inline("Cut costs by 30% & time < 2h"), "Cut costs by 30% &amp; time &lt; 2h"],
    ["editor HTML kept", block("<p><strong>Led</strong> a <em>team</em> of <u>5</u></p>"), "<p><strong>Led</strong> a <em>team</em> of <u>5</u></p>"],
    ["b/i converted to strong/em", inline("<b>a</b> <i>b</i>"), "<strong>a</strong> <em>b</em>"],
    ["inline drops <p> wrapper", inline("<p>Shipped <strong>v2</strong></p>"), "Shipped <strong>v2</strong>"],
    ["inline: two paragraphs joined with a space", inline("<p>a</p><p>b</p>"), "a b"],
    ["script removed", block("<p>Hi<script>alert(1)</script></p>"), "<p>Hi</p>"],
    ["onerror attribute removed", block('<p><img src=x onerror="alert(1)">Hi</p>'), "<p>Hi</p>"],
    ["style/class removed", block('<p style="color:red" class="x"><strong style="x">Hi</strong></p>'), "<p><strong>Hi</strong></p>"],
    ["javascript: link loses its href", block('<p><a href="javascript:alert(1)">x</a></p>'), '<p><a rel="noopener noreferrer" target="_blank">x</a></p>'],
    ["https link kept, rel/target added", inline('<a href="https://github.com/me">repo</a>'), '<a href="https://github.com/me" rel="noopener noreferrer" target="_blank">repo</a>'],
    ["mailto link kept", inline('<a href="mailto:a@b.co">mail</a>'), '<a href="mailto:a@b.co" rel="noopener noreferrer" target="_blank">mail</a>'],
    ["only unsupported tags -> shown as literal text (safe)", block("<h1>Title</h1>"), "<p>&lt;h1&gt;Title&lt;/h1&gt;</p>"],
    ["unsupported tags mixed with editor HTML are dropped, text kept", block("<p><strong>a</strong><h1>Title</h1></p>"), "<p><strong>a</strong></p>Title"],
    ["empty editor -> empty string", block("<p></p>"), ""],
    ["only spaces -> empty string", inline("<p>   </p>"), ""],
    ["entity-only inline HTML not double-escaped", inline("R&amp;D team"), "R&amp;D team"],
    ["idempotent (sanitizing twice changes nothing)", block(block("<p><strong>x</strong> &amp; y</p>")), "<p><strong>x</strong> &amp; y</p>"],
  ];
  for (const [label, got, want] of cases) await check(label, got === want, got);

  const converted = htmlToText("<p><strong>R&amp;D</strong> &lt;5ms</p><p>Line<br>two</p>");
  await check("htmlToText: paragraphs + entities", converted === "R&D <5ms\nLine\ntwo", converted);
  await check("htmlToText: plain text unchanged", htmlToText("a < b & c") === "a < b & c");
});

test("rich text through the API", async (t) => {
  const base = await startApi(t, "richtext");
  const check = checker(t);
  const token = await register(base, "r@example.com");
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  let r = await call("POST", "/resumes", {
    summary: "Plain summary with R&D\n\nSecond paragraph",
    experience: [{ role: "Dev", bullets: ["Plain bullet < 5ms", "<p><strong>Bold</strong> result</p>", "<p></p>", '<a href="javascript:x">bad</a> link'] }],
    projects: [{ name: "P", description: '<p>See <a href="https://x.dev">site</a><script>steal()</script></p>' }],
  });
  const id = r.body._id;
  await check("create: plain summary converted to paragraphs", r.body.summary === "<p>Plain summary with R&amp;D</p><p>Second paragraph</p>", r.body.summary);
  await check(
    "create: bullets sanitized (plain escaped, HTML kept, empty -> '')",
    JSON.stringify(r.body.experience[0].bullets) === JSON.stringify(["Plain bullet &lt; 5ms", "<strong>Bold</strong> result", "", '<a rel="noopener noreferrer" target="_blank">bad</a> link']),
    r.body.experience[0].bullets
  );
  await check("create: project description script removed", r.body.projects[0].description === '<p>See <a href="https://x.dev" rel="noopener noreferrer" target="_blank">site</a></p>', r.body.projects[0].description);

  r = await call("PUT", `/resumes/${id}`, { summary: "<p><em>Updated</em> <img src=x onerror=alert(1)></p>" });
  await check("update: summary sanitized", r.body.summary === "<p><em>Updated</em></p>", r.body.summary);

  // A resume saved before rich text existed (plain text in the database, setters skipped)
  await Resume.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { summary: "Old plain & simple", "experience.0.bullets": ["Old bullet > 3"] } });
  r = await call("GET", `/resumes/${id}`);
  await check("old plain text is returned as-is (the client converts it)", r.body.summary === "Old plain & simple" && r.body.experience[0].bullets[0] === "Old bullet > 3");
  r = await call("PUT", `/resumes/${id}`, { summary: r.body.summary, experience: r.body.experience });
  await check("saving old plain text converts it safely", r.body.summary === "<p>Old plain &amp; simple</p>" && r.body.experience[0].bullets[0] === "Old bullet &gt; 3", `${r.body.summary} | ${r.body.experience[0].bullets[0]}`);

  r = await call("POST", `/resumes/${id}/duplicate`);
  await check("duplicate keeps formatting unchanged", r.body.summary === "<p>Old plain &amp; simple</p>");

  const text = resumeToText((await Resume.findById(id)).toObject());
  await check("ATS text has no HTML tags or entities", !/<|&amp;|&lt;|&gt;/.test(text) && text.includes("Old plain & simple") && text.includes("• Old bullet > 3"), text.slice(0, 160));
});
