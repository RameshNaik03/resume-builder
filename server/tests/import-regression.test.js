// Regression test for the rule-based import parser (services/import/parseWithRules.js).
//
// The fixtures are the extracted text of a real CV, anonymised (fictional name, contact
// details, employers, schools and project names; every replacement has the same length, so
// line lengths match the original). The same CV in two orders:
//   cv-extracted-raw-order.txt     - the PDF's own text order: all bold title lines (jobs,
//                                    projects, degrees) come first, above the name
//   cv-extracted-reading-order.txt - top-to-bottom page order, what the importer extracts
//
// Run: pnpm test:import-regression (in server/)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import parseWithRules, { headingOf } from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";

const read = (name) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const JOBS = [
  { role: "Full Stack Developer Intern", company: "Orbit Labs", startDate: "Mar 2026", endDate: "Oct 2026", firstBullet: "DevAssist Pro", lastBullet: "Diagnosed and resolved bugs" },
  { role: "Front-End Developer", company: "Contoso Learning Labs Pvt. Ltd.", startDate: "Apr 2023", endDate: "Mar 2024", firstBullet: "Developed responsive front-end templates", lastBullet: "Worked closely with backend developers" },
];
const DEGREES = [
  { degree: "MSc Information Technology", school: "Munich School of Business and Technology (MSBT)", year: "Feb 2025 – Present" },
  { degree: "B.Tech Electronics and Communication Engineering", school: "ABC Institute of Technology", year: "Jul 2019 – Jul 2023" },
];
const PROJECTS = [
  { name: "Bazaaro — E-Commerce Platform", description: "Angular, TypeScript, NgRx, RxJS, Node.js, Strapi Built core shopping features" },
  { name: "Employee Management System (EMS)", description: "HTML5, CSS3, Bootstrap, Node.js Developed a responsive admin panel" },
];

for (const [order, file] of [
  ["raw order", "cv-extracted-raw-order.txt"],
  ["reading order", "cv-extracted-reading-order.txt"],
]) {
  describe(`CV in ${order}`, () => {
    const parsed = parseWithRules(read(file));
    const resume = sanitizeResume(parsed);
    const bullets = resume.experience.flatMap((job) => job.bullets);

    it("reads the name and contact details", () => {
      assert.equal(resume.personalInfo.fullName, "ARJUNA DEVA RAGHUNATHA");
      assert.equal(resume.personalInfo.email, "a.deva.resume@example.org");
      assert.equal(resume.personalInfo.phone, "+49 000 0000 0000");
    });

    it("finds both jobs with their titles, companies and dates", () => {
      assert.deepEqual(
        resume.experience.map(({ role, company, startDate, endDate }) => ({ role, company, startDate, endDate })),
        JOBS.map(({ role, company, startDate, endDate }) => ({ role, company, startDate, endDate }))
      );
    });

    it("finds both degrees with their schools and dates", () => {
      assert.deepEqual(resume.education, DEGREES);
    });

    it("finds both projects, each with its own description", () => {
      assert.deepEqual(resume.projects.map((p) => p.name), PROJECTS.map((p) => p.name));
      PROJECTS.forEach((project, i) => assert.ok(resume.projects[i].description.startsWith(project.description), resume.projects[i].description));
    });

    it("never moves experience bullets into Projects", () => {
      const projectText = resume.projects.map((p) => `${p.name} ${p.description}`).join(" ");
      assert.doesNotMatch(projectText, /SEO best practices|clean-code standards|Delivered two production projects/);
    });

    it("never splits inside brackets and joins wrapped lines", () => {
      assert.ok(bullets.some((b) => b.includes("(React, Node.js, Express.js, MongoDB)")));
      assert.ok(bullets.some((b) => b.endsWith("an e-commerce platform (see Projects).")));
      assert.ok(bullets.some((b) => b.endsWith("consistency across screens.")));
      assert.ok(!bullets.includes("screens."));
    });

    it("keeps skill category labels out of the skills", () => {
      assert.ok(!resume.skills.some((s) => /^(Languages|Frontend|Backend|Databases|Security|Cloud & Tools|Core Concepts) /.test(s)), resume.skills.join(" | "));
      for (const skill of ["JavaScript", "React.js", "Node.js", "Authentication", "Git", "Data Structures & Algorithms"]) {
        assert.ok(resume.skills.includes(skill), skill);
      }
      assert.ok(resume.skills.includes("MongoDB (schema design, query optimization)"));
      assert.ok(resume.skills.includes("AWS / Azure / GCP (fundamentals)"));
    });

    it("keeps the Languages section", () => {
      assert.ok(resume.additional.some((a) => a.heading === "Languages" && a.items[0].startsWith("English (Fluent)")));
    });

    if (order === "reading order") {
      it("keeps each job's bullets with that job", () => {
        JOBS.forEach((job, i) => {
          const own = resume.experience[i].bullets;
          assert.ok(own[0].startsWith(job.firstBullet), own[0]);
          assert.ok(own.at(-1).startsWith(job.lastBullet), own.at(-1));
        });
        assert.deepEqual(resume.experience.map((job) => job.bullets.length), [7, 5]);
      });

      it("doesn't ask the user to check the bullets", () => {
        assert.equal(parsed.notes.experienceBulletsUnassigned, false);
      });
    } else {
      // From the text alone it's unknowable where job 2's bullets start: none are guessed
      it("keeps the bullets together under the first job instead of guessing", () => {
        assert.deepEqual(resume.experience.map((job) => job.bullets.length), [12, 0]);
      });

      it("asks the user to check which bullets belong to which job", () => {
        assert.equal(parsed.notes.experienceBulletsUnassigned, true);
      });
    }
  });
}

describe("headingOf", () => {
  it("doesn't take the end of a wrapped sentence for a heading", () => {
    assert.equal(headingOf("Projects)."), null);
  });

  it("still recognises real headings", () => {
    assert.equal(headingOf("PROFESSIONAL EXPERIENCE"), "experience");
    assert.equal(headingOf("Technical Skills:"), "skills");
    assert.equal(headingOf("Skills & Tools"), "skills");
  });
});
