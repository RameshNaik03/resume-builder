import mongoose from "mongoose";
import { richBlock } from "../utils/richText.js";

// A cover letter, linked to the resume it's based on and (when tailored) the job it's for.
// The body is rich text, sanitized on every save like a resume's summary.
export const TONES = ["professional", "warm", "confident"];
export const LENGTHS = ["short", "standard", "detailed"];
export const LANGUAGES = ["en", "de"];
export const SALUTATIONS = ["", "Frau", "Herr"]; // "" = none (the full name is used)

const coverLetterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    title: { type: String, trim: true, maxlength: 150, default: "Cover letter" },
    recipientName: { type: String, trim: true, maxlength: 120, default: "" },
    recipientSalutation: { type: String, enum: SALUTATIONS, default: "" },
    companyName: { type: String, trim: true, maxlength: 120, default: "" },
    subject: { type: String, trim: true, maxlength: 200, default: "" }, // "Application for ..." / "Bewerbung als ..."
    date: { type: Date, default: Date.now }, // The date printed on the letter
    // The user's guided answers (their own words), reused when regenerating
    whyCompany: { type: String, trim: true, maxlength: 600, default: "" },
    achievement: { type: String, trim: true, maxlength: 600, default: "" }, // Their strongest achievement for this job
    companyInterest: { type: String, trim: true, maxlength: 400, default: "" }, // Something specific about the company
    availability: { type: String, trim: true, maxlength: 120, default: "" }, // Earliest start date
    salary: { type: String, trim: true, maxlength: 80, default: "" }, // Salary expectation (German letters)
    openingOptions: { type: [String], default: [] }, // Three openings to choose from (the first is in the body)
    evidenceWords: { type: Number, default: null }, // Set when the requested length couldn't be reached (no more evidence)
    body: { type: String, default: "", set: richBlock, maxlength: 20000 },
    bodyEdited: { type: Boolean, default: false }, // The body was changed by hand since it was generated
    tone: { type: String, enum: TONES, default: "professional" },
    length: { type: String, enum: LENGTHS, default: "standard" },
    language: { type: String, enum: LANGUAGES, default: "en" },
  },
  { timestamps: true, versionKey: false }
);

const CoverLetter = mongoose.model("CoverLetter", coverLetterSchema);

export default CoverLetter;
