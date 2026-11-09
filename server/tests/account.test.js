// Account settings: profile (with avatar), preferences and the defaults they give new resumes,
// cover letters and tailoring; email change (confirmation token), password change, log out
// everywhere and rate limiting. Cloudinary is replaced by local stand-ins; emails are read
// from the server's development fallback (printed, not sent, without RESEND_API_KEY).
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import { hashToken } from "../utils/security.js";
import { checker, register, startApi } from "./helpers/api.js";
import { JPG, caller, captureEmails, fakeCloudinary, login, tokenFrom, useFakeCloudinaryKeys } from "./helpers/account.js";

const JD = `Senior Backend Engineer
Northbeam is hiring a Senior Backend Engineer to join our payments platform team in London.

Requirements:
- 5+ years of backend engineering experience
- Strong experience with Node.js, PostgreSQL and Kafka
- Experience with Docker and Kubernetes in production`;

const RESUME = {
  title: "My CV",
  personalInfo: { fullName: "Meera Iyer", headline: "Backend Engineer", email: "meera@example.com" },
  summary: "<p>Backend engineer with 8 years of experience building APIs.</p>",
  experience: [{ role: "Backend Engineer", company: "Harbour Health", startDate: "Jan 2018", endDate: "Present", bullets: ["Built the appointments API in Node.js", "Cut Postgres query times by 60%"] }],
  skills: ["Node.js", "Kafka"],
};

