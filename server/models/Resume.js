import mongoose from "mongoose";

// Sub-schemas for the repeating sections of a resume
const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true, default: "" },
  role: { type: String, trim: true, default: "" },
  startDate: { type: String, trim: true, default: "" }, // Free text, e.g. "Jan 2024"
  endDate: { type: String, trim: true, default: "" }, // e.g. "Present"
  bullets: { type: [String], default: [] },
});

const educationSchema = new mongoose.Schema({
  school: { type: String, trim: true, default: "" },
  degree: { type: String, trim: true, default: "" },
  year: { type: String, trim: true, default: "" },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  link: { type: String, trim: true, default: "" },
});

// Anything that doesn't fit the sections above: certifications, languages, awards...
const additionalSectionSchema = new mongoose.Schema({
  heading: { type: String, trim: true, default: "" }, // e.g. "Certifications"
  items: { type: [String], default: [] },
});

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // We always look up resumes by their owner
    },
    title: { type: String, trim: true, default: "Untitled Resume" },
    template: { type: String, trim: true, default: "classic-navy" },
    personalInfo: {
      fullName: { type: String, trim: true, default: "" },
      headline: { type: String, trim: true, default: "" }, // e.g. "Full Stack Developer"
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" },
    },
    summary: { type: String, trim: true, default: "" },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
    additional: { type: [additionalSectionSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;
