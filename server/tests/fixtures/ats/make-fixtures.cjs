// Builds the test resumes for the ATS tests: HTML files (printed to PDF afterwards) and DOCX files.
// Every person, employer and contact detail here is fictional (example.com addresses,
// 555-01xx and placeholder phone numbers).
//
// Run (from server/):  node tests/fixtures/ats/make-fixtures.cjs <output folder>
// Then print each HTML file to PDF with headless Chrome or Edge, without headers/footers
// (so no file path ends up in the PDF), for example:
//   msedge --headless --no-pdf-header-footer --print-to-pdf=weak.pdf weak.html
// Copy the PDFs/DOCX files the tests use into this folder.
const fs = require("fs");
const path = require("path");
const [dir] = process.argv.slice(2);
const JSZip = require("jszip");

const css = "body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.35;margin:0;padding:16mm 18mm} h1{font-size:20pt;margin:0} h2{font-size:12pt;border-bottom:1px solid #999;margin:14px 0 6px} ul{margin:4px 0 8px;padding-left:18px} p{margin:2px 0}";
const page = (body, extraCss = "") => `<html><head><meta charset="utf-8"><style>${css}${extraCss}</style></head><body>${body}</body></html>`;

const GOOD_JOBS = `
<h2>EXPERIENCE</h2>
<p><b>Senior Frontend Engineer</b> | Acme Corp | Jan 2022 – Present</p>
<ul><li>Led migration of a 200k-line React codebase to TypeScript, cutting runtime errors by 35%</li>
<li>Built a component library used by 6 product teams, reducing UI development time by 25%</li>
<li>Mentored 4 junior engineers and introduced code review guidelines adopted company-wide</li></ul>
<p><b>Frontend Developer</b> | Globex | Jun 2019 – Dec 2021</p>
<ul><li>Developed a customer dashboard in React and Redux serving 50,000 monthly users</li>
<li>Improved Lighthouse performance score from 62 to 95 by optimizing images and bundle size</li>
<li>Implemented automated testing with Jest and Cypress, raising coverage to 80%</li></ul>
<p><b>Web Developer Intern</b> | Initech | Jan 2019 – May 2019</p>
<ul><li>Created 12 responsive landing pages with HTML, CSS and JavaScript for marketing campaigns</li></ul>`;
const GOOD_REST = `
<h2>EDUCATION</h2><p>B.Tech in Computer Science, Pune University, 2015 – 2019</p>
<h2>SKILLS</h2><p>JavaScript, TypeScript, React, Redux, Node.js, Express, HTML, CSS, Tailwind CSS, Jest, Cypress, Git, AWS, Docker, REST APIs, GraphQL</p>
<h2>PROJECTS</h2><p><b>ShopEase</b> – E-commerce app built with React, Node.js and MongoDB handling 1,000 orders a month</p>`;
const CONTACT = `<h1>Priya Sharma</h1><p>Senior Frontend Engineer</p><p>priya.sharma@example.com | +91 98765 43210 | Pune, India | linkedin.com/in/priyasharma</p>`;
const SUMMARY = `<h2>SUMMARY</h2><p>Frontend engineer with 6 years of experience building fast, accessible React applications for SaaS products used by thousands of customers.</p>`;

