// Reading an uploaded resume's design (services/import/detectDesign.js) from files with a known
// design (tests/fixtures/design, built by make-fixtures.mjs): serif vs sans, the accent colour,
// one or two columns, header alignment, section order and the user's own headings, bullets and
// a photo. Plus the heading helpers.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import detectDesign, { cleanFontName, isContactHeading, sectionIdOf } from "../services/import/detectDesign.js";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const fixture = (name) => fs.readFileSync(fileURLToPath(new URL(`./fixtures/design/${name}`, import.meta.url)));
const detect = (name) => detectDesign({ buffer: fixture(name), mimetype: name.endsWith(".pdf") ? PDF : DOCX });
const order = (design) => design.sections.map((section) => section.id);
const headings = (design) => design.sections.map((section) => section.heading);

test("serif resume with a centred header and its own headings (PDF)", async () => {
  const design = await detect("serif-centered.pdf");
  assert.equal(design.source, "pdf");
  assert.deepEqual(design.fonts.body, { name: "Georgia", category: "serif" }, "serif body font");
  assert.equal(design.colors.accent, "#7a2335", "the burgundy headings are the accent");
  assert.equal(design.layout.columns, 1);
  assert.equal(design.layout.headerAlign, "center", "centred name");
  assert.deepEqual(order(design), ["summary", "experience", "skills", "education", "additional"], "the file's own section order");
  assert.deepEqual(headings(design), ["Profile", "Work History", "Key Skills", "Education", "Certifications"], "the user's heading names (capitals are a style)");
  assert.equal(design.sizes.body, 10.5);
  assert.equal(design.sizes.name, 24);
  assert.equal(design.bulletStyle, "dash");
  assert.equal(design.pageSize, "A4");
  assert.equal(design.hasPhoto, false);
});

test("two columns with a coloured sidebar and a photo (PDF)", async () => {
  const design = await detect("sidebar-two-columns.pdf");
  assert.equal(design.fonts.body.category, "sans", "sans-serif body font");
  assert.equal(design.fonts.body.name, "Arial");
  assert.deepEqual(design.layout, { columns: 2, sidebar: "left", sideRatio: 35, headerAlign: "left" });
  assert.equal(design.colors.sidebar, "#0f5257");
  assert.equal(design.colors.accent, "#0f5257");
  assert.equal(design.hasPhoto, true, "the picture at the top of the sidebar");
  // The main column first, then the side column; "Contact" holds personal details, not a section
  assert.deepEqual(design.sections, [
    { id: "summary", heading: "Summary", side: false },
    { id: "experience", heading: "Experience", side: false },
    { id: "education", heading: "Education", side: false },
    { id: "skills", heading: "Skills", side: true },
    { id: "additional", heading: "Languages", side: true },
  ]);
});

test("left-aligned sans resume, accent on the name, skills first (PDF, US Letter)", async () => {
  const design = await detect("left-sans.pdf");
  assert.equal(design.fonts.body.category, "sans");
  assert.equal(design.colors.accent, "#1f6feb");
  assert.equal(design.layout.columns, 1);
  assert.equal(design.layout.headerAlign, "left");
  assert.deepEqual(order(design), ["skills", "experience", "projects", "education"]);
  assert.equal(design.sections[0].heading, "Technical Skills");
  assert.equal(design.bulletStyle, "disc");
  assert.equal(design.pageSize, "Letter");
  assert.equal(design.sizes.name, 26);
});

test("Word file: fonts, heading colour, centred name, headings and bullets (DOCX)", async () => {
  const design = await detect("garamond-headings.docx");
  assert.equal(design.source, "docx");
  assert.deepEqual(design.fonts.body, { name: "Garamond", category: "serif" });
  assert.equal(design.colors.accent, "#2d5a3d", "the heading style's colour");
  assert.equal(design.layout.columns, 1, "Word files always get one column");
  assert.equal(design.layout.headerAlign, "center");
  assert.deepEqual(headings(design), ["Career Summary", "Professional Experience", "Education", "Technical Skills"]);
  assert.deepEqual(order(design), ["summary", "experience", "education", "skills"]);
  assert.equal(design.sizes.body, 11);
  assert.equal(design.bulletStyle, "dash");
  assert.equal(design.pageSize, "A4");
});

test("a file whose design can't be read gives null, never an error", async () => {
  assert.equal(await detectDesign({ buffer: Buffer.from("%PDF-1.4 not really"), mimetype: PDF }), null);
  assert.equal(await detectDesign({ buffer: Buffer.from("PK nope"), mimetype: DOCX }), null);
});

test("heading helpers", () => {
  for (const [heading, id] of [
    ["Work History", "experience"],
    ["EARLIER EXPERIENCE", "experience"],
    ["Profile", "summary"],
    ["Technical Skills", "skills"],
    ["Skills & Tools", "skills"],
    ["Selected Projects", "projects"],
    ["Further Education", "education"],
    ["Certifications", "additional"],
    ["Languages", "additional"],
    ["Senior Backend Engineer", null],
  ]) assert.equal(sectionIdOf(heading), id, heading);
  assert.ok(isContactHeading("Contact") && isContactHeading("Personal details:") && !isContactHeading("Skills"));
  assert.equal(cleanFontName("ABCDEF+Georgia-BoldItalic"), "Georgia");
  assert.equal(cleanFontName("TimesNewRomanPSMT"), "Times New Roman");
  assert.equal(cleanFontName("AAAAAA+Arial-BoldMT"), "Arial");
});
