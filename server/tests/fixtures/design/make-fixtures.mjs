// Builds the resumes the design-detection tests read (tests/design-detection.test.js), each with
// a known design: three PDFs printed by headless Edge/Chrome (so they have real embedded fonts,
// colours and an image, like files people export) and one DOCX. Every person, employer and
// contact detail is fictional.
//
// Run (from server/):  node tests/fixtures/design/make-fixtures.mjs
// It writes the files next to this script; commit them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { launchBrowser } from "../../../e2e/helpers.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));

const JOBS = (bullet) => `
<p><b>Senior Backend Engineer</b>, Harbour Health <span class="date">Jan 2021 – Present</span></p>
<p class="b">${bullet} Built the appointments API in Node.js used by 40 clinics</p>
<p class="b">${bullet} Cut Postgres query times by 60% with better indexes</p>
<p class="b">${bullet} Led a team of four engineers through a move to Kafka</p>
<p><b>Software Engineer</b>, Tessellate <span class="date">Jul 2017 – Dec 2020</span></p>
<p class="b">${bullet} Moved 14 services to Kafka consumers</p>
<p class="b">${bullet} Wrote the billing reports used by finance every month</p>`;

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; color: #1d1d1f; }
  p { margin: 2pt 0; }
  .date { float: right; }
  .b { margin-left: 10pt; }`;

// 1. Serif, centred header, burgundy headings, custom headings and order, dash bullets (A4)
const serifCentered = `<html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, serif; font-size: 10.5pt; }
  h1 { text-align: center; font-size: 24pt; margin: 0 0 4pt; font-weight: normal; }
  .contact { text-align: center; }
  h2 { color: #7a2335; font-size: 13pt; margin: 14pt 0 4pt; text-transform: uppercase; letter-spacing: 1pt; }
</style></head><body>
<h1>Meera Iyer</h1>
<p class="contact">Backend Engineer · meera@example.com · +44 20 7946 0123 · London, UK</p>
<h2>Profile</h2>
<p>Backend engineer with 8 years of experience building reliable APIs and data pipelines for healthcare companies.</p>
<h2>Work History</h2>${JOBS("–")}
<h2>Key Skills</h2>
<p>Node.js, TypeScript, PostgreSQL, Kafka, Redis, Docker, AWS</p>
<h2>Education</h2>
<p><b>BSc Computer Science</b>, University of Leeds <span class="date">2017</span></p>
<h2>Certifications</h2>
<p>AWS Certified Developer – Associate</p>
</body></html>`;

// 2. Two columns: a teal sidebar on the left (photo, skills, languages), sans-serif (A4)
const sidebarTwoColumns = `<html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page { size: A4; margin: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  .page { display: flex; min-height: 297mm; }
  .side { width: 35%; background: #0f5257; color: #ffffff; padding: 16mm 8mm; }
  .main { width: 65%; padding: 16mm 12mm; }
  .side h2, .main h2 { font-size: 12pt; margin: 14pt 0 4pt; }
  .main h2 { color: #0f5257; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  img { width: 30mm; height: 30mm; border-radius: 50%; display: block; margin-bottom: 8mm; }
</style></head><body><div class="page">
<div class="side">
  <img id="photo" alt="">
  <h2>Contact</h2><p>meera@example.com</p><p>+44 20 7946 0123</p><p>London, UK</p>
  <h2>Skills</h2><p>Node.js</p><p>TypeScript</p><p>PostgreSQL</p><p>Kafka</p><p>Docker</p>
  <h2>Languages</h2><p>English (native)</p><p>German (fluent)</p>
</div>
<div class="main">
  <h1>Meera Iyer</h1><p>Backend Engineer</p>
  <h2>Summary</h2>
  <p>Backend engineer with 8 years of experience building reliable APIs and data pipelines for healthcare companies across Europe.</p>
  <h2>Experience</h2>${JOBS("•")}
  <h2>Education</h2>
  <p><b>BSc Computer Science</b>, University of Leeds <span class="date">2017</span></p>
</div></div></body></html>`;

// 3. Left-aligned sans, blue name, skills first, dot bullets (US Letter)
const leftSans = `<html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page { size: letter; margin: 0.7in; }
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  h1 { font-size: 26pt; color: #1f6feb; margin: 0 0 2pt; }
  h2 { font-size: 11pt; margin: 12pt 0 3pt; text-transform: uppercase; border-bottom: 1px solid #c8c8c8; }
</style></head><body>
<h1>Meera Iyer</h1>
<p>Backend Engineer · meera@example.com · London, UK</p>
<h2>Technical Skills</h2>
<p>Node.js, TypeScript, PostgreSQL, Kafka, Redis, Docker, AWS, Terraform</p>
<h2>Experience</h2>${JOBS("•")}
<h2>Projects</h2>
<p><b>Queuebench</b> – an open-source benchmark for message queues, 1,200 GitHub stars</p>
<h2>Education</h2>
<p><b>BSc Computer Science</b>, University of Leeds <span class="date">2017</span></p>
</body></html>`;

// 4. DOCX: Garamond, centred name, coloured heading styles, dash bullets
function docx() {
  const run = (text, props = "") => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;
  const para = (text, { style, align, bullet, props } = {}) =>
    `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ""}${align ? `<w:jc w:val="${align}"/>` : ""}</w:pPr>${run(text, props)}</w:p>`;
  const body = [
    para("Meera Iyer", { style: "Title", align: "center" }),
    para("Backend Engineer · meera@example.com · London, UK", { align: "center" }),
    para("Career Summary", { style: "Heading1" }),
    para("Backend engineer with 8 years of experience building reliable APIs and data pipelines for healthcare companies."),
    para("Professional Experience", { style: "Heading1" }),
    para("Senior Backend Engineer, Harbour Health, Jan 2021 – Present", { props: "<w:b/>" }),
    para("Built the appointments API in Node.js used by 40 clinics", { bullet: true }),
    para("Cut Postgres query times by 60% with better indexes", { bullet: true }),
    para("Education", { style: "Heading1" }),
    para("BSc Computer Science, University of Leeds, 2017"),
    para("Technical Skills", { style: "Heading1" }),
    para("Node.js, TypeScript, PostgreSQL, Kafka, Redis, Docker"),
  ].join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:color w:val="2D5A3D"/><w:sz w:val="28"/></w:rPr></w:style>
</w:styles>`);
  zip.file("word/numbering.xml", `<?xml version="1.0" encoding="UTF-8"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="–"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

const cleanups = [];
try {
  const browser = await launchBrowser((cleanup) => cleanups.push(cleanup));
  const page = await browser.newPage();
  for (const [name, html] of Object.entries({ "serif-centered": serifCentered, "sidebar-two-columns": sidebarTwoColumns, "left-sans": leftSans })) {
    await page.setContent(html, { waitUntil: "load" });
    // The photo: a real raster image (PNG), drawn in the page so the PDF embeds a picture
    await page.evaluate(() => {
      const img = document.getElementById("photo");
      if (!img) return;
      const canvas = Object.assign(document.createElement("canvas"), { width: 120, height: 120 });
      const context = canvas.getContext("2d");
      context.fillStyle = "#c9b8a6";
      context.fillRect(0, 0, 120, 120);
      context.fillStyle = "#7d6a58";
      context.beginPath();
      context.arc(60, 48, 26, 0, Math.PI * 2);
      context.fill();
      img.src = canvas.toDataURL("image/png");
      return new Promise((resolve) => (img.complete ? resolve() : (img.onload = resolve)));
    });
    await page.pdf({ path: path.join(DIR, `${name}.pdf`), preferCSSPageSize: true, printBackground: true });
    console.log(`${name}.pdf`);
  }
  fs.writeFileSync(path.join(DIR, "garamond-headings.docx"), await docx());
  console.log("garamond-headings.docx");
} finally {
  for (const cleanup of cleanups) await cleanup();
}
