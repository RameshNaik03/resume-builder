import resumeToText from "../ats/resumeToText.js";

// "How this version differs": a tailored resume's changes counted by type, how much of its text
// changed, and, when it's nearly the same as the base resume, why.
//   changes - the tailoring's changes (services/jobs/tailorResume.js)
//   context - { aiUsed, strength, rejected, skillsShown, jobSkills }
// Returns { byType: [{ type, label, count }], changedShare, nearlyIdentical, reasons }

// Less than this share of words changed (reordering doesn't count) = nearly identical
export const NEARLY_IDENTICAL = 0.06;

const TYPES = [
  ["headline", "Headline changed", (c) => c.op.kind === "personalInfo" && c.op.field === "headline"],
  ["summary", "Summary rewritten", (c) => c.op.kind === "summary"],
  ["bulletsReworded", "Bullets reworded", (c) => c.op.kind === "bullet"],
  ["bulletsReordered", "Jobs with bullets reordered", (c) => c.op.kind === "bulletOrder"],
  ["bulletsHidden", "Bullets hidden", (c) => c.op.kind === "hideBullets", (c) => c.op.bullets.length],
  ["skillsAdded", "Skills added (already shown in your resume)", (c) => c.op.kind === "addSkill"],
  ["skillsReordered", "Skills reordered", (c) => c.op.kind === "skillOrder"],
  ["projectsReordered", "Projects reordered", (c) => c.op.kind === "projectOrder"],
  ["projectsExcluded", "Projects left out", (c) => c.op.kind === "removeProject"],
  ["sectionOrder", "Projects moved before Experience", (c) => c.op.kind === "design" && c.op.key === "sectionOrder"],
  ["language", "Section headings in German", (c) => c.op.kind === "design" && c.op.key === "sectionHeadings"],
  ["layout", "Template changed", (c) => c.op.kind === "layout"],
  ["fitOnePage", "Fit to one page changed", (c) => c.op.kind === "design" && c.op.key === "fitOnePage"],
];

// Share of words that differ between two texts, ignoring order (0 = same words, 1 = none shared)
export function changedShare(before, after) {
  const count = (text) => {
    const counts = new Map();
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.+#-]*/gu) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
    return counts;
  };
  const a = count(before);
  const b = count(after);
  let total = 0;
  let different = 0;
  for (const word of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(word) ?? 0;
    const y = b.get(word) ?? 0;
    total += x + y;
    different += Math.abs(x - y);
  }
  return total ? different / total : 0;
}

export default function describeDifferences(changes, original, tailored, { aiUsed, strength, rejected = 0, skillsShown = 0, jobSkills = 0 } = {}) {
  const byType = TYPES.map(([type, label, matches, size = () => 1]) => ({ type, label, count: changes.filter(matches).reduce((sum, c) => sum + size(c), 0) })).filter(
    (entry) => entry.count > 0
  );
  const share = changedShare(resumeToText(original), resumeToText(tailored));
  const nearlyIdentical = share < NEARLY_IDENTICAL;
  const reasons = [];
  if (nearlyIdentical) {
    if (!aiUsed) reasons.push("AI is off, so only reordering and small wording fixes were possible.");
    else if (strength === "light") reasons.push("The strength was Light, so no bullets were reworded.");
    if (rejected > 0) reasons.push(`${rejected} AI ${rejected === 1 ? "rewrite was" : "rewrites were"} dropped by the safety check (they added something your resume doesn't show).`);
    if (jobSkills > 0 && skillsShown / jobSkills < 0.4) reasons.push(`Your resume shows only ${skillsShown} of the job's ${jobSkills} skills, so there's little it can lead with.`);
    if (!reasons.length) reasons.push("Your resume already matches this job closely, so little needed to change.");
  }
  return { byType, changedShare: Math.round(share * 1000) / 1000, nearlyIdentical, reasons };
}
