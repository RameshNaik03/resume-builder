// The uploaded original of an imported resume: stored unchanged with the resume (private to its
// owner), shown and downloaded through GET /api/resumes/:id/original, a DOCX preview, the ATS
// check on the original, never carried into copies, and deleted with its resume.
import { test } from "node:test";
import { checker, DOCX, PDF, readFixture, register, startApi } from "./helpers/api.js";
import OriginalFile from "../models/OriginalFile.js";

test("uploaded originals", async (t) => {
  const base = await startApi(t, "originals");
  const check = checker(t);
  const auth = (token) => (token ? { Authorization: `Bearer ${token}` } : {});
  const upload = async (token, name, type) => {
    const form = new FormData();
    form.append("file", new Blob([readFixture(name)], { type }), name);
    const res = await fetch(`${base}/resumes/import`, { method: "POST", headers: auth(token), body: form });
    return { status: res.status, body: await res.json() };
  };
  const json = (method, path, token, body) =>
    fetch(`${base}${path}`, { method, headers: { ...auth(token), ...(body && { "Content-Type": "application/json" }) }, body: body && JSON.stringify(body) }).then(async (res) => ({
      status: res.status,
      body: await res.json(),
    }));
  const stored = (resumeId) => OriginalFile.countDocuments({ resumeId });

  const a = await register(base, "a@example.com");
  const b = await register(base, "b@example.com");

  // ---------- Import keeps the file; nothing switches to a template ----------
  let r = await upload(a, "Priya_Sharma-Resume.pdf", PDF);
  const pdf = r.body.resume;
  await check("PDF import -> 201", r.status === 201, r.status);
  await check("  no template chosen: the user sees the original first", pdf?.template === null, pdf?.template);
  await check("  the original's details are on the resume", pdf?.original?.fileName === "Priya_Sharma-Resume.pdf" && pdf.original.kind === "pdf" && pdf.original.size === readFixture("Priya_Sharma-Resume.pdf").length, pdf?.original);
  await check("  its design was read", pdf?.original?.design?.source === "pdf" && Array.isArray(pdf.original.design.sections) && pdf.original.design.sections.length > 0, pdf?.original?.design);
  await check("  the file is stored once", (await stored(pdf._id)) === 1);

  r = await json("GET", "/resumes", a);
  await check("the resume list shows it has an original", r.body.find((resume) => resume._id === pdf._id)?.original?.kind === "pdf");

  // ---------- Viewing and downloading: the same bytes, owner only ----------
  let res = await fetch(`${base}/resumes/${pdf._id}/original`, { headers: auth(a) });
  const bytes = Buffer.from(await res.arrayBuffer());
  await check("GET original -> the file unchanged", res.status === 200 && bytes.equals(readFixture("Priya_Sharma-Resume.pdf")), `${res.status} ${bytes.length}`);
  await check("  as a PDF, shown in the page", res.headers.get("content-type") === PDF && res.headers.get("content-disposition").startsWith("inline;"), `${res.headers.get("content-type")} ${res.headers.get("content-disposition")}`);
  await check("  private: not cached", /private/.test(res.headers.get("cache-control")) && /no-store/.test(res.headers.get("cache-control")));
  res = await fetch(`${base}/resumes/${pdf._id}/original?download=1`, { headers: auth(a) });
  await check("?download=1 -> saved with its own file name", res.status === 200 && res.headers.get("content-disposition").startsWith("attachment;") && res.headers.get("content-disposition").includes("Priya_Sharma-Resume.pdf"), res.headers.get("content-disposition"));
  res = await fetch(`${base}/resumes/${pdf._id}/original`, { headers: auth(b) });
  await check("another user can't view it -> 404", res.status === 404, res.status);
  res = await fetch(`${base}/resumes/${pdf._id}/original?download=1`, { headers: auth(b) });
  await check("another user can't download it -> 404", res.status === 404, res.status);
  res = await fetch(`${base}/resumes/${pdf._id}/original`);
  await check("no token -> 401", res.status === 401, res.status);
  res = await fetch(`${base}/resumes/not-an-id/original`, { headers: auth(a) });
  await check("a malformed id -> 404", res.status === 404, res.status);

  // ---------- DOCX: stored too, and shown as HTML ----------
  r = await upload(a, "Rahul Verma CV.docx", DOCX);
  const docx = r.body.resume;
  await check("DOCX import keeps the file", r.status === 201 && docx?.original?.kind === "docx" && docx.template === null && (await stored(docx._id)) === 1);
  res = await fetch(`${base}/resumes/${docx._id}/original?download=1`, { headers: auth(a) });
  await check("  downloads unchanged", res.status === 200 && Buffer.from(await res.arrayBuffer()).equals(readFixture("Rahul Verma CV.docx")) && res.headers.get("content-type") === DOCX);
  r = await json("GET", `/resumes/${docx._id}/original/preview`, a);
  await check("  preview -> sanitized HTML of the file", r.status === 200 && /Rahul Verma/.test(r.body.html) && !/<script|style=|on\w+=/i.test(r.body.html), r.body.html?.slice(0, 120));
  r = await json("GET", `/resumes/${docx._id}/original/preview`, b);
  await check("  another user's preview -> 404", r.status === 404, r.status);
  r = await json("GET", `/resumes/${pdf._id}/original/preview`, a);
  await check("  a PDF has no HTML preview -> 400", r.status === 400, r.status);

  // ---------- Resumes without an original ----------
  const blank = (await json("POST", "/resumes", a, { title: "Blank" })).body;
  res = await fetch(`${base}/resumes/${blank._id}/original`, { headers: auth(a) });
  await check("a resume made in the editor has no original -> 404", res.status === 404, res.status);
  r = await json("PUT", `/resumes/${pdf._id}`, a, { original: { fileName: "x.pdf", kind: "pdf" }, template: "classic-navy" });
  await check("an update can't change the original's details", r.status === 200 && r.body.original.fileName === "Priya_Sharma-Resume.pdf" && r.body.template === "classic-navy", r.body.original);

  // ---------- Copies never carry the original ----------
  r = await json("POST", `/resumes/${pdf._id}/duplicate`, a);
  const copy = r.body;
  await check("a duplicate has no original of its own", r.status === 201 && copy.original === undefined && (await stored(copy._id)) === 0, copy.original);
  res = await fetch(`${base}/resumes/${copy._id}/original`, { headers: auth(a) });
  await check("  so viewing it -> 404", res.status === 404, res.status);

  // ---------- The ATS check on the original file ----------
  let form = new FormData();
  form.append("originalOf", pdf._id);
  r = await fetch(`${base}/ats/analyze`, { method: "POST", headers: auth(a), body: form }).then(async (response) => ({ status: response.status, body: await response.json() }));
  await check("ATS check on the original -> scored like the file", r.status === 200 && r.body.source.type === "original" && r.body.file.name === "Priya_Sharma-Resume.pdf" && r.body.file.type === "pdf" && r.body.score > 0, `${r.status} ${JSON.stringify(r.body.source)}`);
  const withBadge = (await json("GET", `/resumes/${pdf._id}`, a)).body;
  await check("  its score becomes the resume's ATS badge", withBadge.atsScore?.score === r.body.score, withBadge.atsScore);
  form = new FormData();
  form.append("originalOf", pdf._id);
  r = await fetch(`${base}/ats/analyze`, { method: "POST", headers: auth(b), body: form }).then((response) => ({ status: response.status }));
  await check("  another user's original -> 404", r.status === 404, r.status);
  form = new FormData();
  form.append("originalOf", pdf._id);
  r = await fetch(`${base}/ats/analyze`, { method: "POST", body: form }).then((response) => ({ status: response.status }));
  await check("  logged out -> 401", r.status === 401, r.status);

  // ---------- Deleted with the resume ----------
  r = await json("DELETE", `/resumes/${pdf._id}`, b);
  await check("another user can't delete it", r.status === 404 && (await stored(pdf._id)) === 1);
  r = await json("DELETE", `/resumes/${pdf._id}`, a);
  await check("deleting the resume deletes its original", r.status === 200 && (await stored(pdf._id)) === 0);
  res = await fetch(`${base}/resumes/${pdf._id}/original`, { headers: auth(a) });
  await check("  and it can't be fetched any more -> 404", res.status === 404, res.status);
  r = await json("POST", "/resumes/delete-many", a, { resumeIds: [docx._id] });
  await check("bulk delete deletes originals too", r.status === 200 && (await stored(docx._id)) === 0);
  await check("no originals left for user A", (await OriginalFile.countDocuments({})) === 0);
});
