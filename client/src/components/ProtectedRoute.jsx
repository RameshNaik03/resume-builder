import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

// Only lets logged-in users see the pages nested inside it
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader text="Checking your session..." />;
  }

  if (!user) {
    // Remember where they wanted to go, so we can send them back after login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
