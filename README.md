# ResumeCraft

A full stack resume builder: create professional, ATS-friendly resumes with a live preview and download them as PDFs.

**🔗 Live Demo:** [your-app-url.vercel.app](https://your-app-url.vercel.app) <!-- TODO: add after deploying -->

**🧪 Demo login**

| Email | Password |
| --- | --- |
| `demo@example.com` <!-- TODO --> | `demo1234` <!-- TODO --> |

---

## Screenshots

<!-- TODO: add screenshots to a docs/screenshots folder and update the paths below -->

| Landing page | Dashboard |
| --- | --- |
| ![Landing page](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Editor with live preview | PDF export |
| --- | --- |
| ![Editor](docs/screenshots/editor.png) | ![PDF](docs/screenshots/pdf.png) |

---

## Features

- **Authentication**: sign up and log in with JWT; passwords hashed with bcrypt; sessions restored on page reload
- **Dashboard**: all your resumes as cards with "last updated" times; create, duplicate and delete (with a confirmation modal)
- **Editor with live preview**: every keystroke updates an A4 preview of the resume
- **Autosave**: saves 2 seconds after you stop typing, with a "Saving… / Saved / Unsaved changes" indicator, Ctrl+S, and a warning before leaving with unsaved changes
- **All resume sections**: personal info, summary, skills (tag input), experience (with bullet points and "currently working here"), education and projects, with add, remove, reorder and collapse
- **PDF download**: an ATS-friendly one-page template with clickable links, A4 page size, and entries that don't split across pages
- **ATS checker** (`/ats-checker`, no login needed): upload a resume or pick a saved one, optionally paste a job description, and get an explainable score out of 100 (parseability, structure, content, keywords, polish) with a fix for every failed check, the top fixes, matched/missing keywords and a view of the text an ATS actually reads. A Claude API key adds AI content judgments and tailored suggestions
- **Private by design**: every API route checks the resume belongs to the logged-in user
- **Polished UX**: loading skeletons, empty states, toast messages, friendly error messages, 404 page, responsive layout with Edit/Preview tabs on mobile, and `prefers-reduced-motion` support
- **Security basics**: rate-limited login/register, no stack traces or internal errors in production, server-side input validation

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, React Hook Form, Axios, react-to-print, react-hot-toast |
| Backend | Node.js, Express 5, JWT (jsonwebtoken), bcryptjs, express-rate-limit |
| Database | MongoDB Atlas with Mongoose |

---

## Folder Structure

```
resume-builder/
├── client/                      # React frontend (Vite)
│   ├── public/                  # favicon
│   └── src/
│       ├── api/axios.js         # Axios instance (adds JWT, handles 401)
│       ├── components/
│       │   ├── editor/          # Form sections + reusable ListEditor
│       │   ├── templates/       # ClassicTemplate (the resume design)
│       │   └── ...              # Navbar, ResumeCard, ConfirmModal, routes, etc.
│       ├── context/AuthContext.jsx
│       ├── hooks/               # useResume (load + autosave), usePageTitle
│       ├── pages/               # Landing, Login, Register, Dashboard, Editor, NotFound
│       └── utils/               # timeAgo, getErrorMessage, createId
│
└── server/                      # Express backend
    ├── config/db.js             # MongoDB connection
    ├── controllers/             # authController, resumeController
    ├── middleware/              # auth (JWT), errorHandler, rateLimiter
    ├── models/                  # User, Resume
    ├── routes/                  # authRoutes, resumeRoutes
    ├── tests/                   # API and parser test suites + fixtures (npm test, see Testing)
    ├── e2e/                     # Browser tests: ATS checker page, PDF round trip
    ├── app.js                   # The Express app (middleware + routes)
    └── server.js                # Entry point: loads .env, connects to MongoDB, starts the app
```

---

## API Routes

All routes are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Method | Route | Description | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Health check | |
| POST | `/auth/register` | Create an account, returns `{ token, user }` (rate limited) | |
| POST | `/auth/login` | Log in, returns `{ token, user }` (rate limited) | |
| GET | `/auth/me` | Get the logged-in user | 🔒 |
| GET | `/resumes` | List your resumes (title + updatedAt, newest first) | 🔒 |
| POST | `/resumes` | Create a resume | 🔒 |
| GET | `/resumes/:id` | Get one resume | 🔒 |
| PUT | `/resumes/:id` | Update a resume | 🔒 |
| DELETE | `/resumes/:id` | Delete a resume | 🔒 |
| POST | `/resumes/:id/duplicate` | Copy a resume (title gets " (Copy)") | 🔒 |
| POST | `/ats/analyze` | Score a resume for ATS out of 100 (multipart: `file` or, when logged in, `resumeId`; optional `jobDescription` and `jobTitle`). Returns the grade, five scored categories with every check's reason and fix, matched/missing keywords, the text an ATS sees (`atsView`) and the parsed resume. With `ANTHROPIC_API_KEY` set, AI judges content quality and writes tailored fixes. Rate limited; nothing is saved | Optional |
| POST | `/ats/optimize` | Create an improved copy of a resume (JSON: `resumeId`, or `parsedResume` from `/analyze`; optional `failedChecks`, `jobDescription`). Fixes structure (standard headings, one date format, newest job first, contact details in the body), rewrites weak bullets with AI when available (never inventing numbers, skills or employers), and adds job skills to Skills only when the resume already shows them. Saves a new resume in an ATS-friendly Basic template and returns every change (`{ id, section, before, after, reason }`), skills to consider adding, and the score before and after. Rate limited; the original is never changed | 🔒 |

Errors always return JSON in the form `{ "message": "..." }`. Resumes that belong to another user return `404`.

---

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or a local MongoDB)

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/resume-builder.git
cd resume-builder

cd server && npm install
cd ../client && npm install
```

### 2. Server environment: `server/.env`

Copy `server/.env.example` to `server/.env` and fill it in:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/resume-builder?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Client environment: `client/.env`

Copy `client/.env.example` to `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start both apps (two terminals)

```bash
# Terminal 1
cd server
npm run dev     # http://localhost:5000

# Terminal 2
cd client
npm run dev     # http://localhost:5173
```

Open http://localhost:5173 and create an account.

---

## Testing

All server tests use Node's built-in test runner. Run them in `server/`:

```bash
npm test                  # all fast suites (~15 s)
npm run test:e2e          # browser tests of the ATS checker and review screen (~1 min)
npm run test:roundtrip    # PDF round trip for all 45 templates (~2 min)
```

**Fast suites** (`npm test`, files in `server/tests/`). Each one starts the real app on a free port with its own throwaway database:

| Suite | File | What it checks |
| --- | --- | --- |
| Resumes | `resume.test.js` | Register, create, list, update, duplicate, delete; users can only see and change their own resumes |
| Design | `design.test.js` | Design settings save and reload exactly, invalid values are rejected, duplicates copy them |
| Rich text | `richtext.test.js` | Summary, bullet and project HTML is sanitized (scripts, unsafe links removed); plain text converts safely; the ATS text has no HTML |
| Photos | `photo.test.js` | Upload checks (type, size, field), one photo per resume, duplicates get their own copy, deleting cleans up. Cloudinary is replaced by a stand-in |
| Import | `import.test.js` | PDF and DOCX import, scanned/fake/oversized files rejected, fallback to the rules when the AI fails, rate limit |
| Import regression | `import-regression.test.js` | The parser on an anonymised real CV's text, in the PDF's own text order and in reading order: all jobs, projects and degrees with titles, companies and dates; bullets stay with their job; brackets and wrapped lines stay whole (also `npm run test:import-regression`) |
| ATS scoring | `ats-scoring.test.js` | Individual checks on resume text: technology names (Node.js, React Native, job keywords) aren't counted as overused words, suggestions fit the repeated word; contact details at the top, with partial points and a precise message when location or LinkedIn is missing; job titles match exactly, closely (other seniority, Developer = Engineer) or as a related role; seniority and job-ad words aren't keywords; a product/project line under a job is its subtitle, not a bullet |
| ATS analyze | `ats-analyze.test.js` | The score: validation, categories and checks, job description keywords, risky layouts (columns, tables, headers, scans), saved resumes, the AI review, rate limit |
| ATS review | `ats-review.test.js` | The optimizer's review step: the review saved on the new resume, rejecting each kind of change reverts it exactly (and accepting re-applies it), accept all / reject all, the skills checklist, re-scoring, the dashboard badge, locking the decisions once the resume is edited in the editor (ticked skills and re-scoring still work and keep the edits) |
| ATS optimize | `ats-optimize.test.js` | The improved copy: structure fixes, every change listed, keywords, AI rewrite safety checks; never adds a skill that isn't in the original |

**Browser tests** (files in `server/e2e/`). They start the API (port 5055), Vite (port 5174) and a headless browser themselves, and stop them afterwards:

| Suite | Command | What it checks |
| --- | --- | --- |
| ATS checker + review | `npm run test:e2e` | The ATS checker page as a guest and logged in: upload, progress steps, results, "What the ATS sees", generating the optimized version, the import banner note, phone width and dark mode. Then the review screen: scores, side-by-side previews with highlights, accept / reject (surviving a refresh), the skills checklist, re-score, placeholders highlighted in the review and the editor (never in the PDF), the editor banner, the read-only review after an editor edit, the dashboard's ATS badge and Re-check |
| PDF round trip | `npm run test:roundtrip` | Every template: renders a sample resume, prints it to PDF the way the app does, extracts the text with the ATS checker's extractor, and checks that the headings are recognised, the name comes first, each job title is right above its bullets, and there are no stray separators or spaced-out letters. `ROUNDTRIP_ONLY=classic` checks only the templates whose id starts with "classic" |

**Client** (in `client/`): `npm run lint` (oxlint) and `npm run build` (the production build compiles).

What the tests need:

- **MongoDB** at `mongodb://127.0.0.1:27017`. If nothing answers there, the tests run `docker compose up -d --wait` (the same as `npm run db:up`). To use another server, set `TEST_MONGO_URI`. Every run uses throwaway databases and deletes them at the end.
- **For the browser tests:** Edge or Chrome installed (found automatically, or set `BROWSER_PATH`) and ports 5055 and 5174 free (your dev servers on 5000 and 5173 can keep running; change the ports with `API_PORT` / `CLIENT_PORT`).

No real keys are used: the fast suites never read `server/.env` (they load `app.js` directly), the browser tests start `server.js` with the AI, photo and email keys blanked out, and where a test needs those services it uses local stand-ins. Test files are fictional (`server/tests/fixtures/`; `ats/make-fixtures.cjs` rebuilds the ATS ones). The browser tests save screenshots, PDFs and extracted text in your temp folder under `resume-builder-e2e/`, for when a check fails.

### Continuous integration (GitHub Actions)

| Workflow | Runs on | What it runs |
| --- | --- | --- |
| [CI](.github/workflows/ci.yml) | Every push | `npm test` (with a MongoDB service container), and the client's lint and build |
| [Browser tests](.github/workflows/browser-tests.yml) | Pull requests to `main`, or by hand from the Actions tab ("Run workflow") | `test:roundtrip` and `test:e2e` side by side, with Chrome installed on the runner. If a suite fails, its screenshots and PDFs are uploaded as an artifact |

CI installs packages with `npm ci` from `package-lock.json`, so commit that file when you add or update a package.

---

## What I Learned

<!-- TODO: edit these in your own words -->

- Designing a REST API with Express and protecting routes with JWT middleware
- Making sure users can only access their own data, and returning 404 instead of revealing that other users' data exists
- Modelling nested data (experience, bullets, projects) with Mongoose sub-schemas
- Managing global auth state in React with Context, plus protected and public routes
- Building a debounced autosave that never loses changes, even when the user keeps typing during a save
- Building reusable components (one `ListEditor` powers three form sections)
- Print CSS for real A4 PDFs: `@page`, page-break control and scaling a preview with `transform`
- Production basics: rate limiting, hiding internal errors and environment variables

## Future Improvements

- More templates (modern, two-column, minimal) with a template picker
- Custom accent colours and fonts
- Drag-and-drop reordering
- Public share link for a resume
- AI suggestions for summaries and bullet points
- Import from an existing PDF or LinkedIn
- Password reset by email
- Automated tests (Jest / Vitest + Supertest) and CI with GitHub Actions
