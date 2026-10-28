import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import atsRoutes from "./routes/atsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// The Express app: middleware and routes. server.js loads .env, connects to the database and
// starts it; the tests import it directly (so they never read the real .env).
const app = express();

// Hosting platforms (Render, Railway...) put a proxy in front of the app.
// This lets Express (and the rate limiter) see the real visitor IP address.
app.set("trust proxy", 1);

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Only allow requests from our React app
    credentials: true,
  })
);

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/ats", atsRoutes);

// Error handling (must come after all routes)
app.use(notFound);
app.use(errorHandler);

export default app;
