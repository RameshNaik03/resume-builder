// A fictional, realistic resume for the dev template gallery (/dev/templates).
// It fills every section, including job subtitles and two "additional" sections, and is
// long enough that most layouts run onto a second page, so pagination can be compared too.

// Placeholder profile photo: a plain silhouette drawn as SVG (no text in it)
const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<rect width="120" height="120" fill="#cbd5e1"/>
<circle cx="60" cy="46" r="22" fill="#94a3b8"/>
<path d="M18 120c4-26 22-40 42-40s38 14 42 40z" fill="#94a3b8"/>
</svg>`;
const PHOTO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PHOTO_SVG)}`;

const GALLERY_RESUME = {
  title: "Template gallery",
  personalInfo: {
    fullName: "Priya Raman",
    headline: "Senior Frontend Engineer",
    email: "priya.raman@example.com",
    phone: "+1 415 555 0142",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/priyaraman",
    github: "github.com/priyaraman",
    photoUrl: PHOTO_URL,
  },
  summary:
    "<p>Frontend engineer with 7 years of experience building fast, accessible web products in React and TypeScript. Led the move to a shared design system at a 200-person fintech, and cares about performance budgets, testing and mentoring.</p>",
  experience: [
    {
      _id: "gallery-exp-1",
      role: "Senior Frontend Engineer",
      company: "Ledgerly",
      subtitle: "Ledgerly Pay, a B2B payments dashboard (React, TypeScript, GraphQL)",
      startDate: "Mar 2022",
      endDate: "Present",
      bullets: [
        "Led a team of 5 engineers rebuilding the payments dashboard, used by 40,000 businesses",
        "Cut the largest contentful paint from 4.1s to 1.6s with code splitting and image optimisation",
        "Built a shared component library of 60+ components, now used by 4 product teams",
        "Introduced visual regression tests, reducing UI bugs reaching production by 35%",
      ],
    },
    {
      _id: "gallery-exp-2",
      role: "Frontend Engineer",
      company: "Northwind Health",
      subtitle: "Patient booking portal (React, Redux, Node.js)",
      startDate: "Jun 2019",
      endDate: "Feb 2022",
      bullets: [
        "Shipped an online booking flow that grew self-service appointments from 20% to 65%",
        "Raised the portal's accessibility to WCAG 2.1 AA across 30 screens",
        "Mentored 3 junior developers through weekly pairing and code reviews",
      ],
    },
    {
      _id: "gallery-exp-3",
      role: "Web Developer",
      company: "Brightside Studio",
      startDate: "Jul 2017",
      endDate: "May 2019",
      bullets: [
        "Built 25+ marketing sites and e-commerce stores for small business clients",
        "Automated deployments with GitHub Actions, cutting release time from hours to minutes",
      ],
    },
  ],
  education: [
    { _id: "gallery-edu-1", degree: "M.S. in Computer Science", school: "San Jose State University", year: "2017" },
    { _id: "gallery-edu-2", degree: "B.Tech in Information Technology", school: "Anna University", year: "2015" },
  ],
  skills: [
    "React",
    "TypeScript",
    "JavaScript",
    "Next.js",
    "GraphQL",
    "Node.js",
    "Redux",
    "Tailwind CSS",
    "Jest",
    "Playwright",
    "Web Performance",
    "Accessibility",
  ],
  projects: [
    {
      _id: "gallery-proj-1",
      name: "Tidepool",
      description: "<p>Open-source React hook library for offline-first forms, with 1,200 GitHub stars.</p>",
      link: "github.com/priyaraman/tidepool",
    },
    {
      _id: "gallery-proj-2",
      name: "Budget Buddy",
      description: "<p>Personal finance PWA with charts and bank CSV import, built with Next.js and IndexedDB.</p>",
      link: "budgetbuddy.example.com",
    },
  ],
  additional: [
    { _id: "gallery-add-1", heading: "Certifications", items: ["AWS Certified Developer – Associate (2023)", "Google UX Design Certificate (2021)"] },
    { _id: "gallery-add-2", heading: "Languages", items: ["English (fluent)", "Tamil (native)", "Spanish (conversational)"] },
  ],
  design: {},
};

// Extra content for ?long=1: two more jobs and more skills, so every layout reaches a second
// page and two-column layouts get a long side column
const LONG_EXTRAS = {
  experience: [
    {
      _id: "gallery-exp-4",
      role: "Junior Web Developer",
      company: "Pixel & Co",
      startDate: "Jan 2016",
      endDate: "Jun 2017",
      bullets: [
        "Maintained WordPress and Shopify sites for 15 retail clients",
        "Introduced a shared Sass toolkit that halved the time to build a new client theme",
      ],
    },
    {
      _id: "gallery-exp-5",
      role: "IT Support Intern",
      company: "Chennai Software Park",
      startDate: "May 2014",
      endDate: "Dec 2015",
      bullets: ["Supported 120 staff across Windows and macOS", "Wrote internal guides that cut repeat tickets by 30%"],
    },
  ],
  skills: ["Storybook", "Cypress", "Figma", "Webpack", "Vite", "AWS", "Docker", "CI/CD", "Design Systems", "Mentoring"],
  additional: [{ _id: "gallery-add-3", heading: "Awards", items: ["Ledgerly Engineering Excellence Award (2023)", "Hackathon winner, SF DevFest (2019)"] }],
};

// The gallery resume for one template, with or without the photo
//   long - add LONG_EXTRAS
export default function galleryResume(templateId, withPhoto = true, long = false) {
  const base = long
    ? {
        ...GALLERY_RESUME,
        experience: [...GALLERY_RESUME.experience, ...LONG_EXTRAS.experience],
        skills: [...GALLERY_RESUME.skills, ...LONG_EXTRAS.skills],
        additional: [...GALLERY_RESUME.additional, ...LONG_EXTRAS.additional],
      }
    : GALLERY_RESUME;
  return {
    ...base,
    template: templateId,
    personalInfo: { ...GALLERY_RESUME.personalInfo, photoUrl: withPhoto ? PHOTO_URL : "" },
  };
}
