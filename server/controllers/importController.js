import Resume from "../models/Resume.js";
import extractText from "../services/import/extractText.js";
import parseWithAI, { isAIEnabled } from "../services/import/parseWithAI.js";
import parseWithRules from "../services/import/parseWithRules.js";
import sanitizeResume from "../services/import/sanitizeResume.js";

const IMPORT_TEMPLATE = "classic-navy"; // "Classic Navy"

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

  // 2. Text -> resume data: Claude if configured, otherwise (or if it fails) the rule-based parser
  let parsed = null;
  let parsedWith = "rules";
  if (isAIEnabled()) {
    parsed = await parseWithAI(text);
    if (parsed) parsedWith = "ai";
  }
  parsed ??= parseWithRules(text);

  // 3. Clean it up and save it as a new resume for this user
  const resume = await Resume.create({
    ...sanitizeResume(parsed),
    title: titleFromFileName(req.file.originalname),
    template: IMPORT_TEMPLATE,
    userId: req.user._id,
  });

  res.status(201).json({ resume, parsedWith });
};
