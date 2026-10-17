import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";

export default function App() {
  // The landing page has its own top bar, so hide the shared Navbar there
  const { pathname } = useLocation();
  const showNavbar = pathname !== "/";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {showNavbar && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* Only for logged-out users (logged-in users go to the dashboard) */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Only for logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/editor/:id" element={<Editor />} />
          </Route>

          {/* Unknown URLs go back to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
