// matchDesign: a detected design (the shape server/services/import/detectDesign.js returns) ->
// the closest template and design settings. Run: npm test (in client/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSettings, matchDesign, matchFont } from "./matchDesign.js";
import { cleanDesign, resolveDesign } from "./design.js";
import { getTemplate } from "./registry.js";

// What the server reads from tests/fixtures/design (see server/tests/design-detection.test.js)
const SERIF_CENTRED = {
  source: "pdf",
  pageSize: "A4",
  fonts: { body: { name: "Georgia", category: "serif" }, heading: { name: "Georgia", category: "serif" }, name: { name: "Georgia", category: "serif" } },
  sizes: { body: 10.5, heading: 13, name: 24 },
  colors: { accent: "#7a2335", text: "#1d1d1f", sidebar: null, headerBand: null },
  layout: { columns: 1, sidebar: null, sideRatio: null, headerAlign: "center" },
  sections: [
    { id: "summary", heading: "Profile", side: false },
    { id: "experience", heading: "Work History", side: false },
    { id: "skills", heading: "Key Skills", side: false },
    { id: "education", heading: "Education", side: false },
    { id: "additional", heading: "Certifications", side: false },
  ],
  bulletStyle: "dash",
  hasPhoto: false,
};
const SIDEBAR = {
  source: "pdf",
  pageSize: "A4",
  fonts: { body: { name: "Arial", category: "sans" }, heading: { name: "Arial", category: "sans" }, name: { name: "Arial", category: "sans" } },
  sizes: { body: 10, heading: 12, name: 22 },
  colors: { accent: "#0f5257", text: "#1d1d1f", sidebar: "#0f5257", headerBand: null },
  layout: { columns: 2, sidebar: "left", sideRatio: 35, headerAlign: "left" },
  sections: [
    { id: "summary", heading: "Summary", side: false },
    { id: "experience", heading: "Experience", side: false },
    { id: "education", heading: "Education", side: false },
    { id: "skills", heading: "Skills", side: true },
    { id: "additional", heading: "Languages", side: true },
  ],
  bulletStyle: "disc",
  hasPhoto: true,
};

test("serif, centred header -> Elegant Serif in the nearest palette, the file's font, accent, order and headings", () => {
  const { templateId, design, notes } = matchDesign(SERIF_CENTRED);
  assert.equal(templateId, "elegant-serif-burgundy");
  assert.equal(design.fontFamily, "merriweather", "Georgia -> Merriweather");
  assert.equal(design.headingFontFamily, "merriweather", "one font throughout, not the layout's Playfair");
  assert.equal(design.accentColor, "#7a2335");
  assert.equal(design.baseFontSize, 10.5);
  assert.deepEqual(design.sectionOrder, ["summary", "experience", "skills", "education", "additional", "projects"]);
  assert.deepEqual(design.sectionHeadings, { summary: "Profile", experience: "Work History", skills: "Key Skills", education: "Education" });
  assert.equal(design.bulletStyle, "dash");
  assert.equal(design.headerAlign, undefined, "Elegant Serif is already centred");
  assert.ok(notes.some((note) => note.includes("Georgia")) && notes.some((note) => note.includes("Work History")), notes.join(" | "));
  // Every setting survives the design cleaner (nothing is silently dropped)
  assert.deepEqual(cleanDesign(design), design);
  const { resolved } = resolveDesign(getTemplate(templateId), design);
  assert.equal(resolved.sectionHeadings.experience, "Work History");
});

test("two columns with a sidebar -> Sidebar Pro, the side sections in the side column", () => {
  const { templateId, design, notes } = matchDesign(SIDEBAR);
  assert.equal(templateId, "sidebar-pro-teal", "teal accent -> the Deep Teal palette");
  assert.equal(design.columns, 2);
  assert.deepEqual(design.sideSections, ["skills", "additional"]);
  assert.equal(design.sideRatio, 35);
  assert.equal(design.fontFamily, "inter");
  assert.ok(notes.some((note) => /left sidebar/.test(note)) && notes.some((note) => /photo/.test(note)), notes.join(" | "));
  assert.deepEqual(cleanDesign(design), design);
});

test("other layouts: centred sans, left-aligned, small text, header band, two plain columns", () => {
  const base = { ...SERIF_CENTRED, fonts: { body: { name: "Arial", category: "sans" }, heading: null, name: null } };
  assert.match(matchDesign(base).templateId, /^classic-/, "centred sans -> Classic");
  const left = { ...base, layout: { ...base.layout, headerAlign: "left" } };
  assert.match(matchDesign(left).templateId, /^modern-line-/);
  assert.match(matchDesign({ ...left, sizes: { body: 9, heading: null, name: null } }).templateId, /^compact-pro-/);
  assert.match(matchDesign({ ...left, colors: { ...left.colors, headerBand: "#1f3a5f" } }).templateId, /^bold-header-/);
  assert.match(matchDesign({ ...left, colors: { ...left.colors, headerBand: "#eef2f6" } }).templateId, /^soft-header-/);
  assert.match(matchDesign({ ...left, layout: { columns: 2, sidebar: null, sideRatio: 35, headerAlign: "left" } }).templateId, /^editorial-/);
});

test("a DOCX (one column) and missing facts keep the template's defaults", () => {
  const { templateId, design } = matchDesign({
    source: "docx",
    pageSize: null,
    fonts: { body: { name: "Garamond", category: "serif" }, heading: { name: "Garamond", category: "serif" }, name: null },
    sizes: { body: 11, heading: 14, name: null },
    colors: { accent: null, text: null, sidebar: null, headerBand: null },
    layout: { columns: 1, sidebar: null, sideRatio: null, headerAlign: "left" },
    sections: [],
    bulletStyle: null,
    hasPhoto: false,
  });
  assert.equal(templateId, "modern-line-navy", "no accent -> the first palette");
  assert.equal(design.fontFamily, "eb-garamond");
  assert.equal(design.accentColor, undefined);
  assert.equal(design.sectionOrder, undefined);
  assert.equal(design.pageSize, undefined);
  assert.equal(matchDesign(null), null, "nothing detected -> no match");
});

test("fonts map to the closest one offered", () => {
  for (const [name, category, id] of [
    ["Calibri", "sans", "lato"],
    ["Helvetica Neue", "sans", "inter"],
    ["Times New Roman", "serif", "source-serif-4"],
    ["Cambria", "serif", "merriweather"],
    ["Roboto", "sans", "roboto"],
    ["Some Unknown Serif", "serif", "source-serif-4"],
    ["Some Unknown Sans", "sans", "inter"],
  ]) assert.equal(matchFont({ name, category }), id, name);
});

test("a different template keeps only the content settings", () => {
  const { design } = matchDesign(SERIF_CENTRED);
  assert.deepEqual(contentSettings(design), { sectionOrder: design.sectionOrder, sectionHeadings: design.sectionHeadings, pageSize: "A4" });
});
