import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Landing from "./pages/Landing";
import AtsChecker from "./pages/AtsChecker";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Loader from "./components/Loader";

// The editor (with the rich text editor, crop tool, etc.) is loaded only when it's opened,
// so the landing page, login and dashboard download much less JavaScript
const Editor = lazy(() => import("./pages/Editor"));
const AtsReview = lazy(() => import("./pages/AtsReview"));

export default function App() {
  // The landing page has its own top bar, so hide the shared Navbar there
  const { pathname } = useLocation();
  const showNavbar = pathname !== "/";

  return (
    <div className="flex min-h-screen flex-col">
      {showNavbar && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* Everyone (its buttons point logged-in users to the dashboard) */}
          <Route path="/" element={<Landing />} />
          <Route path="/ats-checker" element={<AtsChecker />} />

          {/* Only for logged-out users (logged-in users go to the dashboard) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>

          {/* Only for logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/editor/:id"
              element={
                <Suspense fallback={<Loader text="Opening the editor..." />}>
                  <Editor />
                </Suspense>
              }
            />
            <Route
              path="/ats/review/:id"
              element={
                <Suspense fallback={<Loader text="Opening your review..." />}>
                  <AtsReview />
                </Suspense>
              }
            />
          </Route>

          {/* Any other URL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: "dark:bg-slate-800! dark:text-slate-100!",
        }}
      />
    </div>
  );
}
