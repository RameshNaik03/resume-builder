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

**Building resumes**

- **Editor with live preview**: every keystroke updates a paged preview; Edit/Preview tabs on phones
- **All resume sections**: personal info, summary, skills, experience (bullets, "currently working here"), education, projects and additional sections (certifications, languages, awards...), with add, remove, reorder and collapse
- **Rich text**: bold, italic, underline and links in the summary, bullets and project descriptions (sanitized on the server)
- **16 layouts in 3 tiers** (Basic, Advanced, Premium), each in 6 corporate color palettes, all built on a shared design foundation: one print type scale, a 4pt spacing scale, consistent rhythm, tabular dates, hanging-indent bullets and drawn (never typed) separators, icons and decorations. The template picker shows one card per layout with color swatches, and marks which layouts are ATS-friendly
- **Optional skill levels** (1 to 5 per skill): layouts such as Infographic draw rated skills as dots; unrated skills stay plain tags, and a level is never guessed
- **Design panel**: fonts (Google Fonts), sizes, spacing and margins, colors and dividers, columns and header layout, bullet style, date format, section order (drag and drop), hidden sections and renamed headings, A4 or US Letter
- **Fit to one page**: one switch (in the top bar and the Design tab) shrinks spacing, then margins, then line height, then text size, only as far as needed and never below readable limits (12 mm margins, 1.25 line height, 9 pt text). A search finds the largest settings that fit, the preview and the PDF use the same values, and turning it off brings back your own settings exactly. The page count is always shown; if the resume still doesn't fit, it says how many lines too long it is and suggests what to cut (the longest sections, roles older than 10 years, long bullets)
- **Profile photo** (optional): upload, crop, and choose its shape, size and border; stored on Cloudinary
- **Autosave**: 2 seconds after you stop typing, with a "Saving… / Saved / Unsaved changes" indicator, Ctrl+S, and a warning before leaving with unsaved changes
- **PDF download**: selectable, ATS-readable text with clickable links and the template's fonts. Entries don't split across pages, a heading never ends a page, a job title stays with its first two bullets, and a list never leaves a single item alone at the top or bottom of a page
- **Import an existing resume** (PDF or DOCX): read with the Claude API when a key is set, otherwise with a rule-based parser, into an editable resume

**ATS tools**

