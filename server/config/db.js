import dns from "node:dns";
import mongoose from "mongoose";

// "mongodb+srv://" strings need a DNS SRV lookup. Some routers/local DNS
// services (e.g. 127.0.0.1) refuse these, causing "querySrv ECONNREFUSED".
// Using public DNS servers for Node's lookups avoids that.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Connects to MongoDB using the MONGO_URI from .env
// (local Docker database in development, Atlas in production)
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // Stop the server if the database is unreachable
  }
};

export default connectDB;
