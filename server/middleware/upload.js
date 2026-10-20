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
