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
    └── server.js                # App entry point
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
