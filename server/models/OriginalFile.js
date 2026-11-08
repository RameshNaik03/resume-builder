import mongoose from "mongoose";

// The file a resume was imported from (PDF or DOCX, at most 5 MB), kept unchanged so the user
// can view it, check it and download it later. Stored in its own collection, not inside the
// resume, so lists of resumes stay small. Private: it's only ever served to its owner, through
// GET /api/resumes/:id/original (there's no public URL). Deleted with its resume.
const originalFileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, unique: true },
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    mimetype: { type: String, required: true, enum: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
    size: { type: Number, required: true, max: 5 * 1024 * 1024 },
    data: { type: Buffer, required: true },
  },
  { timestamps: true, versionKey: false }
);

const OriginalFile = mongoose.model("OriginalFile", originalFileSchema);

export default OriginalFile;
