// Fictional resumes for the "Fit to one page" tests (round trip and editor):
//   SLIGHTLY_LONG - a little over one page in Classic at its own settings; fits once fitted
//   VERY_LONG     - far too long for one page even at the smallest settings
// The extra jobs and their dates are made up; the oldest ones ended over 10 years ago.

const job = (role, company, startDate, endDate, bullets) => ({ role, company, startDate, endDate, bullets });

const BASE = {
  personalInfo: {
    fullName: "Meera Iyer",
    headline: "Senior Backend Engineer",
    email: "meera.iyer@example.com",
    phone: "+44 20 7946 0321",
    location: "London, UK",
    linkedin: "linkedin.com/in/meeraiyer",
    github: "github.com/meeraiyer",
  },
  summary:
    "Backend engineer with 9 years of experience designing reliable APIs and data pipelines in Go, Python and Node.js. Comfortable owning services end to end, from design reviews to on-call.",
  education: [
    { degree: "M.Sc. in Software Engineering", school: "University of Manchester", year: "2015" },
    { degree: "B.Tech in Computer Science", school: "VIT University", year: "2013" },
  ],
  skills: ["Go", "Python", "Node.js", "PostgreSQL", "Kafka", "Redis", "Kubernetes", "AWS", "Terraform", "gRPC"],
  projects: [
    { name: "Queuebench", description: "Load-testing tool for message queues, used by three internal teams.", link: "github.com/meeraiyer/queuebench" },
    { name: "Ledger Lite", description: "Double-entry bookkeeping library for Go with property-based tests.", link: "" },
  ],
  additional: [{ heading: "Certifications", items: ["AWS Certified Solutions Architect – Associate (2022)", "CKAD (2021)"] }],
};

const RECENT_JOBS = [
  job("Senior Backend Engineer", "Northbeam Payments", "Apr 2021", "Present", [
    "Led the redesign of the payouts service, cutting failed transfers by 38%",
    "Moved 14 services from cron jobs to Kafka consumers with exactly-once processing",
    "Introduced contract tests between 9 teams, catching breaking API changes before release",
    "Mentored 4 engineers and ran the backend guild's monthly design review",
  ]),
  job("Backend Engineer", "Harbour Health", "Jan 2018", "Mar 2021", [
    "Built the appointments API serving 2 million requests a day at 99.95% uptime",
    "Cut PostgreSQL query times by 60% with partitioning and better indexes",
    "Wrote the incident runbooks used by the on-call rotation",
  ]),
  job("Software Engineer", "Tessellate Labs", "Jul 2015", "Dec 2017", [
    "Shipped a real-time pricing engine in Go handling 5,000 updates per second",
    "Automated deployments with Terraform, reducing release time from a day to an hour",
    "Added tracing across 20 services, halving the time to find production issues",
  ]),
  job("Junior Developer", "Brightwater Software", "Jun 2013", "Jun 2015", [
    "Maintained billing integrations for 40 enterprise customers",
    "Rewrote the nightly reports job, cutting its runtime from 3 hours to 25 minutes",
  ]),
];

export const SLIGHTLY_LONG = { ...BASE, title: "Slightly long", experience: RECENT_JOBS };

const OLDER_JOBS = Array.from({ length: 8 }, (_, index) =>
  job(`Developer ${index + 1}`, `Example Company ${index + 1}`, `Jan ${2001 + index}`, `Dec ${2002 + index}`, [
    "Built and maintained internal tools used by the operations and finance teams across several offices",
    "Improved the reliability of nightly batch jobs by adding retries, alerts and clear runbooks for the on-call team",
    "Worked with product managers to scope features, estimate effort and ship them in small, safe increments",
  ])
);

export const VERY_LONG = { ...BASE, title: "Very long", experience: [...RECENT_JOBS, ...OLDER_JOBS] };
