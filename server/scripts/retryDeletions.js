// npm run cloudinary:retry
// Retries the Cloudinary deletions that failed earlier (the pendingdeletions collection) and
// prints what's left. The server also does this on every start.
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import PendingDeletion from "../models/PendingDeletion.js";
import { isPhotoStorageConfigured, retryPendingDeletions } from "../services/photoStorage.js";

await connectDB();
if (!isPhotoStorageConfigured()) console.warn("Cloudinary isn't configured (CLOUDINARY_* in .env), so nothing can be deleted.");
const { deleted, failed, skipped } = await retryPendingDeletions();
console.log(`Deleted: ${deleted}. Still failing: ${failed}. Not tried: ${skipped}.`);
for (const entry of await PendingDeletion.find().lean()) {
  console.log(`- ${entry.publicId} (${entry.attempts} attempts): ${entry.lastError}`);
}
await mongoose.disconnect();
process.exitCode = failed ? 1 : 0;
