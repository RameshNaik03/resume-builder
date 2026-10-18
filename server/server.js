import "dotenv/config"; // Loads variables from .env into process.env
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import atsRoutes from "./routes/atsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

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

// Connect to the database first, then start the server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
