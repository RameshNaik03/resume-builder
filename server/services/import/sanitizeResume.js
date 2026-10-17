// Turns any parsed data (from the AI or the rule-based parser) into a clean object
// that matches the Resume model exactly:
//   - only known fields are kept (anything else is dropped)
//   - every value is a trimmed string with a maximum length
//   - lists are capped, empty entries are removed, skills are de-duplicated

const LIMITS = {
  experience: 15,
  bulletsPerJob: 10,
  education: 10,
  skills: 50,
  projects: 15,
};

// Any value -> trimmed string of at most `max` characters ("" if it isn't a string)
const str = (value, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Any value -> array (of at most `max` items), [] if it isn't an array
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);

const hasAnyValue = (entry) => Object.values(entry).some((value) => (Array.isArray(value) ? value.length : value));

export default function sanitizeResume(data = {}) {
  const info = data.personalInfo ?? {};

  const skills = [];
  const seenSkills = new Set();
  for (const skill of list(data.skills, LIMITS.skills * 2)) {
    const clean = str(skill, 50);
    if (clean && !seenSkills.has(clean.toLowerCase())) {
      seenSkills.add(clean.toLowerCase());
      skills.push(clean);
    }
  }

  return {
    personalInfo: {
      fullName: str(info.fullName, 100),
      headline: str(info.headline, 100),
      email: str(info.email, 254),
      phone: str(info.phone, 40),
      location: str(info.location, 100),
      linkedin: str(info.linkedin, 200),
      github: str(info.github, 200),
    },
    summary: str(data.summary, 2000),

    experience: list(data.experience, LIMITS.experience)
      .map((job) => ({
        company: str(job?.company, 100),
        role: str(job?.role, 100),
        startDate: str(job?.startDate, 30),
        endDate: str(job?.endDate, 30),
        bullets: list(job?.bullets, LIMITS.bulletsPerJob)
          .map((bullet) => str(bullet, 300))
          .filter(Boolean),
      }))
      .filter(hasAnyValue),

    education: list(data.education, LIMITS.education)
      .map((entry) => ({
        school: str(entry?.school, 150),
        degree: str(entry?.degree, 150),
        year: str(entry?.year, 30),
      }))
      .filter(hasAnyValue),

    skills: skills.slice(0, LIMITS.skills),

    projects: list(data.projects, LIMITS.projects)
      .map((project) => ({
        name: str(project?.name, 100),
        description: str(project?.description, 600),
        link: str(project?.link, 200),
      }))
      .filter(hasAnyValue),
  };
}
