import Resume from "../models/Resume.js";
import extractText from "../services/import/extractText.js";
import parseWithAI, { isAIEnabled } from "../services/import/parseWithAI.js";
import parseWithRules from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";

// TEMPORARY DEBUG LOGGING (multi-page imports) - remove once imports are confirmed working.
// Off in production, because it prints parts of the user's resume.
const DEBUG_IMPORT = process.env.NODE_ENV !== "production";

// "ramesh_naik-resume-2026.pdf" -> "ramesh naik resume 2026"
const titleFromFileName = (fileName) => {
  const title = fileName
    .replace(/\.[^.]+$/, "") // remove the extension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return title || "Imported Resume";
};

// POST /api/resumes/import (protected, multipart/form-data with a "file" field)
export const importResume = async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a PDF or DOCX file in a form field named "file"');
  }

  // 1. File -> plain text (throws 415/422 with a clear message if it can't)
  const text = await extractText(req.file);

  if (DEBUG_IMPORT) {
    console.log(`[import-debug] file="${req.file.originalname}" text length=${text.length}`);
    console.log("[import-debug] first 300 chars:", JSON.stringify(text.slice(0, 300)));
    console.log("[import-debug] last 300 chars:", JSON.stringify(text.slice(-300)));
  }

  // 2. Text -> resume data: Claude if configured, otherwise (or if it fails) the rule-based parser.
  //    parseWithAI throws a 422 if the resume is too long to parse completely.
  let parsed = null;
  let parsedWith = "rules";
  if (isAIEnabled()) {
    parsed = await parseWithAI(text);
    if (parsed) parsedWith = "ai";
  }
  parsed ??= parseWithRules(text);

  const data = sanitizeResume(parsed);

  if (DEBUG_IMPORT) {
    console.log(
      `[import-debug] parsedWith=${parsedWith}`,
      `experience=${data.experience.length} (bullets: ${data.experience.map((job) => job.bullets.length).join("/") || "-"})`,
      `education=${data.education.length} projects=${data.projects.length} skills=${data.skills.length}`,
      `additional=${data.additional.length} (${data.additional.map((s) => `${s.heading}:${s.items.length}`).join(", ") || "-"})`
    );
  }

  // 3. Save it as a new resume for this user. No template yet: the user picks one next.
  const resume = await Resume.create({
    ...data,
    title: titleFromFileName(req.file.originalname),
    template: null,
    userId: req.user._id,
  });

  res.status(201).json({ resume, parsedWith });
};
