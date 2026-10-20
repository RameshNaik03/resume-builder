import axios from "axios";

// One shared Axios instance for every request to our API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Before each request: attach the saved JWT (if we have one)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// After each response: if the server rejected our token, log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat it as an expired session if we actually sent a token.
    // (A wrong password on the login page is also a 401, but has no token.)
    const sentToken = error.config?.headers?.Authorization;

    if (error.response?.status === 401 && sentToken) {
      localStorage.removeItem("token");
      // AuthContext listens for this event and clears the user
      window.dispatchEvent(new Event("auth:logout"));
    }

    return Promise.reject(error);
  }
);

export default api;
