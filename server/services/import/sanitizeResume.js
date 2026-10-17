// Turns any parsed data (from the AI or the rule-based parser) into a clean object
// that matches the Resume model exactly:
//   - only known fields are kept (anything else is dropped)
//   - every value is a trimmed string
//   - empty entries are removed and skills are de-duplicated
// The size limits are deliberately generous: they only exist to stop absurd input
// (e.g. a 5 MB wall of text), never to cut off a real multi-page resume.

const LIMITS = {
  experience: 100,
  bulletsPerJob: 100,
  education: 50,
  skills: 300,
  projects: 100,
  additionalSections: 50,
  itemsPerSection: 200,
};

// Any value -> trimmed string of at most `max` characters ("" if it isn't a string)
const str = (value, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Any value -> array (of at most `max` items), [] if it isn't an array
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);

// A list of strings -> trimmed, non-empty strings
const stringList = (value, max, maxLength) => list(value, max).map((item) => str(item, maxLength)).filter(Boolean);

const hasAnyValue = (entry) => Object.values(entry).some((value) => (Array.isArray(value) ? value.length : value));

export default function sanitizeResume(data = {}) {
  const info = data.personalInfo ?? {};

  const skills = [];
  const seenSkills = new Set();
  for (const skill of stringList(data.skills, LIMITS.skills, 100)) {
    if (!seenSkills.has(skill.toLowerCase())) {
      seenSkills.add(skill.toLowerCase());
      skills.push(skill);
    }
  }

  return {
    personalInfo: {
      fullName: str(info.fullName, 150),
      headline: str(info.headline, 200),
      email: str(info.email, 254),
      phone: str(info.phone, 50),
      location: str(info.location, 150),
      linkedin: str(info.linkedin, 300),
      github: str(info.github, 300),
    },
    summary: str(data.summary, 10000),

    experience: list(data.experience, LIMITS.experience)
      .map((job) => ({
        company: str(job?.company, 200),
        role: str(job?.role, 200),
        startDate: str(job?.startDate, 50),
        endDate: str(job?.endDate, 50),
        bullets: stringList(job?.bullets, LIMITS.bulletsPerJob, 2000),
      }))
      .filter(hasAnyValue),

    education: list(data.education, LIMITS.education)
      .map((entry) => ({
        school: str(entry?.school, 300),
        degree: str(entry?.degree, 300),
        year: str(entry?.year, 50),
      }))
      .filter(hasAnyValue),

    skills,

    projects: list(data.projects, LIMITS.projects)
      .map((project) => ({
        name: str(project?.name, 200),
        description: str(project?.description, 5000),
        link: str(project?.link, 300),
      }))
      .filter(hasAnyValue),

    // Certifications, languages, awards... anything that doesn't fit the sections above
    additional: list(data.additional, LIMITS.additionalSections)
      .map((section) => ({
        heading: str(section?.heading, 100),
        items: stringList(section?.items, LIMITS.itemsPerSection, 1000),
      }))
      .filter((section) => section.items.length > 0),
  };
}
