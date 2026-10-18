// Known skills the ATS checker looks for in job descriptions.
// Each entry: the name we show, plus other ways the same skill is commonly written.
// Matching is case-insensitive. Very short or ambiguous words (e.g. "Go", "R", "C")
// are left out on purpose, because they'd match ordinary English words.
const SKILLS = [
  // Languages
  ["JavaScript", "js", "ecmascript"],
  ["TypeScript", "ts"],
  ["Python"],
  ["Java"],
  ["C++", "cpp"],
  ["C#", "c sharp", "csharp"],
  ["Golang"],
  ["Rust"],
  ["Ruby"],
  ["PHP"],
  ["Swift"],
  ["Kotlin"],
  ["Scala"],
  ["SQL"],
  ["HTML", "html5"],
  ["CSS", "css3"],
  ["Bash", "shell scripting"],

  // Frontend
  ["React", "react.js", "reactjs"],
  ["Next.js", "nextjs"],
  ["Vue", "vue.js", "vuejs"],
  ["Angular", "angularjs"],
  ["Svelte"],
  ["Redux"],
  ["Tailwind CSS", "tailwind", "tailwindcss"],
  ["Sass", "scss"],
  ["Webpack"],
  ["Vite"],
  ["Responsive design"],
  ["Accessibility", "a11y", "wcag"],

  // Backend
  ["Node.js", "node", "nodejs"],
  ["Express", "Express.js", "ExpressJS"],
  ["Django"],
  ["Flask"],
  ["FastAPI"],
  ["Spring Boot"],
  ["Ruby on Rails", "rails"],
  [".NET", "dotnet", "asp.net"],
  ["Laravel"],
  ["REST APIs", "restful", "rest api", "restful apis"],
  ["GraphQL"],
  ["gRPC"],
  ["Microservices", "microservice"],
  ["WebSockets", "websocket"],

  // Data stores
  ["MongoDB", "mongo", "mongoose"],
  ["PostgreSQL", "postgres"],
  ["MySQL"],
  ["SQLite"],
  ["Redis"],
  ["Elasticsearch"],
  ["DynamoDB"],
  ["Firebase"],
  ["Kafka", "apache kafka"],
  ["RabbitMQ"],

  // Cloud & DevOps
  ["AWS", "amazon web services"],
  ["Azure", "microsoft azure"],
  ["Google Cloud", "gcp", "google cloud platform"],
  ["Docker"],
  ["Kubernetes", "k8s"],
  ["Terraform"],
  ["Ansible"],
  ["CI/CD", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  ["GitHub Actions"],
  ["Jenkins"],
  ["Git", "github", "gitlab"],
  ["Linux"],
  ["Serverless", "aws lambda", "lambda"],
  ["Nginx"],
  ["Monitoring", "observability", "prometheus", "grafana", "datadog"],

  // Testing
  ["Unit testing", "unit tests"],
  ["Jest"],
  ["Cypress"],
  ["Playwright"],
  ["Selenium"],
  ["Test automation", "automated testing"],
  ["TDD", "test-driven development"],

  // Data & AI
  ["Machine learning", "ml"],
  ["Deep learning"],
  ["Artificial intelligence", "ai"],
  ["NLP", "natural language processing"],
  ["LLMs", "llm", "large language models"],
  ["Data analysis", "data analytics"],
  ["Data visualization"],
  ["Data engineering"],
  ["ETL"],
  ["Pandas"],
  ["NumPy"],
  ["TensorFlow"],
  ["PyTorch"],
  ["scikit-learn", "sklearn"],
  ["Spark", "Apache Spark", "PySpark"],
  ["Tableau"],
  ["Power BI", "powerbi"],
  ["Excel", "Microsoft Excel"],
  ["Statistics", "statistical analysis"],
  ["A/B testing", "ab testing", "experimentation"],

  // Security
  ["Cybersecurity", "information security", "security"],
  ["OAuth", "oauth2"],
  ["JWT", "json web tokens"],

  // Mobile
  ["iOS"],
  ["Android"],
  ["React Native"],
  ["Flutter"],

  // Design & product
  ["Figma"],
  ["UI design", "user interface design"],
  ["UX design", "user experience", "ux"],
  ["Wireframing", "wireframes"],
  ["Prototyping"],
  ["User research"],
  ["Product management"],
  ["Roadmapping", "product roadmap", "roadmap"],

  // Ways of working
  ["Agile"],
  ["Scrum"],
  ["Kanban"],
  ["Jira"],
  ["Project management"],
  ["Stakeholder management", "stakeholders"],
  ["System design", "systems design"],
  ["Code review", "code reviews"],
  ["Documentation", "technical writing"],
  ["Performance optimization", "performance tuning"],

  // Business
  ["Salesforce"],
  ["CRM"],
  ["SEO", "search engine optimization"],
  ["Digital marketing"],
  ["Content marketing"],
  ["Social media"],
  ["Google Analytics"],
  ["Budgeting", "budget management"],
  ["Forecasting"],
  ["Financial modeling", "financial modelling"],
  ["Customer service", "customer support"],
  ["Sales"],
  ["Negotiation"],
  ["Recruiting", "recruitment", "talent acquisition"],

  // Soft skills
  ["Communication", "communication skills"],
  ["Leadership", "team leadership"],
  ["Mentoring", "mentorship"],
  ["Problem solving", "problem-solving"],
  ["Collaboration", "cross-functional"],
  ["Time management"],
  ["Attention to detail", "detail-oriented"],
];

// Skills that are also everyday words ("excel at", "express interest", "a swift reply").
// These only match when written with a capital letter, exactly as in the list above.
const CASE_SENSITIVE = new Set(["Excel", "Express", "Swift", "Rust", "Spark", "Vite"]);

export default SKILLS.map(([name, ...aliases]) => {
  const caseSensitive = CASE_SENSITIVE.has(name);
  return {
    name,
    caseSensitive,
    terms: caseSensitive ? [name, ...aliases] : [name.toLowerCase(), ...aliases],
  };
});
