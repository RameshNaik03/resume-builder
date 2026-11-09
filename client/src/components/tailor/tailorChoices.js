// The Tailor page's options as data: the strengths, the starting choices for a resume and job
// (from POST /api/jobs/options), and the choices as POST /api/jobs/tailor's options.

export const STRENGTHS = [
  { value: "light", label: "Light", hint: "Headline and summary only; bullets are reordered, not reworded" },
  { value: "balanced", label: "Balanced", hint: "Also rewords the most relevant half of your bullets" },
  { value: "strong", label: "Strong", hint: "Rewords every bullet that relates to the job" },
];
export const BULLET_LIMITS = [3, 4, 5, 6, 8];
const DEFAULT_FEATURED = 8;

// The starting choices for a resume and job
//   defaults - the account's preferences ({ language }, Settings > Preferences)
export function initialChoices(options, previous = {}, defaults = {}) {
  const available = options.skills.map((entry) => entry.skill);
  // Keep the user's order and picks where they still apply (the analysis can change)
  const kept = (previous.skillOrder ?? []).filter((skill) => available.includes(skill));
  const skillOrder = [...kept, ...available.filter((skill) => !kept.includes(skill))];
  const maxFeatured = Math.min(previous.maxFeatured ?? DEFAULT_FEATURED, options.maxFeatured);
  const featured = previous.featured ? previous.featured.filter((skill) => available.includes(skill)) : skillOrder.slice(0, maxFeatured);
  return {
    strength: previous.strength ?? "balanced",
    skillOrder,
    featured,
    maxFeatured,
    excludedProjects: (previous.excludedProjects ?? []).filter((name) => options.projects.some((project) => project.name === name)),
    maxBulletsPerJob: previous.maxBulletsPerJob ?? null,
    template: previous.template ?? null,
    language: previous.language ?? defaults.language ?? "en",
    fitOnePage: previous.fitOnePage ?? true,
    title: previous.titleEdited ? previous.title : options.suggestedTitle,
    titleEdited: previous.titleEdited ?? false,
  };
}

// The choices as the server's options
export const toRequestOptions = (choices) => ({
  strength: choices.strength,
  featuredSkills: choices.skillOrder.filter((skill) => choices.featured.includes(skill)).slice(0, choices.maxFeatured),
  excludedProjects: choices.excludedProjects,
  maxBulletsPerJob: choices.maxBulletsPerJob,
  template: choices.template,
  language: choices.language,
  fitOnePage: choices.fitOnePage,
});

// How many bullets a per-job limit would hide (beyond the limit, showing nothing the job asks for)
export const bulletsHidden = (jobs, limit) => (limit ? jobs.reduce((sum, job) => sum + job.scores.slice(limit).filter((score) => score === 0).length, 0) : 0);
