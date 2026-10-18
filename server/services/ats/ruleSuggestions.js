// Simple checks on the resume text that don't need AI.
// Each suggestion: { title, detail, priority: "high" | "medium" | "low" }

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const HEADINGS = {
  Experience: /^(?:work |professional |relevant )?(?:experience|employment(?: history)?|work history)\b/im,
  Education: /^(?:education|academic background|qualifications)\b/im,
  Skills: /^(?:(?:technical |core |key )?skills|competencies|technologies)\b/im,
};
const BULLET_LINE = /^\s*(?:[•●▪◦*-]|\d+[.)])\s+/;

export default function ruleSuggestions(resumeText, keywords) {
  const suggestions = [];
  const add = (priority, title, detail) => suggestions.push({ priority, title, detail });

  const missingSkills = keywords.missing.filter((k) => k.type === "skill");
  if (missingSkills.length) {
    const names = missingSkills.slice(0, 6).map((k) => k.term).join(", ");
    add(
      "high",
      "Add the skills this job asks for",
      `The job description mentions ${names}, but your resume doesn't. If you have these skills, name them in your Skills section and show them in a bullet point. Don't add skills you don't have.`
    );
  }

  const missingKeywords = keywords.missing.filter((k) => k.type === "keyword");
  if (missingKeywords.length >= 3) {
    add(
      "medium",
      "Mirror the job's wording",
      `Terms like "${missingKeywords.slice(0, 4).map((k) => k.term).join('", "')}" come up in the posting. Where they honestly describe your work, use the same words, since many ATS systems match exact terms.`
    );
  }

  if (!EMAIL.test(resumeText)) {
    add("high", "Add your email address", "We couldn't find an email address. Recruiters and ATS systems need it to contact you.");
  }
  if (!PHONE.test(resumeText)) {
    add("medium", "Add a phone number", "We couldn't find a phone number. Put it next to your email at the top.");
  }

  const missingHeadings = Object.entries(HEADINGS)
    .filter(([, pattern]) => !pattern.test(resumeText))
    .map(([name]) => name);
  if (missingHeadings.length) {
    add(
      "medium",
      "Use standard section headings",
      `We couldn't find a clear ${missingHeadings.join(", ")} heading. ATS systems look for common names like "Experience", "Education" and "Skills" to sort your information.`
    );
  }

  const bullets = resumeText.split("\n").filter((line) => BULLET_LINE.test(line));
  const quantified = bullets.filter((line) => /\d|%|\$|€|£|₹/.test(line));
  if (bullets.length >= 4 && quantified.length / bullets.length < 0.3) {
    add(
      "medium",
      "Show results with numbers",
      `Only ${quantified.length} of your ${bullets.length} bullet points include a number. Add measurable results where you can, such as time saved, users served, revenue or percentages.`
    );
  }

  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 200) {
    add("medium", "Add more detail", `Your resume has about ${wordCount} words. Most strong resumes have 400–800, with a few bullet points per role.`);
  } else if (wordCount > 1200) {
    add("low", "Consider trimming", `Your resume has about ${wordCount} words. Aim for one or two pages and keep the most relevant experience.`);
  }

  if (keywords.score < 50) {
    add(
      "low",
      "Tailor your summary to this role",
      "Your match is low. A short summary at the top that uses the job title and two or three of its key skills helps both the ATS and the recruiter."
    );
  }

  return suggestions;
}
