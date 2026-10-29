import "dotenv/config"; // Loads variables from .env into process.env (first, before the app reads them)
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import checkEnv from "./config/checkEnv.js";

const PORT = process.env.PORT || 5000;

// Check the settings, connect to the database, then start the server
const startServer = async () => {
  checkEnv();
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

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
