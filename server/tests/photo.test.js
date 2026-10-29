// Profile photo routes. Cloudinary's upload/destroy are replaced by local stand-ins, so the
// test never contacts Cloudinary (it records the calls instead).
import { test } from "node:test";
import { v2 as cloudinary } from "cloudinary";
import { checker, register, startApi } from "./helpers/api.js";

test("profile photos", async (t) => {
  const base = await startApi(t, "photo"); // Starts without Cloudinary keys
  const check = checker(t);

  // Stand-ins for Cloudinary (the same module instance the server uses)
  const calls = [];
  let failUpload = false;
  let version = 0;
  cloudinary.uploader.upload = async (source, options) => {
    calls.push(["upload", options.public_id, source.slice(0, 22)]);
    if (failUpload) throw new Error("boom");
    version += 1;
    return { secure_url: `https://res.cloudinary.com/demo/image/upload/v${version}/${options.public_id}.jpg`, public_id: options.public_id };
  };
  cloudinary.uploader.destroy = async (id) => {
    calls.push(["destroy", id]);
    return { result: "ok" };
  };

  const a = await register(base, "a@example.com");
  const b = await register(base, "b@example.com");
  const json = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const upload = async (url, token, { name = "me.jpg", type = "image/jpeg", bytes, field = "photo" }) => {
    const form = new FormData();
    form.append(field, new Blob([bytes], { type }), name);
    const res = await fetch(base + url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    return { status: res.status, body: await res.json() };
  };
  // Tiny files with real image signatures (the server checks the first bytes)
  const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]);
  const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(200)]);

  const id = (await json("POST", "/resumes", a, { title: "Mine", personalInfo: { fullName: "Ana", photoUrl: "https://evil.example/x.png" } })).body._id;
  let r = await json("GET", `/resumes/${id}`, a);
  await check("create ignores photoUrl from the body", r.body.personalInfo.photoUrl === "", r.body.personalInfo.photoUrl);

  r = await upload(`/resumes/${id}/photo`, a, { bytes: JPG });
  await check("no Cloudinary keys -> 503 with clear message", r.status === 503, r.body.message);

  // Fake keys (the stand-ins above do the uploading)
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";

  r = await upload(`/resumes/${id}/photo`, a, { name: "me.gif", type: "image/gif", bytes: JPG });
  await check("GIF -> 415", r.status === 415, r.body.message);
  r = await upload(`/resumes/${id}/photo`, a, { name: "fake.jpg", bytes: Buffer.from("not an image at all, just text") });
  await check("text renamed .jpg -> 415", r.status === 415, r.body.message);
  r = await upload(`/resumes/${id}/photo`, a, { bytes: Buffer.concat([JPG, Buffer.alloc(3 * 1024 * 1024)]) });
  await check("3 MB -> 413 with 2 MB message", r.status === 413 && r.body.message.includes("2 MB"), r.body.message);
  r = await upload(`/resumes/${id}/photo`, a, { bytes: JPG, field: "file" });
  await check("wrong field name -> 400", r.status === 400, r.body.message);
  r = await upload(`/resumes/${id}/photo`, b, { bytes: JPG });
  await check("other user's resume -> 404", r.status === 404);

  const before = calls.length;
  for (const [label, bytes, name, type] of [
    ["JPG", JPG, "me.jpg", "image/jpeg"],
    ["PNG", PNG, "me.png", "image/png"],
    ["WebP", WEBP, "me.webp", "image/webp"],
  ]) {
    r = await upload(`/resumes/${id}/photo`, a, { bytes, name, type });
    await check(`${label} upload -> 200 with Cloudinary URL`, r.status === 200 && r.body.photoUrl?.startsWith("https://res.cloudinary.com/"), r.body.photoUrl ?? r.body.message);
  }
  await check("  stored under one id per resume (replacing the old one)", calls.slice(before).every((call) => call[1] === `resume-builder/photos/${id}`));
  const url = r.body.photoUrl;
  r = await json("GET", `/resumes/${id}`, a);
  await check("photoUrl saved; photoPublicId not exposed", r.body.personalInfo.photoUrl === url && !("photoPublicId" in r.body));

  r = await json("PUT", `/resumes/${id}`, a, { personalInfo: { fullName: "Ana Lopez", photoUrl: "https://evil.example/x.png" } });
  await check("PUT changes name but can't change photoUrl", r.body.personalInfo.fullName === "Ana Lopez" && r.body.personalInfo.photoUrl === url, r.body.personalInfo.photoUrl);
  r = await json("PUT", `/resumes/${id}`, a, { personalInfo: { fullName: "Ana L", email: "ana@example.com" } });
  await check("PUT without photoUrl (stale autosave) keeps the photo", r.body.personalInfo.photoUrl === url && r.body.personalInfo.email === "ana@example.com");

  r = await json("PUT", `/resumes/${id}`, a, { design: { showPhoto: true, photoShape: "rounded", photoSize: 30, photoBorder: true, photoBorderColor: "#112233", photoPosition: "right" } });
  await check("photo design settings save", r.status === 200 && r.body.design?.photoShape === "rounded" && r.body.design?.photoSize === 30, r.body.message ?? "");
  for (const [label, design] of [
    ["shape=star", { photoShape: "star" }],
    ["size=60", { photoSize: 60 }],
    ["position=top", { photoPosition: "top" }],
    ["border color=red", { photoBorderColor: "red" }],
  ]) {
    r = await json("PUT", `/resumes/${id}`, a, { design });
    await check(`rejects ${label} -> 400`, r.status === 400, r.body.message);
  }

  const duplicate = (await json("POST", `/resumes/${id}/duplicate`, a)).body;
  await check("duplicate gets its OWN photo copy", duplicate.personalInfo.photoUrl && duplicate.personalInfo.photoUrl !== url && duplicate.personalInfo.photoUrl.includes(duplicate._id), duplicate.personalInfo.photoUrl);
  await check("  copied from the original's URL", calls.some((call) => call[0] === "upload" && call[1] === `resume-builder/photos/${duplicate._id}` && call[2].startsWith("https://res.cloudinary")));

  failUpload = true;
  r = await upload(`/resumes/${id}/photo`, a, { bytes: JPG });
  const afterFail = (await json("GET", `/resumes/${id}`, a)).body.personalInfo.photoUrl;
  await check("Cloudinary failure -> 502, old photo kept", r.status === 502 && afterFail === url, r.body.message);
  failUpload = false;

  r = await json("DELETE", `/resumes/${id}/photo`, a);
  await check("DELETE photo -> cleared and deleted from Cloudinary", r.status === 200 && r.body.photoUrl === "" && calls.some((call) => call[0] === "destroy" && call[1] === `resume-builder/photos/${id}`));
  await check("  removing the original's photo didn't touch the duplicate", (await json("GET", `/resumes/${duplicate._id}`, a)).body.personalInfo.photoUrl.includes(duplicate._id));
  r = await json("DELETE", `/resumes/${duplicate._id}`, a);
  await new Promise((resolve) => setTimeout(resolve, 100)); // The photo is deleted in the background
  await check("deleting a resume deletes its photo too", r.status === 200 && calls.some((call) => call[0] === "destroy" && call[1] === `resume-builder/photos/${duplicate._id}`));
  r = await json("DELETE", `/resumes/${id}/photo`, b);
  await check("other user can't delete the photo -> 404", r.status === 404);
});
