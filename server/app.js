import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import atsRoutes from "./routes/atsRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// The Express app: middleware and routes. server.js loads .env, connects to the database and
// starts it; the tests import it directly (so they never read the real .env).
const app = express();

// Hosting platforms (Render, Railway...) put a proxy in front of the app.
// This lets Express (and the rate limiter) see the real visitor IP address.
app.set("trust proxy", 1);
// Don't advertise the framework in every response ("X-Powered-By: Express")
app.disable("x-powered-by");

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Only allow requests from our React app
    credentials: true,
  })
);

// Routes
// For uptime monitors and the host's health check: 503 while the database is unreachable
app.get("/api/health", (req, res) => {
  const databaseUp = mongoose.connection.readyState === 1;
  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? "ok" : "degraded",
    message: databaseUp ? "Server is running" : "Server is running, but the database is unreachable",
    database: databaseUp ? "connected" : "disconnected",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/ats", atsRoutes);
app.use("/api/jobs", jobRoutes);

// Error handling (must come after all routes)
app.use(notFound);
app.use(errorHandler);

export default app;
