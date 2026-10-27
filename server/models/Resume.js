import mongoose from "mongoose";
import { richBlock, richInline } from "../utils/richText.js";

// Summary, bullet points and project descriptions hold rich text (small, sanitized HTML).
// The setters sanitize every value that's saved (create, update, import, duplicate),
// and turn plain text into HTML (see utils/richText.js).

// Sub-schemas for the repeating sections of a resume
const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true, default: "" },
  role: { type: String, trim: true, default: "" },
  startDate: { type: String, trim: true, default: "" }, // Free text, e.g. "Jan 2024"
  endDate: { type: String, trim: true, default: "" }, // e.g. "Present"
  bullets: { type: [{ type: String, set: richInline }], default: [] }, // Rich text (inline)
});

const educationSchema = new mongoose.Schema({
  school: { type: String, trim: true, default: "" },
  degree: { type: String, trim: true, default: "" },
  year: { type: String, trim: true, default: "" },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "", set: richBlock }, // Rich text
  link: { type: String, trim: true, default: "" },
});

// Anything that doesn't fit the sections above: certifications, languages, awards...
const additionalSectionSchema = new mongoose.Schema({
  heading: { type: String, trim: true, default: "" }, // e.g. "Certifications"
  items: { type: [String], default: [] },
});

// Per-resume design overrides. Every field is optional: a missing field means
// "use the template's default", so an empty design looks exactly like the template.
// The ranges match the controls in the editor's Design tab.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FONT_ID = /^[a-z0-9-]{1,40}$/; // e.g. "inter", "source-sans-3"
const color = { type: String, trim: true, match: [HEX_COLOR, "Colors must be hex values like #1e3a8a"] };
const font = { type: String, trim: true, match: [FONT_ID, "Unknown font"] };
const margin = { type: Number, min: 5, max: 40 }; // Millimetres

// Layout and section settings
const SECTION_IDS = ["summary", "experience", "education", "skills", "projects", "additional"];
// A list of section ids without repeats. default: undefined = not set (template default),
// because Mongoose would otherwise start every array as [].
const sectionList = (name) => ({
  type: [{ type: String, enum: SECTION_IDS }],
  default: undefined,
  validate: { validator: (ids) => new Set(ids).size === ids.length, message: `${name} can't list a section twice` },
});
const sectionHeading = { type: String, trim: true, maxlength: 40 };
const sectionHeadingsSchema = new mongoose.Schema(
  {
    summary: sectionHeading,
    experience: sectionHeading,
    education: sectionHeading,
    skills: sectionHeading,
    projects: sectionHeading,
    // "additional" has none: each additional section already has its own heading
  },
  { _id: false }
);

const designSchema = new mongoose.Schema(
  {
    fontFamily: font,
    headingFontFamily: font,
    baseFontSize: { type: Number, min: 8, max: 14 }, // Points
    headingSize: { type: Number, min: 70, max: 160 }, // Percent of the template's heading size
    lineHeight: { type: Number, min: 1, max: 2 },
    paragraphSpacing: { type: Number, min: 0.5, max: 2 }, // Multiplier (1 = normal)
    sectionSpacing: { type: Number, min: 0.5, max: 2 },
    pageSize: { type: String, enum: ["A4", "Letter"] },
    marginTop: margin,
    marginRight: margin,
    marginBottom: margin,
    marginLeft: margin,
    accentColor: color,
    textColor: color,
    headingColor: color,
    backgroundColor: color,
    dividerStyle: { type: String, enum: ["none", "line", "thick", "dotted"] },
    dividerColor: color,

    sectionOrder: {
      ...sectionList("Section order"),
      validate: {
        validator: (ids) => ids.length === SECTION_IDS.length && new Set(ids).size === ids.length,
        message: "Section order must list every section once",
      },
    },
    hiddenSections: sectionList("Hidden sections"),
    sectionHeadings: { type: sectionHeadingsSchema, default: undefined },
    columns: { type: Number, enum: [1, 2] },
    sideSections: sectionList("Side column"),
    sideRatio: { type: Number, enum: [30, 35, 40] }, // Side column width in % (main gets the rest)
    headerAlign: { type: String, enum: ["left", "center", "right"] },
    skillsDisplay: { type: String, enum: ["comma", "tags", "bullets"] },
    dateFormat: { type: String, enum: ["short", "numeric", "year"] }, // "Jan 2024" | "01/2024" | "2024"
    bulletStyle: { type: String, enum: ["disc", "dash", "arrow", "none"] },

    // Profile photo
    showPhoto: { type: Boolean },
    photoShape: { type: String, enum: ["circle", "rounded", "square"] },
    photoSize: { type: Number, min: 15, max: 45 }, // Millimetres
    photoBorder: { type: Boolean },
    photoBorderColor: color,
    photoPosition: { type: String, enum: ["left", "right", "sidebar"] }, // "sidebar" = in the Sidebar layout's coloured column
  },
  { _id: false }
);

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
      // Set only by the photo routes (POST/DELETE /api/resumes/:id/photo), never by a normal update
      photoUrl: { type: String, trim: true, default: "" },
    },
    // Cloudinary id of the photo, used to replace or delete it (kept out of API responses)
    photoPublicId: { type: String, default: "" },
    summary: { type: String, trim: true, default: "", set: richBlock }, // Rich text
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
    additional: { type: [additionalSectionSchema], default: [] },
    // Every resume (created, imported or duplicated) has one; {} = template defaults
    design: { type: designSchema, default: () => ({}) },
  },
  // minimize: false keeps empty objects, so `design: {}` is stored and returned
  // (Mongoose drops empty objects by default)
  { timestamps: true, versionKey: false, minimize: false }
);

// photoPublicId is an internal storage detail, so it's left out when a resume is sent as JSON
resumeSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.photoPublicId;
    return ret;
  },
});

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;
