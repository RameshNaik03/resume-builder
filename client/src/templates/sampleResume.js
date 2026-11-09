// Example content for template thumbnails.
// A new resume is mostly empty, which would make every thumbnail look like a blank page,
// so any section the user hasn't filled in yet is borrowed from here.
// (Only used for thumbnails, never for the real preview or the PDF.)

const SAMPLE = {
  personalInfo: {
    fullName: "Alex Morgan",
    headline: "Full Stack Developer",
    email: "alex.morgan@email.com",
    phone: "+1 555 123 4567",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/alexmorgan",
    github: "github.com/alexmorgan",
  },
  summary:
    "Full stack developer with 3 years of experience building fast, accessible web apps with React and Node.js. Enjoys turning complex problems into simple, well-tested products.",
  experience: [
    {
      _id: "sample-exp-1",
      role: "Software Engineer",
      company: "Brightline Labs",
      startDate: "Mar 2023",
      endDate: "Present",
      bullets: [
        "Built a customer dashboard in React used by 12,000+ users",
        "Cut API response times by 40% by adding caching and indexes",
        "Mentored two junior developers and led weekly code reviews",
      ],
    },
    {
      _id: "sample-exp-2",
      role: "Frontend Developer Intern",
      company: "Nova Digital",
      startDate: "Jun 2022",
      endDate: "Dec 2022",
      bullets: [
        "Rebuilt the marketing site with a reusable component library",
        "Improved Lighthouse accessibility score from 72 to 98",
      ],
    },
  ],
  education: [
    { _id: "sample-edu-1", school: "University of Texas", degree: "B.S. Computer Science", year: "2019 – 2023" },
  ],
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "Express", "MongoDB", "SQL", "Tailwind CSS", "Git"],
  projects: [
    {
      _id: "sample-proj-1",
      name: "TaskFlow",
      description: "Real-time team task board with drag-and-drop, built with React, Socket.io and MongoDB.",
      link: "github.com/alexmorgan/taskflow",
    },
  ],
};

// The full example resume (a fictional person), also used by the landing page
export const SAMPLE_RESUME = SAMPLE;

const CONTACT_FIELDS = ["email", "phone", "location", "linkedin", "github", "website"];

// True if no entry in the list has any of these fields filled in
const isEmptyList = (list, fields) => !(list ?? []).some((item) => fields.some((field) => item[field]?.trim()));

export default function withSampleContent(resume) {
  const info = resume.personalInfo ?? {};
  const hasContactInfo = CONTACT_FIELDS.some((field) => info[field]?.trim());

  return {
    ...resume,
    personalInfo: {
      // Use the user's contact details if they've entered any, otherwise all sample ones
      ...(hasContactInfo ? info : SAMPLE.personalInfo),
      fullName: info.fullName?.trim() || SAMPLE.personalInfo.fullName,
      photoUrl: info.photoUrl ?? "", // The user's own photo (thumbnails never use a sample photo)
      headline: info.headline?.trim() || SAMPLE.personalInfo.headline,
    },
    summary: resume.summary?.trim() ? resume.summary : SAMPLE.summary,
    experience: isEmptyList(resume.experience, ["role", "company"]) ? SAMPLE.experience : resume.experience,
    education: isEmptyList(resume.education, ["school", "degree"]) ? SAMPLE.education : resume.education,
    skills: (resume.skills ?? []).some((skill) => skill.trim()) ? resume.skills : SAMPLE.skills,
    projects: isEmptyList(resume.projects, ["name", "description"]) ? SAMPLE.projects : resume.projects,
  };
}