- **ATS checker** (`/ats-checker`, no login needed): upload a resume or pick a saved one, optionally paste a job description, and get an explainable score out of 100 (parseability, structure, content, keywords, polish) with a fix for every failed check, matched/missing keywords and the text an ATS actually reads. A Claude API key adds AI content judgments and tailored suggestions
- **ATS optimizer**: creates an improved copy (standard headings, one date format, newest job first, stronger bullets) without changing the original. AI rewrites are checked so they never invent numbers, skills or employers; where a number would help, a `[X%]` placeholder is added and highlighted until you fill it in
- **Review screen**: the score before and after, the original and optimized resume side by side with every change highlighted, accept or reject each change (rejecting undoes it exactly), skills from the job to add if you have them, and Re-score. Once you edit the copy in the editor, the decisions become read-only
- **ATS badge** on each dashboard card, with a one-click Re-check
- **Tailor to a job** (from the dashboard or any resume card): paste a job description and pick a resume; check what was found (title, company, seniority, must-have and nice-to-have skills, responsibilities) and move or remove skills; then get a tailored copy (the original never changes) and an honest match report: a match % with must-haves weighted higher (on its own scale: Strong fit 75%+, Good fit 50–74%, Stretch role under 50%), matched skills with the line of your resume that shows each one, and missing skills. For each missing skill, say "I have this skill" (where you used it, a note, and Skills only or also a bullet you write yourself) or "I don't have this". Nothing is added unless you confirm it. Past jobs are saved with their match %
- **Cover letters** (from a job's match report or the dashboard): written for a tailored resume and its job in English or German, in three tones and lengths, from the resume's real evidence and your confirmed skills, with the recipient's name and salutation ("Sehr geehrte Frau Schmidt," / "Dear Ms. Schmidt,"). Optional guided answers in your own words: your strongest achievement for the job (a short story), why this company, something specific that interests you about it, your earliest start date and, for German letters, a salary expectation. The letter opens by linking the job's most important need to your strongest real evidence (never "I am writing to apply" / "Hiermit bewerbe ich mich"), with two body paragraphs of concrete evidence in natural sentences ("In my role as X at Y, I ...", never pasted resume lines), a motivation paragraph built only from your answers, and a short close with your availability and an invitation to talk. Clichés are banned in both languages ("team player", "passionate", "teamfähig", "belastbar", "hochmotiviert"...). Anything unknown is a clearly marked placeholder, never invented. The editor has the same live preview as the resume editor: the letter is drawn by the resume's own template and palette (a matching set) with generous margins and clear spacing between the date (localized), recipient, bold subject line ("Bewerbung als ..." in German), greeting, paragraphs, sign-off and a signature line above your name, always fitted to one page. A **letter strength check** (specific opening, evidence for the top must-haves, a reason for the company, no clichés, length, no unfilled placeholders; each passes, warns or fails with a tip. Length passes inside its range, e.g. 190–320 words for "standard", warns when a little short (from 120) and fails only well below or above it. When the resume has no more matching evidence for the requested length, the editor says how far it goes ("about N words") instead of padding the letter), **three openings to choose from**, rich text, a word count, highlighted placeholders, Regenerate with other options (it warns before replacing your edits) and a one-page PDF that warns while placeholders are unfilled
- **Applications on the dashboard**: each tailored resume grouped with its job and cover letter (role, company, fit label, links to the resume, cover letter and job description)

**Accounts and app**

- **Authentication**: sign up and log in with JWT, passwords hashed with bcrypt, sessions restored on reload, and password reset by email (Resend)
- **Dashboard**: your resumes as cards with "last updated" times and ATS badges; create, upload, duplicate and delete (with a confirmation)
- **Private by design**: every API route checks the resume belongs to the logged-in user, and other users' resumes return 404
- **Polished UX**: dark mode, loading skeletons, empty states, toasts, friendly error messages (including when a page fails to load), 404 page, layouts that work at phone width, and `prefers-reduced-motion` support
- **Production basics**: rate limits on logins, imports, ATS checks and uploads; no stack traces or internal errors in production; the server refuses to start without its required settings; health check; pages loaded on demand
- **Tested**: API, parser and scoring suites plus browser tests (Puppeteer), run on GitHub Actions

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, React Hook Form, Axios, Tiptap (rich text), dnd kit (drag and drop), react-easy-crop, react-to-print, react-hot-toast |
| Backend | Node.js, Express 5, JWT (jsonwebtoken), bcryptjs, express-rate-limit, Multer, pdf-parse + pdf.js and Mammoth (reading PDF/DOCX), sanitize-html, Zod |
| Database | MongoDB Atlas with Mongoose (MongoDB in Docker for local development) |
| Services | Claude API (AI import and ATS feedback, optional), Cloudinary (photos), Resend (password reset emails) |
| Testing and CI | Node's test runner, Puppeteer (browser tests), GitHub Actions |

---

## Folder Structure

```
resume-builder/
├── .github/workflows/           # CI: fast checks on push, browser tests on pull requests
├── client/                      # React frontend (Vite)
│   ├── public/                  # favicon
│   ├── vercel.json              # Sends every path to index.html (deep links)
│   └── src/
│       ├── api/axios.js         # Axios instance (adds JWT, handles 401)
│       ├── components/
│       │   ├── editor/          # Form sections, rich text, design panel, template picker, photo
│       │   ├── ats/             # Score ring, results, resume snapshots for the review
│       │   ├── landing/         # Landing page parts
│       │   └── ...              # Navbar, ResumeCard, modals, ErrorBoundary, routes, etc.
│       ├── context/AuthContext.jsx
│       ├── hooks/               # useResume (load + autosave), usePageTitle, ...
│       ├── pages/               # Landing, auth pages, Dashboard, Editor, AtsChecker, AtsReview, NotFound
│       ├── templates/           # Template registry, layouts, design foundation, design settings, fonts, pagination
│       └── utils/               # Rich text, placeholders, image cropping, errors, ...
│
└── server/                      # Express backend
    ├── config/                  # MongoDB connection, required settings check
    ├── controllers/             # auth, resumes, import, photos, ATS
    ├── middleware/              # auth (JWT), errorHandler, rateLimiter, upload
    ├── models/                  # User, Resume
    ├── routes/                  # authRoutes, resumeRoutes, atsRoutes
    ├── services/
    │   ├── import/              # Text extraction from PDF/DOCX, AI and rule-based parsers
    │   ├── ats/                 # Scoring, keywords, optimizer, AI review and rewrites
    │   └── photoStorage.js      # Cloudinary
    ├── tests/                   # API and parser test suites + fixtures (npm test, see Testing)
    ├── e2e/                     # Browser tests: ATS checker and review, PDF round trip
    ├── app.js                   # The Express app (middleware + routes)
    └── server.js                # Entry point: checks settings, connects to MongoDB, starts the app
```

---

## API Routes

All routes are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Method | Route | Description | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Health check: `200` when the server and database are up, `503` while the database is unreachable | |
| POST | `/auth/register` | Create an account, returns `{ token, user }` (rate limited) | |
| POST | `/auth/login` | Log in, returns `{ token, user }` (rate limited) | |
| POST | `/auth/forgot-password` | Email a password reset link (same answer whether or not the email exists; rate limited) | |
| POST | `/auth/reset-password/:token` | Set a new password with the emailed link's token (rate limited) | |
| GET | `/auth/me` | Get the logged-in user | 🔒 |
| GET | `/resumes` | List your resumes (title, updatedAt and ATS badge, newest first) | 🔒 |
| POST | `/resumes` | Create a resume | 🔒 |
| POST | `/resumes/import` | Create a resume from a PDF or DOCX (multipart `file`; rate limited) | 🔒 |
| GET | `/resumes/:id` | Get one resume | 🔒 |
| PUT | `/resumes/:id` | Update a resume | 🔒 |
| DELETE | `/resumes/:id` | Delete a resume | 🔒 |
| POST | `/resumes/:id/duplicate` | Copy a resume (title gets " (Copy)") | 🔒 |
| POST / DELETE | `/resumes/:id/photo` | Upload (multipart `photo`, rate limited) or remove the resume's photo | 🔒 |
| POST | `/ats/analyze` | Score a resume for ATS out of 100 (multipart: `file` or, when logged in, `resumeId`; optional `jobDescription` and `jobTitle`). Returns the grade, five scored categories with every check's reason and fix, matched/missing keywords, the text an ATS sees (`atsView`) and the parsed resume. With `ANTHROPIC_API_KEY` set, AI judges content quality and writes tailored fixes. Rate limited; nothing is saved | Optional |
| POST | `/ats/optimize` | Create an improved copy of a resume (JSON: `resumeId`, or `parsedResume` from `/analyze`; optional `failedChecks`, `jobDescription`). Fixes structure (standard headings, one date format, newest job first, contact details in the body), rewrites weak bullets with AI when available (never inventing numbers, skills or employers), and adds job skills to Skills only when the resume already shows them. Saves a new resume in an ATS-friendly Basic template and returns every change (`{ id, section, before, after, reason }`), skills to consider adding, and the score before and after. Rate limited; the original is never changed | 🔒 |
| PATCH | `/ats/review/:resumeId` | The review step (JSON: `decisions` `[{ id, status }]` and/or `selectedSkills`). Accepting or rejecting rebuilds the copy from the original plus every change that isn't rejected; `409` once the copy has been edited in the editor. Ticked skills are added to (or removed from) the resume as it is | 🔒 |
| POST | `/ats/rescore/:resumeId` | Score a resume as it is now against the job it was last checked for, and save it as its ATS badge (rate limited) | 🔒 |
| POST | `/jobs/analyze` | Read a pasted job description (JSON: `jobDescription`): job title, company, seniority, must-have and nice-to-have skills, key responsibilities and keywords. AI when available (only skills the description really names are kept), rules otherwise. Rate limited | 🔒 |
| POST | `/jobs/tailor` | Tailor a copy of a resume to a job (JSON: `resumeId`, `job: { description, analysis }`). Saves a new resume titled "Role – Company" in an ATS-friendly template with Fit to one page on: a headline and summary aimed at the job from the resume's own facts, the most relevant bullets and projects first, bullets reworded to the job's wording only where they show the same skill (every line passes the optimizer's safety check), and job skills added to Skills only when the resume shows them, quoting where. Returns every change in the review screen's format and an honest match report (must-haves weighted higher, evidence for each matched skill, missing skills). Stores the job with the new resume. Rate limited; the original is never changed | 🔒 |
| POST | `/jobs/confirm-skill` | Add a missing skill the user says they have (JSON: `jobId`, `skill`, `note` on where they used it, `placement`: `"skills"` or `"bullet"`; for a bullet also `target` `{ type: "job" \| "project", id }` and the user's own `bullet` text, which must pass the safety check against the note, the skill and the resume). Recorded as an accepted change in the review; the match report then counts it, with the note as evidence. Skills are never added any other way | 🔒 |
| GET | `/jobs` | Past tailored jobs: role, company, match %, date and their latest cover letter | 🔒 |
| GET | `/jobs/:id` | One job: description, analysis, match report, confirmed and declined skills, the tailored resume, and the jobs and projects a bullet can go under | 🔒 |
| POST | `/jobs/:id/decline-skill` | "I don't have this" (JSON: `skill`): remembered for the list; nothing is added and it still counts as missing | 🔒 |
| GET / POST | `/cover-letters` | The user's cover letters (newest first, without bodies) / create one by hand (JSON: `resumeId`, optional `jobId`, `title`, `recipientName`, `companyName`, `body` (sanitized rich text), `tone`, `length`, `language`) | 🔒 |
| GET / PUT / DELETE | `/cover-letters/:id` | Read, update or delete one of the user's letters (also `recipientSalutation`, `subject`, `date` and the guided answers; a new `resumeId` or `jobId` must be the user's own). Changing the body by hand sets `bodyEdited`. Every response with a letter includes its `strength` check (`checks: [{ id, label, status (pass / warn / fail), passed, tip }]`, `passed`, `warnings`, `total`) and `evidenceWords` (set when the requested length couldn't be reached with the resume's evidence) | 🔒 |
| POST | `/cover-letters/:id/opening` | Use another of the letter's three `openingOptions` (JSON: `index`): replaces only the paragraph after the greeting | 🔒 |
| POST | `/cover-letters/:id/regenerate` | Rewrite a letter's body for its job with new options (the same as `/generate`); resets `bodyEdited`. Rate limited | 🔒 |
| POST | `/cover-letters/generate` | Write and save a cover letter for a job (JSON: `jobId`, optional `resumeId` (the job's tailored resume by default), `tone` professional / warm / confident, `length` short ~150 / standard ~250 / detailed ~350 words, `language` en / de, `recipientName`, `recipientSalutation` (`"Frau"`, `"Herr"` or none), and the guided answers, all optional: `whyCompany`, `achievement` (≤600 characters), `companyInterest`, `availability`, `salary` (German letters only)). An opening linking the job's top need to the strongest real evidence (three variants, saved as `openingOptions`), two body paragraphs of concrete evidence (resume lines rewritten as sentences, confirmed skills' notes, or the user's achievement story), a motivation paragraph only from the user's answers, a close with availability (and salary in German). Unknown facts become placeholders (`[Hiring Manager]`, `[Why this company? ...]`); German letters follow formal conventions ("Sehr geehrte Damen und Herren" without a name). AI when available, used only if it passes the safety check (no new numbers, skills, companies or titles, no banned phrase; a failed opening is replaced by a template one); otherwise a structured template. Returns the letter (with its strength check), its placeholders and how it was written. Rate limited | 🔒 |

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

### Deploying

- **Server** (e.g. Render or Railway): root directory `server`, build `npm ci`, start `npm start`, health check path `/api/health`. Set `NODE_ENV=production`, `MONGO_URI` (Atlas), `JWT_SECRET` (32+ random characters) and `CLIENT_URL` (the client's URL), plus the optional keys from `.env.example`. The server refuses to start if a required setting is missing or the secret is too weak, and lists what to fix in the log.
- **Client** (e.g. Vercel): root directory `client`, build `npm run build`, output `dist`, and set `VITE_API_URL` to the server's URL + `/api`. `client/vercel.json` sends every path to `index.html`, so links like `/dashboard` or the password reset link work when opened directly.

---

## Testing

All server tests use Node's built-in test runner. Run them in `server/`:

```bash
npm test                  # all fast suites (~15 s)
npm run test:e2e          # browser tests of the ATS checker, review screen, Fit to one page and Tailor to a job (~3 min)
npm run test:roundtrip    # PDF round trip for all 96 templates (~3 min)
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
| Production | `production.test.js` | The startup check for required settings (and a strong `JWT_SECRET` in production), the health check, no `X-Powered-By` header |
| ATS optimize | `ats-optimize.test.js` | The improved copy: structure fixes, every change listed, keywords, AI rewrite safety checks; never adds a skill that isn't in the original |
| Cover letters | `coverLetters.test.js` | Banned phrases (English and German, whole words, German inflections); the strength check (each of the six checks passing and failing, with tips; length warns at 120–189 words for "standard" and fails below 120 or above 320); `evidenceWords` when all the evidence is used and the letter is still short (and not otherwise); generated letters: an opening linking the top need to real evidence, three different openings and choosing one (only the opening changes), evidence in natural sentences ("In my role as X at Y, I ...", no quoted lines, the opening's example not repeated), the achievement story in the user's words, the company interest, availability and a German salary expectation (none in English letters), a confirmed skill's note in the user's words, no skill or number that isn't in the resume or confirmed notes, no generic phrases, placeholders for the recipient and "Why this company?", the user's own answers used as given, tones and lengths; German letters use "Sehr geehrte Damen und Herren" without a name and close formally; salutations ("Sehr geehrte Frau Schmidt," / "Sehr geehrter Herr Schmidt," / "Guten Tag Anna Schmidt,", "Dear Ms./Mr. Schmidt," / "Dear Anna Schmidt,"); Regenerate and the hand-edited flag; CRUD with ownership checks and a sanitized body; AI letters with a new number, skill, employer (English or German) or a cliché ("dynamic", "passionate", "teamfähig") are dropped for the template, and an AI opening with a cliché or invented fact is replaced by a template opening |
| Job tailoring | `jobs.test.js` | Job analysis (title, company, seniority, must-have vs nice-to-have, responsibilities); a tailored copy (headline, summary, bullet and project order, the job's wording, skills with evidence, template and Fit to one page); a skill the resume doesn't show is never added without confirmation, even from a forged analysis; the original never changes; the match % never counts unconfirmed skills; confirming needs a note and an explicit placement (Skills only, or a bullet the user writes under a chosen job or project, refused if it adds a number or skill they didn't write, and nothing is guessed from the note); "I don't have this"; the saved jobs list; confirmed skills survive rejecting every change in the review; with a stand-in AI, invented skills and new numbers are dropped |

**Browser tests** (files in `server/e2e/`). They start the API (port 5055), Vite (port 5174) and a headless browser themselves, and stop them afterwards:

| Suite | Command | What it checks |
| --- | --- | --- |
| ATS checker + review | `npm run test:e2e` | The ATS checker page as a guest and logged in: upload, progress steps, results, "What the ATS sees", generating the optimized version, the import banner note, phone width and dark mode. Then the review screen: scores, side-by-side previews with highlights, accept / reject (surviving a refresh), the skills checklist, re-score, placeholders highlighted in the review and the editor (never in the PDF), the editor banner, the read-only review after an editor edit, the dashboard's ATS badge and Re-check |
| Fit to one page | `npm run test:e2e` (`fit-one-page.test.js`) | In the editor: a resume a little over one page fits when the switch is turned on and only the switch is saved; turning it off restores the saved design and the preview's settings exactly; a very long resume shows "still N lines too long" with suggestions, never goes below the minimums and never hides content |
| Tailor to a job | `npm run test:e2e` (`tailor.test.js`) | From the dashboard: paste a job, pick a resume, analyze; move and remove skills; tailor; the match ring and breakdown; evidence on hover; "I have this skill" with an edited bullet (the % goes up), a bullet that adds a number refused, Skills only; "I don't have this" kept after a reload; Review changes; saved jobs; the resume card's entry point; the original never changes |
| Cover letters | `npm run test:e2e` (`coverLetter.test.js`) | From the match report: generate a German letter for Frau Schmidt; the editor shows it in the resume's template with "Sehr geehrte Frau Schmidt,", "Bewerbung als ...", a German date, the recipient block, the achievement story, start date and salary expectation, and a signature line; placeholders highlighted; the strength check, with the length warning and the "evidence for about N words" note; choosing another of the three openings changes only the opening; a hand edit is saved; Regenerate in English warns before replacing it; Download PDF warns while placeholders are unfilled; answering "Why this company?" clears them; the dashboard's application card and its links |
| PDF round trip | `npm run test:roundtrip` | Every template: renders a sample resume, prints it to PDF the way the app does, extracts the text with the ATS checker's extractor, and checks that the headings are recognised, the name comes first, each job title is right above its bullets, every skill is there as text, and there are no stray separators or spaced-out letters. Extra cases cover settings that change a layout's text order (Timeline Plus with two columns, Infographic with skill levels), a resume a little over one page that prints on exactly one page with Fit to one page on, and a cover letter in three layouts (Classic, Sidebar Pro, Color Block): one page, the name first, then the subject, greeting, opening, achievement story, close and sign-off in order, the name last, with no stray separators. It also fails if any layout steps outside the design foundation's scales. `ROUNDTRIP_ONLY=classic` checks only the templates whose id starts with "classic" |

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

## Challenges and Solutions

**PDFs that looked right but read wrong.** Some templates exported PDFs that an ATS read as `S U M M A R Y`, with stray `· · ·` separators, or with job titles separated from their bullets. They looked fine on screen, so the bug was invisible. *Solution:* a round-trip test that prints every template to PDF the way the app does, extracts the text with the ATS checker's own extractor, and checks the headings, the order and the separators. Its lessons became rules for every layout: no letter-spacing, no faded or positioned text, and every separator, icon, section number or monogram drawn as a shape so it never turns up in the text.

**Page breaks for a web page that has to print as paper.** The preview is one long HTML page, but the PDF has fixed pages, and the browser's own page breaking split job entries, left headings stranded at the bottom of a page and couldn't keep a layout's decorations tidy. *Solution:* the app paginates itself. Every piece that must stay whole is marked as a block; the hidden full-length sheet is measured, and any block that would cross a page's bottom margin gets padding that moves it to the next page, the same way on screen and in the PDF. Headings and job titles keep with what follows, and lists have orphan/widow control (at least two items on each side of a break, so a title always keeps its first two bullets). Decorations that span a break, like card tints, a timeline's line and the rule between two columns, are drawn page by page from the blocks' measured positions, so they never cross the page margins, never leave an empty stub behind and never run beside an empty column. A dotted rule is drawn as a pattern of gaps laid over the line.

**Importing real-world resumes.** PDFs store text in drawing order, not reading order. Real CVs also wrap long lines, put dates in odd places and use brackets that split across lines. The parser worked on tidy test files and broke on real ones. *Solution:* fixes for each failure, plus a regression test on an anonymised real CV's text, in both the PDF's own order and in reading order.

**Letting AI help without letting it lie.** Asked to "strengthen" a bullet, a language model happily adds a percentage or a skill the person never mentioned. *Solution:* every AI rewrite is checked against the original, and rewrites that add numbers, skills or employers are rejected. Where a number would help, the optimizer adds a visible `[X%]` placeholder instead. It's highlighted in the review and the editor but never printed in the PDF.

**Undoing one change out of many.** Accepting and rejecting optimizer changes in any order had to give exactly the original when everything was rejected. *Solution:* each change is stored as a small operation (e.g. "replace this bullet", "move this line to the subtitle"). The resume is rebuilt from the original plus every change that isn't rejected, so each change reverts exactly. Edits made later in the editor can't be expressed as these operations, so the decisions lock once the resume is edited there, rather than silently overwriting those edits.

**Saving without losing keystrokes.** With autosave, a save can finish while the user is still typing, or a photo upload can finish during a save. *Solution:* the editor tracks a version number and only marks the resume "Saved" when nothing changed during the save. The server sets personal info field by field, so a save never overwrites a photo uploaded at the same moment.

**Fonts missing from the PDF.** The browser could print before the Google Fonts arrived in the print frame, which silently fell back to a default font. *Solution:* the font files themselves are passed to `react-to-print`, which waits for them to load.

**A big first download.** The production build put the editor, the rich text editor and every template into large bundles. *Solution:* every page except the landing page loads on demand, and the rich text editor has its own chunk. The bundler's default also pulled React into that chunk, which would have made every page load it, so that default is turned off. An error boundary shows a "Reload" message if a page's code fails to download.

**Configuration mistakes that fail quietly.** Without `JWT_SECRET`, the server started fine and then failed every login with a 500. Without `CLIENT_URL`, the browser blocked every request with a CORS error. *Solution:* the server checks its required settings at startup and refuses to start, listing what to fix.

---

## What I Learned

- **Test with real data early.** My own CV exposed bugs that sample data never did: the import lost job titles, and my templates weren't ATS-safe.
- **PDFs don't store text in reading order.** CSS letter-spacing, opacity and positioning changed how text was extracted. An automated round-trip test across every template took the pass rate from 4/45 to 100%.
- **Professional design is mostly rules, not decoration.** A shared foundation (type scale, spacing rhythm, palettes) enforced by tests made 16 layouts look consistently polished.
- **Print is harder than screens.** Page breaks needed orphan and widow control, and backgrounds had to be drawn page by page so nothing crosses the margins.
- **AI needs guardrails.** Every AI rewrite, tailored resume and cover letter passes a safety check: no invented numbers, skills, companies or titles. Missing skills are only added when the user confirms them.
- **Design for undo from the start.** Rebuilding the resume from the original plus accepted changes made accept/reject reliable, even when changes depend on each other.
- **Fail fast in production.** The server refuses to start with missing settings instead of failing on every request.

## Future Improvements

- Public share link for a resume
- Import from LinkedIn
- Cover letters that reuse the resume's details and design
- Version history for a resume (go back to an earlier save)
- Client-side component tests (Vitest + Testing Library) next to the browser tests