const html = {
  clean: page(CONTACT + SUMMARY + GOOD_JOBS + GOOD_REST),

  twocol: page(`${CONTACT}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12mm">
    <div>${SUMMARY}${GOOD_JOBS}</div><div>${GOOD_REST}<h2>CERTIFICATIONS</h2><p>AWS Certified Developer – Associate, issued by Amazon Web Services in 2023</p><p>Google UX Design Professional Certificate from Coursera in 2021</p></div></div>`),

  sidebar: page(`<div style="display:flex;gap:10mm"><div style="width:55mm;background:#eef">
    <h1 style="font-size:16pt">Priya Sharma</h1><p>priya.sharma@example.com</p><p>+91 98765 43210</p><p>Pune, India</p>
    <h2>SKILLS</h2><p>JavaScript</p><p>TypeScript</p><p>React</p><p>Redux</p><p>Node.js</p><p>Jest</p><p>Cypress</p><p>AWS</p><p>Docker</p><p>GraphQL</p>
    <h2>EDUCATION</h2><p>B.Tech Computer Science</p><p>Pune University</p><p>2015 – 2019</p><h2>LANGUAGES</h2><p>English</p><p>Hindi</p><p>Marathi</p></div>
    <div style="flex:1">${SUMMARY}${GOOD_JOBS}</div></div>`, "body{padding:10mm}"),

  table: page(`${CONTACT}${SUMMARY}<h2>EXPERIENCE</h2><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
    <tr><th>Company</th><th>Role</th><th>Dates</th><th>Highlights</th></tr>
    <tr><td>Acme Corp</td><td>Senior Frontend Engineer</td><td>Jan 2022 – Present</td><td>Led migration to TypeScript, cutting runtime errors by 35%</td></tr>
    <tr><td>Globex</td><td>Frontend Developer</td><td>Jun 2019 – Dec 2021</td><td>Developed a React dashboard serving 50,000 monthly users</td></tr>
    <tr><td>Initech</td><td>Web Developer Intern</td><td>Jan 2019 – May 2019</td><td>Created 12 responsive landing pages</td></tr></table>${GOOD_REST}`),

  headerfooter: page(`<div style="position:fixed;top:0;left:0;right:0;height:12mm;font-size:9pt;text-align:center;padding-top:4mm">Priya Sharma · priya.sharma@example.com · +91 98765 43210</div>
    <div style="position:fixed;bottom:0;left:0;right:0;height:10mm;font-size:8pt;text-align:center">Confidential resume – Priya Sharma</div>
    <h1>Priya Sharma</h1><p>Senior Frontend Engineer</p>${SUMMARY}${GOOD_JOBS}${GOOD_JOBS.replace(/Acme Corp/g, "Umbrella").replace(/Globex/g, "Hooli").replace("EXPERIENCE", "EARLIER EXPERIENCE")}${GOOD_REST}${GOOD_REST.replace(/<h2>/g, "<h2>MORE ").replace("PROJECTS", "PROJECTS 2")}`, "body{padding:22mm 18mm}"),

  fonts: page(`<h1 style="font-family:Papyrus">Priya Sharma</h1><p style="font-family:'Comic Sans MS'"> priya.sharma@example.com  +91 98765 43210  Pune, India</p>
    <div style="font-family:'Comic Sans MS'">${SUMMARY}${GOOD_JOBS}</div><div style="font-family:Impact">${GOOD_REST}</div>`),

  weak: page(`<h1>Rahul Verma</h1><p>rahul.verma@example.com</p><p>+1 (415) 555-0199</p>
    <h2>MY JOURNEY</h2>
    <p><b>Operations Assistant</b> | Zomato | 03/2017 – 08/2018</p>
    <ul><li>I was responsible for managing the daily reports and I managed the the team schedules</li>
    <li>Hard-working team player who managed many different tasks across the operations function on a daily basis and also managed vendor relationships and managed escalations and helped with anything else that was needed by the wider team</li>
    <li>Managed stuff</li></ul>
    <p><b>Senior Operations Manager</b> | Flipkart | January 2021 – Present</p>
    <ul><li>Responsible for managing a team of people and I managed the budgett for the department</li>
    <li>Results-driven go-getter who thinks outside the box</li></ul>
    <p><b>Operations Analyst</b> | Swiggy | Sep 2018 – Dec 2020</p>
    <ul><li>Worked on various projects and managed relationships with partners</li></ul>
    <h2>EDUCATION</h2><p>MBA, University of Mumbai, 2016</p>
    <h2>SKILLS</h2><p>Communication, Teamwork, Excel</p>
    ${Array.from({ length: 34 }, (_, i) => `<p>Additional responsibility number ${i + 1}: managed and coordinated various tasks and activities as required by management.</p>`).join("")}`),

  image: page(`<h1>Arjun Mehta</h1><p>arjun@example.com</p><canvas id="c" width="700" height="900"></canvas>
    <script>const x=document.getElementById('c').getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,700,900);x.fillStyle='#222';x.font='16px Arial';
    for(let i=0;i<40;i++){x.fillText('Experience line '+(i+1)+' – built systems and improved results by '+(i+5)+'%',20,30+i*21);}</script>`),
};
for (const [name, content] of Object.entries(html)) fs.writeFileSync(path.join(dir, `${name}.html`), content);

