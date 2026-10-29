// Auth + resume routes: create, list, update, duplicate, delete, and that users can only
// ever see and change their own resumes.
import { test } from "node:test";
import mongoose from "mongoose";
import { checker, startApi } from "./helpers/api.js";

test("resume API: auth, CRUD and ownership", async (t) => {
  const base = await startApi(t, "resume");
  const check = checker(t);
  const req = async (method, url, { token, body } = {}) => {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  // Register without a body (Express 5 leaves req.body undefined)
  let r = await req("POST", "/auth/register");
  await check("register with no body -> 400", r.status === 400, r.status);

  const a = (await req("POST", "/auth/register", { body: { name: "A", email: "a@example.com", password: "secret123" } })).body;
  const b = (await req("POST", "/auth/register", { body: { name: "B", email: "b@example.com", password: "secret123" } })).body;
  await check("register returns no passwordHash", a.user && !("passwordHash" in a.user));

  r = await req("GET", "/resumes");
  await check("no token -> 401", r.status === 401);

  r = await req("POST", "/resumes", { token: a.token });
  await check("create with empty body -> 201 + defaults", r.status === 201 && r.body.title === "Untitled Resume" && r.body.template === "classic-navy", r.body.title);
  const first = r.body;

  const fakeId = new mongoose.Types.ObjectId().toString();
  r = await req("POST", "/resumes", { token: a.token, body: { title: "Frontend", userId: fakeId, skills: ["React"], experience: [{ company: "Acme", role: "Dev", bullets: ["Built X"] }] } });
  await check("create ignores userId from body", r.status === 201 && r.body.userId === a.user._id, r.body.userId);
  const second = r.body;

  r = await req("GET", "/resumes", { token: a.token });
  await check("list newest first, only title+updatedAt", r.body.length === 2 && r.body[0]._id === second._id && Object.keys(r.body[0]).sort().join() === "_id,title,updatedAt", Object.keys(r.body[0]).join());

  r = await req("GET", `/resumes/${second._id}`, { token: a.token });
  await check("get own resume -> 200", r.status === 200 && r.body.experience[0].company === "Acme");

  r = await req("PUT", `/resumes/${second._id}`, { token: a.token, body: { title: "Frontend v2", userId: b.user._id, personalInfo: { fullName: "A Person" } } });
  await check("update applies title, keeps userId", r.status === 200 && r.body.title === "Frontend v2" && r.body.userId === a.user._id && r.body.skills[0] === "React", r.body.userId);

  r = await req("GET", "/resumes", { token: a.token });
  await check("updated resume moves to top", r.body[0]._id === second._id);

  r = await req("POST", `/resumes/${second._id}/duplicate`, { token: a.token });
  await check("duplicate -> 201 with (Copy)", r.status === 201 && r.body.title === "Frontend v2 (Copy)" && r.body._id !== second._id && r.body.experience[0].company === "Acme");

  // A second user can't see or touch A's resumes
  r = await req("GET", "/resumes", { token: b.token });
  await check("B's list is empty", r.status === 200 && r.body.length === 0);
  for (const [method, url] of [["GET", ""], ["PUT", ""], ["DELETE", ""], ["POST", "/duplicate"]]) {
    r = await req(method, `/resumes/${second._id}${url}`, { token: b.token, body: method === "PUT" ? { title: "hacked" } : undefined });
    await check(`B ${method} ${url || "/:id"} on A's resume -> 404`, r.status === 404, r.status);
  }
  r = await req("GET", `/resumes/${second._id}`, { token: a.token });
  await check("A's resume unchanged after B's attempts", r.body.title === "Frontend v2");

  // Invalid ids
  for (const id of ["abc", "aaaaaaaaaaaa", fakeId]) {
    r = await req("GET", `/resumes/${id}`, { token: a.token });
    await check(`GET id "${id}" -> 404`, r.status === 404, `${r.status} ${r.body.message}`);
  }

  r = await req("DELETE", `/resumes/${first._id}`, { token: a.token });
  await check("delete own -> 200", r.status === 200);
  r = await req("GET", `/resumes/${first._id}`, { token: a.token });
  await check("deleted resume -> 404", r.status === 404);
});
