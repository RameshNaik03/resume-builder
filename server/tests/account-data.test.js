// Account data: the ZIP export (everything the user has, and nothing of anyone else's) and
// account deletion (nothing left behind in the database or on Cloudinary). Cloudinary's
// upload/destroy are local stand-ins, and downloads of its photo URLs are answered locally.
import { test } from "node:test";
import mongoose from "mongoose";
import JSZip from "jszip";
import { v2 as cloudinary } from "cloudinary";
import Resume from "../models/Resume.js";
import User from "../models/User.js";
import { PDF, checker, readFixture, register, startApi } from "./helpers/api.js";
import { JPG, caller, captureEmails, fakeCloudinary, login, useFakeCloudinaryKeys } from "./helpers/account.js";

const JD = `Senior Backend Engineer
Northbeam is hiring a Senior Backend Engineer to join our payments platform team in London.

Requirements:
- 5+ years of backend engineering experience
- Strong experience with Node.js, PostgreSQL and Kafka
- Experience with Docker and Kubernetes in production`;

const resumeFor = (name, email) => ({
  title: `${name}'s CV`,
  personalInfo: { fullName: name, headline: "Backend Engineer", email },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [{ role: "Backend Engineer", company: `${name} Corp`, startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js", "Cut Postgres query times by 60%"] }],
  skills: ["Node.js", "Kafka"],
});

test("account data: export and deletion", async (t) => {
  const base = await startApi(t, "account_data");
  const check = checker(t);
  const call = caller(base);
  const emails = captureEmails(t);
  const { calls } = fakeCloudinary(cloudinary);
  useFakeCloudinaryKeys();

  // Photo downloads (export) are answered here; every other request goes out as normal
  const realFetch = globalThis.fetch;
  let failDownloads = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://res.cloudinary.com/")) {
      return failDownloads ? new Response("gone", { status: 500 }) : new Response(Buffer.from(`PHOTO ${url}`), { headers: { "Content-Type": "image/jpeg" } });
    }
    return realFetch(url, options);
  };
  t.after(() => {
    globalThis.fetch = realFetch;
  });

  const multipart = async (method, url, token, field, bytes, name, type) => {
    const form = new FormData();
    form.append(field, new Blob([bytes], { type }), name);
    const res = await realFetch(base + url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
    return { status: res.status, body: await res.json() };
  };

  // Two users with the same kinds of data: an imported resume (with its original), a resume
  // with a photo, a tailored copy (job + ATS results), a cover letter, and an avatar
  async function seed(email, name, fixtureName) {
    const token = await register(base, email, name);
    const id = (await call("GET", "/auth/me", token)).body.user._id;
    const imported = await multipart("POST", "/resumes/import", token, "file", readFixture(fixtureName), fixtureName, PDF);
    if (imported.status !== 201) throw new Error(`Import failed: ${imported.body.message}`);
    const resume = (await call("POST", "/resumes", token, resumeFor(name, email))).body;
    const photo = await multipart("POST", `/resumes/${resume._id}/photo`, token, "photo", JPG, "me.jpg", "image/jpeg");
    if (photo.status !== 200) throw new Error(`Photo failed: ${photo.body.message}`);
    const tailored = await call("POST", "/jobs/tailor", token, { resumeId: resume._id, job: { description: JD } });
    if (tailored.status !== 201) throw new Error(`Tailoring failed: ${tailored.body.message}`);
    const letter = await call("POST", "/cover-letters/generate", token, { jobId: tailored.body.jobId });
    if (letter.status !== 201) throw new Error(`Cover letter failed: ${letter.body.message}`);
    const avatar = await multipart("PATCH", "/account/profile", token, "avatar", JPG, "me.jpg", "image/jpeg");
    if (avatar.status !== 200) throw new Error(`Avatar failed: ${avatar.body.message}`);
    return { token, id, email, name, fixtureName, importedId: imported.body.resume._id, resumeId: resume._id, tailoredId: tailored.body.resume._id, jobId: tailored.body.jobId, letterId: letter.body.coverLetter._id };
  }
  const a = await seed("a@example.com", "Annika Example", "clean.pdf");
  const b = await seed("b@example.com", "Bertram Other", "weak.pdf");

  // Every document in the database that belongs to a user, by collection
  const owned = async (userId) => {
    const result = {};
    for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
      const id = new mongoose.Types.ObjectId(userId);
      result[name] = await mongoose.connection.db.collection(name).countDocuments({ $or: [{ userId: id }, { _id: id }] });
    }
    return result;
  };

  // ---------- Export ----------
  let r = await call("GET", "/account/export");
  await check("export without a token -> 401", r.status === 401);

  r = await call("GET", "/account/export", a.token);
  await check("export -> 200 ZIP download", r.status === 200 && r.headers.get("content-type") === "application/zip" && /attachment; filename="resume-builder-export-\d{4}-\d{2}-\d{2}\.zip"/.test(r.headers.get("content-disposition")), r.status);
  await check("  never cached", r.headers.get("cache-control") === "private, no-store");
  const zip = await JSZip.loadAsync(r.body);
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const read = async (name) => JSON.parse(await zip.file(name).async("string"));
  const expected = ["profile.json", "resumes.json", "jobs.json", "cover-letters.json", "ats-results.json", "export-info.json", `originals/${a.importedId}/clean.pdf`, `photos/${a.resumeId}.jpg`, "avatar.jpg"];
  await check("  has the JSON files, the original, the photo and the avatar", expected.every((name) => names.includes(name)), names);

  const profile = await read("profile.json");
  const resumes = await read("resumes.json");
  const jobs = await read("jobs.json");
  const letters = await read("cover-letters.json");
  const ats = await read("ats-results.json");
  await check("  profile is the user's, without private fields", profile.email === a.email && ["passwordHash", "tokenVersion", "avatarPublicId", "emailChangeTokenHash"].every((field) => !(field in profile)), Object.keys(profile));
  await check("  all of the user's resumes, without storage ids", resumes.length === 3 && [a.importedId, a.resumeId, a.tailoredId].every((id) => resumes.some((resume) => resume._id === id)) && resumes.every((resume) => !("photoPublicId" in resume)), resumes.map((resume) => resume._id));
  await check("  the job and the cover letter", jobs.length === 1 && jobs[0]._id === a.jobId && letters.length === 1 && letters[0]._id === a.letterId);
  await check("  ATS results of the tailored resume", ats.some((entry) => entry.resumeId === a.tailoredId && typeof entry.atsScore?.score === "number" && entry.atsOptimization?.changes), ats.map((entry) => entry.resumeId));
  const original = await zip.file(`originals/${a.importedId}/clean.pdf`).async("nodebuffer");
  await check("  the original is byte-for-byte the uploaded file", original.equals(readFixture("clean.pdf")));
  const photo = await zip.file(`photos/${a.resumeId}.jpg`).async("string");
  await check("  the photo was downloaded from its Cloudinary URL", photo.startsWith("PHOTO https://res.cloudinary.com/") && photo.includes(a.resumeId));
  await check("  everything with an owner belongs to the user", [...resumes, ...jobs, ...letters].every((doc) => doc.userId === a.id));

  // Nothing of B's anywhere in the file (ids, email, name, original file, photos)
  let leaked = [];
  for (const name of names) {
    const text = await zip.file(name).async("string");
    for (const needle of [b.id, b.email, b.name, b.importedId, b.resumeId, b.tailoredId, b.jobId, b.letterId]) if (text.includes(needle)) leaked.push(`${needle} in ${name}`);
  }
  await check("  contains nothing of the other user's", leaked.length === 0 && !names.some((name) => name.includes("weak.pdf")), leaked);

  failDownloads = true;
  r = await call("GET", "/account/export", a.token);
  const info = JSON.parse(await (await JSZip.loadAsync(r.body)).file("export-info.json").async("string"));
  await check("photo download failing -> still exported, listed as missing", r.status === 200 && info.missingFiles.length === 2, info.missingFiles);
  failDownloads = false;

  r = await call("GET", "/account/export", b.token);
  const bResumes = JSON.parse(await (await JSZip.loadAsync(r.body)).file("resumes.json").async("string"));
  await check("the other user's export has only their own resumes", bResumes.length === 3 && bResumes.every((resume) => resume.userId === b.id));

  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await call("GET", "/account/export", a.token)).status);
  await check("exports are rate limited (5 per hour, then 429)", statuses.join() === "200,200,200,429", statuses);

  // ---------- Deletion ----------
  const before = { a: await owned(a.id), b: await owned(b.id) };
  await check("both users start with data in every collection", ["users", "resumes", "originalfiles", "jobs", "coverletters"].every((name) => before.a[name] > 0 && before.b[name] > 0), before);
  const aPhotoIds = [...(await Resume.find({ userId: a.id }, { photoPublicId: 1 }).lean()).map((resume) => resume.photoPublicId), (await User.findById(a.id).lean()).avatarPublicId].filter(Boolean);
  const bPhotoIds = [...(await Resume.find({ userId: b.id }, { photoPublicId: 1 }).lean()).map((resume) => resume.photoPublicId), (await User.findById(b.id).lean()).avatarPublicId].filter(Boolean);
  await check("A has a resume photo and an avatar on Cloudinary", aPhotoIds.includes(`resume-builder/photos/${a.resumeId}`) && aPhotoIds.includes(`resume-builder/avatars/${a.id}`), aPhotoIds);

  r = await call("DELETE", "/account", undefined, { currentPassword: "secret123", confirm: "DELETE" });
  await check("delete without a token -> 401", r.status === 401);
  for (const [label, body] of [
    ["without typing DELETE", { currentPassword: "secret123" }],
    ['typing "delete"', { currentPassword: "secret123", confirm: "delete" }],
    ["without the current password", { confirm: "DELETE" }],
    ["with a wrong password", { currentPassword: "wrong-password", confirm: "DELETE" }],
  ]) {
    r = await call("DELETE", "/account", a.token, body);
    await check(`delete ${label} -> 400`, r.status === 400, r.body.message);
  }
  await check("  nothing was deleted", JSON.stringify(await owned(a.id)) === JSON.stringify(before.a) && !calls.some((c) => c[0] === "destroy"));

  const emailsBefore = emails.length;
  r = await call("DELETE", "/account", a.token, { currentPassword: "secret123", confirm: "DELETE" });
  await check("delete -> 200", r.status === 200, r.body);
  const left = await owned(a.id);
  await check("  nothing of A's left in any collection", Object.values(left).every((count) => count === 0), left);
  const destroyed = new Set(calls.filter((c) => c[0] === "destroy").map((c) => c[1]));
  await check("  every photo and the avatar deleted from Cloudinary", aPhotoIds.every((id) => destroyed.has(id)), { aPhotoIds, destroyed: [...destroyed] });
  await check("  a confirmation email was sent", emails.slice(emailsBefore).some((m) => m.to === a.email && /deleted/i.test(m.subject)), emails.slice(emailsBefore));
  await check("  the old token stops working", (await call("GET", "/auth/me", a.token)).status === 401);
  await check("  can't log in any more", !(await login(base, a.email)));

  await check("the other user's data is untouched", JSON.stringify(await owned(b.id)) === JSON.stringify(before.b), await owned(b.id));
  await check("  and none of their photos were deleted", bPhotoIds.every((id) => !destroyed.has(id)), bPhotoIds);
  r = await call("GET", "/resumes", b.token);
  await check("  they still see all their resumes", r.status === 200 && r.body.length === 3);
  r = await call("GET", `/resumes/${b.importedId}/original`, b.token);
  await check("  and their uploaded original", r.status === 200 && r.body.equals(readFixture("weak.pdf")));
});
