// A resume's design settings: saved and reloaded exactly, invalid values rejected,
// copied when the resume is duplicated.
import { test } from "node:test";
import { checker, register, startApi } from "./helpers/api.js";

test("design settings", async (t) => {
  const base = await startApi(t, "design");
  const check = checker(t);
  const token = await register(base, "d@example.com");
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  const id = (await call("POST", "/resumes")).body._id;
  let r = await call("GET", `/resumes/${id}`);
  await check("new resume has design {} (no [] defaults)", JSON.stringify(r.body.design) === "{}", r.body.design);

  const full = {
    sectionOrder: ["experience", "projects", "summary", "skills", "education", "additional"],
    hiddenSections: ["summary"],
    sectionHeadings: { projects: "Portfolio" },
    columns: 2,
    sideSections: ["skills", "education"],
    sideRatio: 35,
    headerAlign: "right",
    skillsDisplay: "tags",
    dateFormat: "numeric",
    bulletStyle: "arrow",
  };
  r = await call("PUT", `/resumes/${id}`, { design: full });
  await check("full layout design saves", r.status === 200 && JSON.stringify(r.body.design) === JSON.stringify(full), r.body.design ?? r.body.message);
  r = await call("GET", `/resumes/${id}`);
  await check("  and reloads identically", JSON.stringify(r.body.design) === JSON.stringify(full));
  r = await call("PUT", `/resumes/${id}`, { design: { headerAlign: "center" } });
  await check("partial design replaces (no stray arrays)", r.status === 200 && JSON.stringify(r.body.design) === '{"headerAlign":"center"}', r.body.design);

  const invalid = [
    ["unknown section in order", { sectionOrder: ["summary", "experience", "education", "skills", "projects", "hobbies"] }],
    ["order missing a section", { sectionOrder: ["summary", "experience"] }],
    ["order with a repeat", { sectionOrder: ["summary", "summary", "education", "skills", "projects", "additional"] }],
    ["hidden twice", { hiddenSections: ["skills", "skills"] }],
    ["columns = 3", { columns: 3 }],
    ["sideRatio = 50", { sideRatio: 50 }],
    ["headerAlign = justify", { headerAlign: "justify" }],
    ["skillsDisplay = cloud", { skillsDisplay: "cloud" }],
    ["dateFormat = iso", { dateFormat: "iso" }],
    ["bulletStyle = star", { bulletStyle: "star" }],
    ["heading over 40 chars", { sectionHeadings: { projects: "x".repeat(41) } }],
  ];
  for (const [label, design] of invalid) {
    r = await call("PUT", `/resumes/${id}`, { design });
    await check(`rejects ${label} -> 400`, r.status === 400, r.body.message);
  }
  r = await call("GET", `/resumes/${id}`);
  await check("rejected updates didn't change the saved design", JSON.stringify(r.body.design) === '{"headerAlign":"center"}', r.body.design);

  r = await call("POST", `/resumes/${id}/duplicate`);
  await check("duplicate copies the design", r.body.design?.headerAlign === "center");
});
