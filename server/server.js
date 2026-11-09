import "dotenv/config"; // Loads variables from .env into process.env (first, before the app reads them)
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import checkEnv from "./config/checkEnv.js";
import { retryPendingDeletions } from "./services/photoStorage.js";

const PORT = process.env.PORT || 5000;

// Check the settings, connect to the database, then start the server
const startServer = async () => {
  checkEnv();
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Cloudinary photos whose deletion failed earlier: try again (in the background)
  retryPendingDeletions()
    .then(({ deleted, failed, skipped }) => {
      if (deleted || failed) console.log(`Queued Cloudinary deletions: ${deleted} done, ${failed} still failing`);
      if (skipped) console.warn(`${skipped} queued Cloudinary deletion(s) waiting: Cloudinary isn't configured`);
    })
    .catch((error) => console.error("Retrying queued Cloudinary deletions failed:", error.message));

  // Hosting platforms send SIGTERM before stopping or redeploying the app (Ctrl+C sends
  // SIGINT): finish the requests in progress and close the database connection first
  const shutDown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // Don't wait forever for slow requests
  };
  process.on("SIGTERM", shutDown);
  process.on("SIGINT", shutDown);
};

startServer();