test("account settings", async (t) => {
  const base = await startApi(t, "account");
  const call = caller(base);
  const emails = captureEmails(t);
  const { calls, state } = fakeCloudinary(cloudinary);
  const me = async (token) => call("GET", "/auth/me", token);
  const upload = async (token, fields, { name = "me.jpg", type = "image/jpeg", bytes = JPG, field = "avatar" } = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (bytes) form.append(field, new Blob([bytes], { type }), name);
    const res = await fetch(`${base}/account/profile`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: form });
    return { status: res.status, body: await res.json() };
  };

  const a = await register(base, "a@example.com");
  const b = await register(base, "b@example.com");
  const aId = (await me(a)).body.user._id;

  await t.test("profile", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    let r = await call("PATCH", "/account/profile", undefined, { name: "X" });
    await check("no token -> 401", r.status === 401);

    const contact = { phone: "+49 30 1234567", location: "Berlin, Germany", linkedin: "linkedin.com/in/ana", github: "https://github.com/ana", website: "ana.dev" };
    r = await call("PATCH", "/account/profile", a, { name: "  Ana Lopez ", ...contact, email: "hijack@example.com" });
    await check("JSON update -> 200 with name and contact details", r.status === 200 && r.body.user.name === "Ana Lopez" && JSON.stringify(r.body.user.contactDefaults) === JSON.stringify(contact), r.body);
    await check("  email can't be changed here", r.body.user.email === "a@example.com");
    const hidden = ["passwordHash", "tokenVersion", "avatarPublicId", "emailChangeTokenHash", "emailChangeExpires", "resetPasswordTokenHash"];
    await check("  private fields never sent", hidden.every((field) => !(field in r.body.user)), Object.keys(r.body.user).join());
    await check("  saved (GET /auth/me)", (await me(a)).body.user.contactDefaults.website === "ana.dev");

    for (const [label, body] of [
      ["empty name", { name: "   " }],
      ["name over 50 characters", { name: "x".repeat(51) }],
      ["name not text", { name: 42 }],
      ["phone with letters", { phone: "call me maybe" }],
      ["phone too long", { phone: "1".repeat(31) }],
      ["location with HTML", { location: "<script>alert(1)</script>" }],
      ["LinkedIn on another site", { linkedin: "github.com/ana" }],
      ["GitHub on another site", { github: "https://gitlab.com/ana" }],
      ["GitHub look-alike host", { github: "https://github.com.evil.example/ana" }],
      ["website with javascript:", { website: "javascript:alert(1)" }],
      ["website with spaces", { website: "my site.com" }],
      ["website too long", { website: `https://a.dev/${"x".repeat(200)}` }],
    ]) {
      r = await call("PATCH", "/account/profile", a, body);
      await check(`rejects ${label} -> 400`, r.status === 400 && typeof r.body.message === "string", r);
    }
    await check("  rejected changes saved nothing", (await me(a)).body.user.name === "Ana Lopez");

    r = await call("PATCH", "/account/profile", a, { website: "" });
    await check("empty contact field clears it", r.status === 200 && r.body.user.contactDefaults.website === "");
    await call("PATCH", "/account/profile", a, { website: "ana.dev" });

    r = await me(b);
    await check("ownership: B's profile untouched", r.body.user.name === "Test User" && r.body.user.contactDefaults.phone === "");
  });

  await t.test("avatar", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    let r = await upload(a, {});
    await check("no Cloudinary keys -> 503", r.status === 503, r.body.message);
    useFakeCloudinaryKeys();

    r = await upload(a, {}, { name: "me.gif", type: "image/gif" });
    await check("GIF -> 415", r.status === 415, r.body.message);
    r = await upload(a, {}, { name: "fake.jpg", bytes: Buffer.from("not an image at all, just text") });
    await check("text renamed .jpg -> 415", r.status === 415, r.body.message);
    r = await upload(a, {}, { bytes: Buffer.concat([JPG, Buffer.alloc(3 * 1024 * 1024)]) });
    await check("3 MB -> 413 with 2 MB message", r.status === 413 && r.body.message.includes("2 MB"), r.body.message);
    r = await upload(a, {}, { field: "photo" });
    await check("wrong field name -> 400", r.status === 400, r.body.message);
    const before = calls.length;
    r = await upload(a, { phone: "letters only" });
    await check("invalid field with an avatar -> 400, nothing uploaded", r.status === 400 && calls.length === before, r.body.message);

    r = await upload(a, { name: "Ana L." });
    const upCall = calls.at(-1);
    await check("avatar + name (multipart) -> 200", r.status === 200 && r.body.user.name === "Ana L." && r.body.user.avatarUrl.startsWith("https://res.cloudinary.com/"), r.body);
    await check("  stored under one id per user", upCall[0] === "upload" && upCall[1] === `resume-builder/avatars/${aId}`, upCall[1]);
    const crop = upCall[2].transformation?.[0] ?? {};
    await check("  cropped to a square", crop.width === crop.height && crop.crop === "fill", crop);
    const url = r.body.user.avatarUrl;

    state.failUpload = true;
    r = await upload(a, {});
    await check("Cloudinary failure -> 502, old avatar kept", r.status === 502 && (await me(a)).body.user.avatarUrl === url, r.body.message);
    state.failUpload = false;

    r = await call("PATCH", "/account/profile", a, { removeAvatar: true });
    await check("removeAvatar -> cleared and deleted from Cloudinary", r.status === 200 && r.body.user.avatarUrl === "" && calls.some((c) => c[0] === "destroy" && c[1] === `resume-builder/avatars/${aId}`));
  });

  await t.test("contact details pre-fill new resumes", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    let r = await call("POST", "/resumes", a, {});
    const info = r.body.personalInfo;
    await check("empty resume gets the contact details", r.status === 201 && info.phone === "+49 30 1234567" && info.location === "Berlin, Germany" && info.linkedin === "linkedin.com/in/ana" && info.github === "https://github.com/ana" && info.website === "ana.dev", info);
    await check("  and the default template", r.body.template === "classic-navy");
    r = await call("POST", "/resumes", a, { personalInfo: { phone: "+1 555 0100", location: "" } });
    await check("given values win; empty ones are filled", r.body.personalInfo.phone === "+1 555 0100" && r.body.personalInfo.location === "Berlin, Germany", r.body.personalInfo);
    r = await call("POST", "/resumes", b, {});
    await check("B's resume gets none of A's details", r.body.personalInfo.phone === "" && r.body.personalInfo.website === "");
  });

  await t.test("preferences", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    let r = await call("PATCH", "/account/preferences", a, { theme: "dark", language: "de", defaultTemplate: "modern-line-teal", dateFormat: "numeric" });
    await check("update -> 200", r.status === 200 && JSON.stringify(r.body.user.preferences) === JSON.stringify({ theme: "dark", language: "de", defaultTemplate: "modern-line-teal", dateFormat: "numeric" }), r.body);
    for (const [label, body] of [
      ["theme=blue", { theme: "blue" }],
      ["language=fr", { language: "fr" }],
      ["template=../etc", { defaultTemplate: "../etc" }],
      ["template not text", { defaultTemplate: 5 }],
      ["dateFormat=iso", { dateFormat: "iso" }],
      ["nothing to update", {}],
    ]) {
      r = await call("PATCH", "/account/preferences", a, body);
      await check(`rejects ${label} -> 400`, r.status === 400, r.body);
    }
    await check("  rejected changes saved nothing", (await me(a)).body.user.preferences.theme === "dark");
    await check("ownership: B keeps the defaults", JSON.stringify((await me(b)).body.user.preferences) === JSON.stringify({ theme: "system", language: "en", defaultTemplate: "classic-navy", dateFormat: null }));

    r = await call("POST", "/resumes", a, {});
    await check("new resume uses the default template and date format", r.body.template === "modern-line-teal" && r.body.design.dateFormat === "numeric", { template: r.body.template, design: r.body.design });
    r = await call("POST", "/resumes", a, { template: "classic-navy", design: { dateFormat: "year" } });
    await check("  a template or date format given still wins", r.body.template === "classic-navy" && r.body.design.dateFormat === "year");

    const resume = (await call("POST", "/resumes", a, RESUME)).body;
    r = await call("POST", "/cover-letters", a, { resumeId: resume._id });
    await check("new cover letter uses the preferred language", r.status === 201 && r.body.language === "de", r.body.language);
    r = await call("POST", "/cover-letters", a, { resumeId: resume._id, language: "en" });
    await check("  a language given still wins", r.body.language === "en");
    r = await call("POST", "/jobs/tailor", a, { resumeId: resume._id, job: { description: JD } });
    await check("tailoring uses the preferred language", r.status === 201 && r.body.tailoring.language === "de", r.body.tailoring?.language ?? r.body.message);
    const jobId = r.body.jobId;
    r = await call("POST", "/cover-letters/generate", a, { jobId });
    await check("generated cover letter uses the preferred language", r.status === 201 && r.body.coverLetter.language === "de", r.body.coverLetter?.language ?? r.body.message);

    r = await call("PATCH", "/account/preferences", a, { dateFormat: null });
    await check("dateFormat null -> back to each template's own", r.status === 200 && r.body.user.preferences.dateFormat === null);
    r = await call("POST", "/resumes", a, {});
    await check("  new resume has no date format set", r.body.design.dateFormat === undefined, r.body.design);
  });

  await t.test("email change", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    const e = await register(base, "e@example.com", "Eve");
    const eId = (await me(e)).body.user._id;

    let r = await call("POST", "/account/email", e, { newEmail: "new-e@example.com" });
    await check("no current password -> 400", r.status === 400, r.body.message);
    r = await call("POST", "/account/email", e, { newEmail: "new-e@example.com", currentPassword: "wrong-password" });
    await check("wrong current password -> 400 (not 401, which logs out)", r.status === 400 && /incorrect/.test(r.body.message), r.body.message);
    r = await call("POST", "/account/email", e, { newEmail: "not-an-email", currentPassword: "secret123" });
    await check("invalid email -> 400", r.status === 400, r.body.message);
    r = await call("POST", "/account/email", e, { newEmail: "E@example.com", currentPassword: "secret123" });
    await check("same email -> 400", r.status === 400, r.body.message);
    r = await call("POST", "/account/email", e, { newEmail: " B@Example.com ", currentPassword: "secret123" });
    await check("email of another account -> 400 with a generic message", r.status === 400 && !/exist|already|registered|taken/i.test(r.body.message), r.body.message);
    await check("  no email was sent for any of these", emails.length === 0, emails.map((m) => m.subject));

    r = await call("POST", "/account/email", e, { newEmail: "New-E@example.com", currentPassword: "secret123" });
    await check("valid request -> 200 with the pending address", r.status === 200 && r.body.pendingEmail === "new-e@example.com", r.body);
    const toNew = emails.find((m) => m.to === "new-e@example.com");
    const toOld = emails.find((m) => m.to === "e@example.com");
    const token = tokenFrom(toNew, "confirm-email");
    await check("  confirmation link sent to the NEW address (logged in development)", Boolean(token), toNew);
    await check("  the OLD address is told, with the new one masked", toOld?.text.includes("Your email is being changed to n***@example.com") && toOld.text.includes("If this wasn't you, change your password") && !toOld.text.includes("new-e@"), toOld?.text);
    r = await me(e);
    await check("  email not changed yet", r.body.user.email === "e@example.com" && r.body.user.pendingEmail === "new-e@example.com");
    const stored = await User.findById(eId).select("+emailChangeTokenHash +emailChangeExpires").lean();
    await check("  only a hash of the token is stored, expiring in 30 minutes", stored.emailChangeTokenHash === hashToken(token) && Math.abs(stored.emailChangeExpires - Date.now() - 30 * 60 * 1000) < 60 * 1000);

    r = await call("POST", "/account/email/confirm", b, { token });
    await check("token used by another logged-in user -> 400 INVALID_TOKEN", r.status === 400 && r.body.code === "INVALID_TOKEN", r.body);
    await check("  nobody's email changed", (await me(b)).body.user.email === "b@example.com" && (await me(e)).body.user.email === "e@example.com");
    r = await call("POST", "/account/email/confirm", e, { token: "f".repeat(64) });
    await check("wrong token -> 400 INVALID_TOKEN", r.status === 400 && r.body.code === "INVALID_TOKEN");
    r = await call("POST", "/account/email/confirm", e, {});
    await check("missing token -> 400 INVALID_TOKEN", r.status === 400 && r.body.code === "INVALID_TOKEN");

    r = await call("POST", "/account/email/confirm", e, { token });
    await check("confirm -> 200 and the email changes", r.status === 200 && r.body.user.email === "new-e@example.com" && !r.body.user.pendingEmail, r.body);
    await check("  log in with the new email works", Boolean(await login(base, "new-e@example.com")));
    r = await call("POST", "/account/email/confirm", e, { token });
    await check("reused token -> 400 INVALID_TOKEN", r.status === 400 && r.body.code === "INVALID_TOKEN");

    // Expired, and a newer request replacing an older link
    const x = await register(base, "x@example.com");
    const xId = (await me(x)).body.user._id;
    await call("POST", "/account/email", x, { newEmail: "x2@example.com", currentPassword: "secret123" });
    const first = tokenFrom(emails.findLast((m) => m.to === "x2@example.com"), "confirm-email");
    await call("POST", "/account/email", x, { newEmail: "x3@example.com", currentPassword: "secret123" });
    const second = tokenFrom(emails.findLast((m) => m.to === "x3@example.com"), "confirm-email");
    r = await call("POST", "/account/email/confirm", x, { token: first });
    await check("an older link stops working after a new request", r.status === 400 && r.body.code === "INVALID_TOKEN");
    await User.updateOne({ _id: xId }, { emailChangeExpires: new Date(Date.now() - 1000) });
    r = await call("POST", "/account/email/confirm", x, { token: second });
    await check("expired token -> 400 EXPIRED_TOKEN", r.status === 400 && r.body.code === "EXPIRED_TOKEN", r.body);
    r = await me(x);
    await check("  email unchanged and the pending change cleared", r.body.user.email === "x@example.com" && !r.body.user.pendingEmail);
    r = await call("POST", "/account/email/confirm", x, { token: second });
    await check("  the expired token can't be used again", r.status === 400 && r.body.code === "INVALID_TOKEN");

    // The new address is taken by someone else between the request and the confirmation
    await call("POST", "/account/email", x, { newEmail: "late@example.com", currentPassword: "secret123" });
    const late = tokenFrom(emails.findLast((m) => m.to === "late@example.com"), "confirm-email");
    await register(base, "late@example.com");
    r = await call("POST", "/account/email/confirm", x, { token: late });
    await check("address taken before confirming -> 400 generic, unchanged", r.status === 400 && (await me(x)).body.user.email === "x@example.com", r.body.message);
  });

  await t.test("password change", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    const session1 = await register(base, "p@example.com", "Pat");
    const session2 = await login(base, "p@example.com");
    const before = emails.length;

    let r = await call("POST", "/account/password", session2, { currentPassword: "secret123", newPassword: "123" });
    await check("new password too short (registration rules) -> 400", r.status === 400 && /at least 6/.test(r.body.message), r.body.message);
    r = await call("POST", "/account/password", session2, { currentPassword: "secret123", newPassword: 12345678 });
    await check("new password not text -> 400", r.status === 400, r.body.message);
    r = await call("POST", "/account/password", session2, { newPassword: "another-pass" });
    await check("no current password -> 400", r.status === 400, r.body.message);
    r = await call("POST", "/account/password", session2, { currentPassword: "wrong-password", newPassword: "another-pass" });
    await check("wrong current password -> 400", r.status === 400 && /incorrect/.test(r.body.message), r.body.message);
    r = await call("POST", "/account/password", session2, { currentPassword: "secret123", newPassword: "secret123" });
    await check("same as the old password -> 400", r.status === 400 && /different/.test(r.body.message), r.body.message);
    await check("  failed attempts didn't log anyone out", (await me(session1)).status === 200);

    r = await call("POST", "/account/password", session2, { currentPassword: "secret123", newPassword: "another-pass" });
    await check("change -> 200 with a new token", r.status === 200 && typeof r.body.token === "string", r.body);
    const fresh = r.body.token;
    await check("  the new token works", (await me(fresh)).status === 200);
    await check("  other sessions are logged out", (await me(session1)).status === 401 && (await call("GET", "/resumes", session1)).status === 401);
    await check("  the old token of this session is logged out too", (await me(session2)).status === 401);
    await check("  the user is emailed", emails.slice(before).some((m) => m.to === "p@example.com" && /password was changed/i.test(m.subject)), emails.slice(before));
    await check("  old password no longer logs in", !(await login(base, "p@example.com")));
    await check("  new password logs in", Boolean(await login(base, "p@example.com", "another-pass")));
  });

  await t.test("log out everywhere", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    const one = await register(base, "l@example.com");
    const two = await login(base, "l@example.com");
    const lId = (await me(one)).body.user._id;
    // A token from before token versions existed (no "tv") still works until the next logout
    const legacy = jwt.sign({ id: lId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    await check("a token without a version still works", (await me(legacy)).status === 200);

    let r = await call("POST", "/account/logout-all", undefined);
    await check("no token -> 401", r.status === 401);
    r = await call("POST", "/account/logout-all", one);
    await check("logout-all -> 200", r.status === 200, r.body);
    for (const [label, token] of [["this session", one], ["another session", two], ["the version-less token", legacy]]) {
      await check(`  ${label} is logged out`, (await me(token)).status === 401 && (await call("GET", "/resumes", token)).status === 401);
    }
    await check("  logging in again works", (await me(await login(base, "l@example.com"))).status === 200);
    await check("  other users are not affected", (await me(a)).status === 200);
  });

  await t.test("rate limiting", async (s) => {
    const check = checker(s); // Checks belong to this section (a parent's would wait for it: deadlock)
    const r1 = await register(base, "r@example.com");
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await call("POST", "/account/password", r1, { currentPassword: `guess-${i}`, newPassword: "another-pass" })).status);
    }
    await check("password guesses: 10 allowed, then 429", statuses.slice(0, 10).every((s) => s === 400) && statuses[10] === 429, statuses);
    const r = await call("POST", "/account/email", r1, { newEmail: "r2@example.com", currentPassword: "secret123" });
    await check("  the limit covers every sensitive route", r.status === 429, r.status);
    await check("  other users aren't limited", (await call("POST", "/account/password", b, { currentPassword: "nope", newPassword: "another-pass" })).status === 400);
  });
});