// ---------- DOCX ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const para = (text, { bold = false, font } = {}) =>
  `<w:p><w:r><w:rPr>${font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>` : ""}${bold ? "<w:b/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';

async function docx(name, { body, header, cols, pages }) {
  const zip = new JSZip();
  const rels = [`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`];
  if (pages) rels.push(`<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>`);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${header ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
  if (pages) zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Pages>${pages}</Pages></Properties>`);
  const sect = `<w:sectPr>${header ? '<w:headerReference w:type="default" r:id="rIdH"/>' : ""}${cols ? `<w:cols w:num="${cols}" w:space="720"/>` : ""}</w:sectPr>`;
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${body}${sect}</w:body></w:document>`);
  if (header) {
    zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`);
    zip.file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${W}>${header}</w:hdr>`);
  }
  fs.writeFileSync(path.join(dir, `${name}.docx`), await zip.generateAsync({ type: "nodebuffer" }));
}

const docxJobs = [
  para("EXPERIENCE", { bold: true }),
  para("Senior Frontend Engineer | Acme Corp | Jan 2022 – Present", { bold: true }),
  para("• Led migration of a React codebase to TypeScript, cutting runtime errors by 35%"),
  para("• Built a component library used by 6 product teams, reducing UI development time by 25%"),
  para("Frontend Developer | Globex | Jun 2019 – Dec 2021", { bold: true }),
  para("• Developed a customer dashboard in React serving 50,000 monthly users"),
  para("• Improved page load time by 40% by optimizing images and bundle size"),
].join("");
const docxRest = [
  para("EDUCATION", { bold: true }), para("B.Tech in Computer Science, Pune University, 2015 – 2019"),
  para("SKILLS", { bold: true }), para("JavaScript, TypeScript, React, Redux, Node.js, Jest, Git, AWS, Docker, GraphQL"),
].join("");
const docxSummary = para("SUMMARY", { bold: true }) + para("Frontend engineer with 6 years of experience building fast, accessible React applications for SaaS products.");
const table = `<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Acme Corp</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Senior Frontend Engineer, Jan 2022 – Present</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Globex</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Frontend Developer, Jun 2019 – Dec 2021</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
const textBox = `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:txbx><w:txbxContent>${para("Certifications: AWS Certified Developer")}</w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r></w:p>`;

(async () => {
  await docx("clean-docx", { body: para("Priya Sharma", { bold: true }) + para("priya.sharma@example.com | +91 98765 43210 | Pune, India") + docxSummary + docxJobs + docxRest, pages: 1 });
  await docx("header-table-docx", {
    header: para("Priya Sharma · priya.sharma@example.com · +91 98765 43210"),
    body: para("Priya Sharma", { bold: true }) + docxSummary + para("EXPERIENCE", { bold: true }) + table + docxRest, pages: 1,
  });
  await docx("columns-textbox-docx", { body: para("Priya Sharma", { bold: true, font: "Papyrus" }) + para("priya.sharma@example.com | +91 98765 43210") + docxSummary + docxJobs + docxRest + textBox, cols: 2, pages: 1 });
  console.log("fixtures written:", fs.readdirSync(dir).filter((f) => /\.(html|docx)$/.test(f)).join(", "));
})();
