import multer from "multer";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

// Only accept .pdf and .docx files (checked by both MIME type and file extension)
const fileFilter = (req, file, cb) => {
  const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
  const expectedExtension = ALLOWED_TYPES[file.mimetype];

  if (expectedExtension && extension === expectedExtension) {
    cb(null, true);
  } else {
    const error = new Error("Only PDF and DOCX files are supported");
    error.status = 415; // Unsupported Media Type
    cb(error);
  }
};

// memoryStorage keeps the file in RAM (req.file.buffer); it's never written to disk
export const uploadResumeFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  defParamCharset: "utf8", // So file names like "Résumé.pdf" are read correctly
  fileFilter,
}).single("file"); // The form field must be called "file"

// ---------- Profile photos ----------

export const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

const PHOTO_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const photoFilter = (req, file, cb) => {
  const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
  if (PHOTO_TYPES[file.mimetype]?.includes(extension)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error("Only JPG, PNG and WebP images are supported"), { status: 415 }));
  }
};

// An image upload in the form field `field`, with image-specific "too large" and "wrong field"
// messages (the central error handler's are about the 5 MB resume file limit).
// Other form fields are read into req.body as text.
const imageUpload = (field, label) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_SIZE, files: 1, fields: 20, fieldSize: 10 * 1024 },
    fileFilter: photoFilter,
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (error?.code === "LIMIT_FILE_SIZE") {
        return next(Object.assign(new Error(`${label} is too large. The maximum size is 2 MB.`), { status: 413 }));
      }
      if (error?.code === "LIMIT_UNEXPECTED_FILE") {
        return next(Object.assign(new Error(`Please upload one image in a form field named "${field}".`), { status: 400 }));
      }
      next(error);
    });
  };
};

// Resume photos: the form field must be called "photo"
export const uploadPhotoFile = imageUpload("photo", "Photo");

// Account avatars (PATCH /api/account/profile): optional, in a field called "avatar"
export const uploadAvatarFile = imageUpload("avatar", "Avatar");
