import mongoose from "mongoose";

// A Cloudinary image (resume photo or avatar) that should be deleted but couldn't be: Cloudinary
// failed or wasn't configured. Retried when the server starts and with `npm run cloudinary:retry`
// (see services/photoStorage.js), and removed once the image is gone.
const pendingDeletionSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 1 }, // Failed attempts so far
    lastError: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

const PendingDeletion = mongoose.model("PendingDeletion", pendingDeletionSchema);

export default PendingDeletion;
