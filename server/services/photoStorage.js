import { v2 as cloudinary } from "cloudinary";

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

// Deletes a stored photo. A photo that's already gone isn't an error.
export async function deletePhoto(publicId) {
  if (!publicId) return;
  await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
