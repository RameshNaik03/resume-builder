import mongoose from "mongoose";
import { richBlock } from "../utils/richText.js";

// A cover letter, linked to the resume it's based on and (when tailored) the job it's for.
// The body is rich text, sanitized on every save like a resume's summary.
export const TONES = ["professional", "warm", "confident"];
export const LENGTHS = ["short", "standard", "detailed"];
export const LANGUAGES = ["en", "de"];

const coverLetterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    title: { type: String, trim: true, maxlength: 150, default: "Cover letter" },
    recipientName: { type: String, trim: true, maxlength: 120, default: "" },
    companyName: { type: String, trim: true, maxlength: 120, default: "" },
    body: { type: String, default: "", set: richBlock, maxlength: 20000 },
    tone: { type: String, enum: TONES, default: "professional" },
    length: { type: String, enum: LENGTHS, default: "standard" },
    language: { type: String, enum: LANGUAGES, default: "en" },
  },
  { timestamps: true, versionKey: false }
);

const CoverLetter = mongoose.model("CoverLetter", coverLetterSchema);

export default CoverLetter;
