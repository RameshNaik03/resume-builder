// Cloudinary deletions that fail are queued (pendingdeletions) and retried later, never lost:
// account deletion, removing an avatar or a resume photo, deleting a resume. Cloudinary's
// upload/destroy are local stand-ins that can be made to fail.
import { test } from "node:test";
import { v2 as cloudinary } from "cloudinary";
import PendingDeletion from "../models/PendingDeletion.js";
import { retryPendingDeletions } from "../services/photoStorage.js";
import { checker, register, startApi } from "./helpers/api.js";
import { JPG, caller, captureEmails, fakeCloudinary, useFakeCloudinaryKeys } from "./helpers/account.js";

test("failed Cloudinary deletions are queued and retried", async (t) => {
  const base = await startApi(t, "pending_deletions");
  const check = checker(t);
  const call = caller(base);
  captureEmails(t); // Keeps the account emails out of the test output
  const { calls, state } = fakeCloudinary(cloudinary);
  useFakeCloudinaryKeys();
  const multipart = async (method, url, token, field) => {
    const form = new FormData();
    form.append(field, new Blob([JPG], { type: "image/jpeg" }), "me.jpg");
    const res = await fetch(base + url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
    return { status: res.status, body: await res.json() };
  };
  const queued = async () => (await PendingDeletion.find().lean()).map((entry) => entry.publicId).sort();

  const token = await register(base, "a@example.com");
  const id = (await call("GET", "/auth/me", token)).body.user._id;
  const resumes = [];
  for (let i = 0; i < 3; i++) {
    const resume = (await call("POST", "/resumes", token, { title: `CV ${i}` })).body;
    await multipart("POST", `/resumes/${resume._id}/photo`, token, "photo");
    resumes.push(resume._id);
  }
  await multipart("PATCH", "/account/profile", token, "avatar");
  await check("nothing queued while Cloudinary works", (await queued()).length === 0);

  state.failDestroy = true;
  let r = await call("DELETE", `/resumes/${resumes[0]}/photo`, token);
  await check("removing a resume photo while Cloudinary fails -> still removed", r.status === 200 && r.body.photoUrl === "");
  r = await call("DELETE", `/resumes/${resumes[1]}`, token);
  await new Promise((resolve) => setTimeout(resolve, 200)); // The photo is deleted in the background
  r = await call("DELETE", "/account", token, { currentPassword: "secret123", confirm: "DELETE" });
  await check("deleting the account while Cloudinary fails -> still deleted", r.status === 200, r.body);
  const expected = [...resumes.map((resumeId) => `resume-builder/photos/${resumeId}`), `resume-builder/avatars/${id}`].sort();
  await check("  every failed deletion is queued", JSON.stringify(await queued()) === JSON.stringify(expected), await queued());

  let result = await retryPendingDeletions();
  const entry = await PendingDeletion.findOne({ publicId: expected[0] }).lean();
  await check("retry while Cloudinary still fails -> kept, attempts counted", result.failed === 4 && result.deleted === 0 && entry.attempts === 2 && entry.lastError === "Cloudinary is down", { result, entry });

  delete process.env.CLOUDINARY_API_SECRET;
  result = await retryPendingDeletions();
  await check("retry without Cloudinary keys -> nothing tried", result.skipped === 4 && (await queued()).length === 4, result);
  useFakeCloudinaryKeys();

  state.failDestroy = false;
  const before = calls.length;
  result = await retryPendingDeletions();
  const retried = calls.slice(before).filter((c) => c[0] === "destroy").map((c) => c[1]).sort();
  await check("retry once Cloudinary works -> all deleted, queue empty", result.deleted === 4 && (await queued()).length === 0 && JSON.stringify(retried) === JSON.stringify(expected), { result, retried });
  result = await retryPendingDeletions();
  await check("  nothing left to retry", result.deleted === 0 && result.failed === 0 && result.skipped === 0);

  // Without Cloudinary keys a deletion can't even be tried: it's queued for later
  const other = await register(base, "b@example.com");
  const resume = (await call("POST", "/resumes", other, { title: "B" })).body;
  await multipart("POST", `/resumes/${resume._id}/photo`, other, "photo");
  delete process.env.CLOUDINARY_CLOUD_NAME;
  await call("DELETE", "/account", other, { currentPassword: "secret123", confirm: "DELETE" });
  await check("deleting without Cloudinary keys queues the photo", JSON.stringify(await queued()) === JSON.stringify([`resume-builder/photos/${resume._id}`]), await queued());
});
