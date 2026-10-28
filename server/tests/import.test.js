// POST /api/resumes/import: reading PDF/DOCX files into new resumes, file checks, the
// rule-based fallback when the AI fails, and the rate limit.
import { test } from "node:test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { checker, DOCX, PDF, readFixture, register, startApi } from "./helpers/api.js";
import { startFakeClaude } from "./helpers/fakeClaude.js";

const SERVER_DIR = fileURLToPath(new URL("..", import.meta.url));

test("resume import", async (t) => {
  const base = await startApi(t, "import");
  const check = checker(t);

  // files: [{ name, type, field?, fixture? (file to send, default: name), bytes? }]
  const upload = async (token, files = []) => {
    const form = new FormData();
    for (const file of files) form.append(file.field ?? "file", new Blob([file.bytes ?? readFixture(file.fixture ?? file.name)], { type: file.type }), file.name);
    const res = await fetch(`${base}/resumes/import`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    return { status: res.status, body: await res.json() };
  };

  const a = await register(base, "a@example.com");
  const b = await register(base, "b@example.com");
  const c = await register(base, "c@example.com");

  let r = await upload(null, [{ name: "Priya_Sharma-Resume.pdf", type: PDF }]);
  await check("no token -> 401", r.status === 401, r.status);

  r = await upload(a, []);
  await check("no file -> 400", r.status === 400, `${r.status} ${r.body.message}`);

  r = await upload(a, [{ name: "Priya_Sharma-Resume.pdf", type: PDF }]);
  const pdfResume = r.body.resume;
  await check("PDF -> 201 parsed with rules", r.status === 201 && r.body.parsedWith === "rules", `${r.status} ${r.body.parsedWith}`);
  await check("  no import warnings", Array.isArray(r.body.warnings) && r.body.warnings.length === 0, r.body.warnings);
  await check("  title from file name", pdfResume?.title === "Priya Sharma Resume", pdfResume?.title);
  await check("  template is null (user picks one next)", pdfResume?.template === null, pdfResume?.template);
  await check("  certifications kept as additional section", pdfResume?.additional?.[0]?.heading === "Certifications", pdfResume?.additional);
  await check("  personal info", pdfResume?.personalInfo.fullName === "Priya Sharma" && pdfResume.personalInfo.email === "priya.sharma@example.com");
  await check("  2 jobs with bullets", pdfResume?.experience.length === 2 && pdfResume.experience[0].bullets.length === 2);
  await check("  education + skills + projects", pdfResume?.education.length === 1 && pdfResume.skills.length >= 5 && pdfResume.projects.length === 2);

  r = await fetch(`${base}/resumes`, { headers: { Authorization: `Bearer ${a}` } }).then((res) => res.json());
  await check("imported resume appears in the user's list", r.some((resume) => resume._id === pdfResume?._id));
  r = await fetch(`${base}/resumes/${pdfResume?._id}`, { headers: { Authorization: `Bearer ${b}` } });
  await check("other user can't see it -> 404", r.status === 404);

  r = await upload(a, [{ name: "Rahul Verma CV.docx", type: DOCX }]);
  await check("DOCX -> 201", r.status === 201 && r.body.resume.title === "Rahul Verma CV" && r.body.resume.experience.length === 2, `${r.status} ${r.body.resume?.title}`);

  r = await upload(a, [{ name: "scanned.pdf", type: PDF }]);
  await check("scanned (image-only) PDF -> 422", r.status === 422, `${r.status} ${r.body.message}`);

  r = await upload(a, [{ name: "fake.pdf", type: PDF }]);
  await check("renamed text file as .pdf -> 415", r.status === 415, `${r.status} ${r.body.message}`);

  r = await upload(a, [{ name: "notes.txt", type: "text/plain" }]);
  await check(".txt -> 415", r.status === 415, `${r.status} ${r.body.message}`);

  // A 6 MB file, made in memory (over the 5 MB limit)
  r = await upload(a, [{ name: "big.pdf", type: PDF, bytes: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(6 * 1024 * 1024)]) }]);
  await check("6 MB file -> 413", r.status === 413, `${r.status} ${r.body.message}`);

  r = await upload(a, [{ name: "Priya_Sharma-Resume.pdf", type: PDF, field: "resume" }]);
  await check("wrong field name -> 400", r.status === 400, `${r.status} ${r.body.message}`);

  r = await upload(c, [{ name: "Résumé Ñandú.pdf", fixture: "Priya_Sharma-Resume.pdf", type: PDF }]);
  await check("non-English file name kept", r.body.resume?.title === "Résumé Ñandú", r.body.resume?.title);

  // The AI path failing (a fake Claude API that rejects the key) must fall back to the rules
  const claude = await startFakeClaude(() => ({ status: 401, error: "authentication_error" }));
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  r = await upload(c, [{ name: "Priya_Sharma-Resume.pdf", type: PDF }]);
  console.error = originalError;
  claude.close();
  await check("AI rejects the key -> still 201 via rules", r.status === 201 && r.body.parsedWith === "rules", `${r.status} ${r.body.parsedWith}`);
  await check("  logged the AI error", errors.some((error) => error.includes("AI resume import")), errors[0]);

  // Rate limit: 10 imports per user per hour
  const statuses = [];
  for (let i = 0; i < 11; i++) statuses.push((await upload(b, [{ name: "Rahul Verma CV.docx", type: DOCX }])).status);
  await check("user B: 10 imports OK, 11th -> 429", statuses.slice(0, 10).every((status) => status === 201) && statuses[10] === 429, statuses.join(","));
  r = await upload(c, [{ name: "Rahul Verma CV.docx", type: DOCX }]);
  await check("user C not affected by B's limit", r.status === 201, r.status);

  r = await upload(c, [{ name: "Arjun_Mehta_2page.pdf", type: PDF }]);
  const long = r.body.resume;
  await check(
    "3-page PDF: all 6 jobs, all bullets, 3 extra sections",
    r.status === 201 && long.experience.length === 6 && long.experience.every((job) => job.bullets.length >= 5) && long.additional.length === 3,
    `${r.status} jobs=${long?.experience.length} additional=${long?.additional?.map((section) => section.heading)}`
  );
  await check("  last line of page 3 kept", JSON.stringify(long).includes("END-OF-RESUME-MARKER"));
  r = await fetch(`${base}/resumes/${long._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${c}` },
    body: JSON.stringify({ template: "sidebar-plum", additional: [{ heading: "Awards", items: ["Best Engineer"] }] }),
  }).then((res) => res.json());
  await check("PUT saves template + additional", r.template === "sidebar-plum" && r.additional[0].items[0] === "Best Engineer");
  await check("nothing written to disk (no uploads folder)", !fs.existsSync(`${SERVER_DIR}uploads`));
});
