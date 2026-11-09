import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "../utils/toast";
import api from "../api/axios";
import { setTheme } from "../utils/theme";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there's a saved token to check. Without one we already know
  // the user is logged out, so pages can show straight away (no spinner flash).
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));

  // On app load: if a token is saved, ask the server who it belongs to
  useEffect(() => {
    const checkAuth = async () => {
      if (!localStorage.getItem("token")) return;

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        // Invalid token: the axios interceptor already removed it
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // The axios interceptor fires this event when the server rejects our token
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      // The id stops the same toast from showing twice
      toast.error("Your session has expired. Please log in again.", { id: "session-expired" });
    };

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  // The account's theme (Settings > Preferences) follows the user to every device
  const themeChoice = user?.preferences?.theme;
  useEffect(() => {
    if (themeChoice) setTheme(themeChoice);
  }, [themeChoice]);

  // Saves the token and user returned by /login or /register
  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    saveSession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // After a settings change: the user as the server returned it
  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  // After a password change: the new token for this device (the old one stopped working)
  const replaceToken = useCallback((token) => localStorage.setItem("token", token), []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, replaceToken }}>{children}</AuthContext.Provider>;
}

// Shortcut so components can write: const { user } = useAuth();
// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext);
