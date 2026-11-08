import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppShell from "./components/ui/AppShell";
import AuthLayout from "./components/ui/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Landing from "./pages/Landing";
import Loader from "./components/Loader";

// Every page except the landing page is loaded only when it's opened, so the first visit
// downloads much less JavaScript (the editor alone brings the rich text editor, crop tool
// and every template)
const AtsChecker = lazy(() => import("./pages/AtsChecker"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const OriginalResume = lazy(() => import("./pages/OriginalResume"));
const AtsReview = lazy(() => import("./pages/AtsReview"));
const Tailor = lazy(() => import("./pages/Tailor"));
const CoverLetter = lazy(() => import("./pages/CoverLetter"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Development-only pages: import.meta.env.DEV is false in production builds, so these
// routes don't exist there and their code is left out of the bundle
const DevTemplates = import.meta.env.DEV ? lazy(() => import("./pages/dev/DevTemplates")) : null;
const DevTemplatePreview = import.meta.env.DEV ? lazy(() => import("./pages/dev/DevTemplatePreview")) : null;
const DevStyleGuide = import.meta.env.DEV ? lazy(() => import("./pages/dev/DevStyleGuide")) : null;

// Shown while a page's code downloads
const page = (element, text = "Loading...") => <Suspense fallback={<Loader text={text} />}>{element}</Suspense>;

export default function App() {
  return (
    <>
      <Routes>
        {/* Sign-in pages: only for logged-out users (logged-in users go to the dashboard), in the
            AuthLayout (the wordmark above one card, no navigation) */}
        <Route element={<AuthLayout />}>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={page(<Login />)} />
            <Route path="/register" element={page(<Register />)} />
            <Route path="/forgot-password" element={page(<ForgotPassword />)} />
            <Route path="/reset-password/:token" element={page(<ResetPassword />)} />
          </Route>
        </Route>

        {/* Every other page: inside the AppShell (the top navigation; it also catches page errors) */}
        <Route element={<AppShell />}>
          {/* Everyone (its buttons point logged-in users to the dashboard) */}
          <Route path="/" element={<Landing />} />
          <Route path="/ats-checker" element={page(<AtsChecker />)} />

          {/* Only for logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={page(<Dashboard />)} />
            <Route path="/editor/:id" element={page(<Editor />, "Opening the editor...")} />
            <Route path="/resumes/:id/original" element={page(<OriginalResume />, "Opening your original...")} />
            <Route path="/ats/review/:id" element={page(<AtsReview />, "Opening your review...")} />
            <Route path="/tailor" element={page(<Tailor />)} />
            <Route path="/tailor/jobs/:jobId" element={page(<Tailor />, "Opening your match report...")} />
            <Route path="/cover-letters/:id" element={page(<CoverLetter />, "Opening your cover letter...")} />
          </Route>

          {/* Development only: every template side by side, and the design system (not linked anywhere) */}
          {import.meta.env.DEV && <Route path="/dev/templates" element={page(<DevTemplates />)} />}
          {import.meta.env.DEV && <Route path="/dev/templates/:templateId" element={page(<DevTemplatePreview />)} />}
          {import.meta.env.DEV && <Route path="/dev/ui" element={page(<DevStyleGuide />)} />}

          {/* Any other URL */}
          <Route path="*" element={page(<NotFound />)} />
        </Route>
      </Routes>

      {/* Toasts in the design system: a surface card, the status colour on its icon */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: "type-body",
          style: { background: "var(--ds-surface)", color: "var(--ds-fg)", border: "1px solid var(--ds-line)", boxShadow: "var(--ds-elevation-raised)", borderRadius: "0.75rem" },
          success: { iconTheme: { primary: "var(--ds-success)", secondary: "var(--ds-surface)" } },
          error: { iconTheme: { primary: "var(--ds-danger)", secondary: "var(--ds-surface)" } },
        }}
      />
    </>
  );
}
