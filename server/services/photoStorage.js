import { v2 as cloudinary } from "cloudinary";
import PendingDeletion from "../models/PendingDeletion.js";

// Profile photos are stored on Cloudinary (free tier), never on our server.
// Each resume has at most one photo, saved under a fixed id based on the resume id,
// so uploading a new photo replaces the old one.

const FOLDER = "resume-builder/photos";

export const isPhotoStorageConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Reads the keys when first needed (after dotenv has loaded .env)
let configured = false;
const client = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true, // https URLs
    });
    configured = true;
  }
  return cloudinary;
};

const photoId = (resumeId) => `${FOLDER}/${resumeId}`;

// Settings for every stored photo: square, at most 800 × 800 px
const UPLOAD_OPTIONS = {
  resource_type: "image",
  overwrite: true,
  invalidate: true, // Clear Cloudinary's CDN cache when a photo is replaced
  transformation: [{ width: 800, height: 800, crop: "fill", gravity: "center" }],
};

// Uploads an image buffer as the resume's photo. Returns { url, publicId }.
// The URL contains a version number, so a replaced photo gets a new URL (no stale caches).
export async function savePhoto(resumeId, buffer, mimetype) {
  const dataUri = `data:${mimetype};base64,${buffer.toString("base64")}`;
  const result = await client().uploader.upload(dataUri, { ...UPLOAD_OPTIONS, public_id: photoId(resumeId) });
  return { url: result.secure_url, publicId: result.public_id };
}

// Copies an existing photo to another resume (used when a resume is duplicated,
// so deleting one copy's photo never breaks the other)
export async function copyPhoto(sourceUrl, resumeId) {
  const result = await client().uploader.upload(sourceUrl, { ...UPLOAD_OPTIONS, public_id: photoId(resumeId) });
  return { url: result.secure_url, publicId: result.public_id };
}

// Deletes a stored photo (or avatar). A photo that's already gone isn't an error.
export async function deletePhoto(publicId) {
  if (!publicId) return;
  await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

// ---------- Deletions that must not be lost ----------

// Records an image that couldn't be deleted, so it's retried later (see retryPendingDeletions)
async function recordPendingDeletion(publicId, error) {
  await PendingDeletion.updateOne(
    { publicId },
    { $set: { lastError: String(error?.message ?? error).slice(0, 500) }, $inc: { attempts: 1 } },
    { upsert: true }
  );
}

// Deletes stored images; any that fail (or can't be deleted because Cloudinary isn't configured)
// are recorded for a retry instead of being forgotten. Never throws.
// Returns how many were deleted now.
export async function deletePhotosOrQueue(publicIds) {
  const ids = [...new Set(publicIds.filter(Boolean))];
  if (!ids.length) return 0;
  if (!isPhotoStorageConfigured()) {
    for (const id of ids) await recordPendingDeletion(id, "Cloudinary isn't configured").catch(() => {});
    console.warn(`${ids.length} Cloudinary image(s) queued for deletion: Cloudinary isn't configured.`);
    return 0;
  }
  let deleted = 0;
  await Promise.all(
    ids.map(async (id) => {
      try {
        await deletePhoto(id);
        deleted++;
      } catch (error) {
        console.error(`Deleting ${id} from Cloudinary failed (queued for a retry):`, error.message);
        await recordPendingDeletion(id, error).catch((dbError) => console.error(`Couldn't queue ${id} for deletion:`, dbError.message));
      }
    })
  );
  return deleted;
}

// Tries every queued deletion again (on server start and with `npm run cloudinary:retry`).
// Returns { deleted, failed, skipped } (skipped: Cloudinary isn't configured, nothing was tried).
export async function retryPendingDeletions() {
  const pending = await PendingDeletion.find().lean();
  if (!pending.length) return { deleted: 0, failed: 0, skipped: 0 };
  if (!isPhotoStorageConfigured()) return { deleted: 0, failed: 0, skipped: pending.length };
  let deleted = 0;
  let failed = 0;
  for (const { _id, publicId } of pending) {
    try {
      await deletePhoto(publicId);
      await PendingDeletion.deleteOne({ _id });
      deleted++;
    } catch (error) {
      await PendingDeletion.updateOne({ _id }, { $set: { lastError: String(error.message).slice(0, 500) }, $inc: { attempts: 1 } });
      failed++;
    }
  }
  return { deleted, failed, skipped: 0 };
}

// ---------- Account avatars ----------
// One per user, under a fixed id based on the user id (a new one replaces the old one),
// cropped to a 400 × 400 square

const AVATAR_FOLDER = "resume-builder/avatars";
export const avatarId = (userId) => `${AVATAR_FOLDER}/${userId}`;

export async function saveAvatar(userId, buffer, mimetype) {
  const dataUri = `data:${mimetype};base64,${buffer.toString("base64")}`;
  const result = await client().uploader.upload(dataUri, {
    ...UPLOAD_OPTIONS,
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "center" }],
    public_id: avatarId(userId),
  });
  return { url: result.secure_url, publicId: result.public_id };
}

// Real JPG, PNG and WebP files start with these bytes. Checking them catches files
// that were only renamed (e.g. a PDF saved as photo.jpg).
export const looksLikeImage = (buffer, mimetype) => {
  if (mimetype === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
};

// Downloads one of our stored photos (for the data export). Only Cloudinary URLs are fetched,
// never any other address. Returns { data, extension } or null when it can't be downloaded.
export async function downloadPhoto(url) {
  if (typeof url !== "string" || !url.startsWith("https://res.cloudinary.com/")) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const data = Buffer.from(await response.arrayBuffer());
    const extension = (url.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? "jpg").toLowerCase();
    return { data, extension };
  } catch {
    return null;
  }
}
