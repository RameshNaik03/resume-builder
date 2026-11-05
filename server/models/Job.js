import mongoose from "mongoose";

// A job a resume was tailored to: the pasted description, its analysis, the honest match
// report, and the skills the user confirmed having. Linked to the source resume and to the
// tailored copy (see controllers/jobController.js).
const jobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceResumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
    tailoredResumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    description: { type: String, required: true },
    // { title, company, seniority, mustHave, niceToHave, responsibilities, keywords, analyzedWith }
    analysis: { type: mongoose.Schema.Types.Mixed, required: true },
    // { score, matched: [{ skill, required, evidence }], missingMustHave, missingNiceToHave, keywords }
    matchReport: { type: mongoose.Schema.Types.Mixed, required: true },
    // How it was tailored: { tailoredWith: "rules" | "rules+ai", strength, rejectedRewrites: [{ section, problem }] }
    tailoring: { type: mongoose.Schema.Types.Mixed, default: null },
    // Skills from the job the user said they have, with where they used them
    confirmedSkills: {
      type: [
        new mongoose.Schema(
          {
            skill: { type: String, required: true, trim: true, maxlength: 60 },
            note: { type: String, required: true, trim: true, maxlength: 300 },
            addedToJob: { type: String, default: "" }, // The job or project the bullet went under ("" if Skills only)
            confirmedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // Missing skills the user said they don't have (only remembered; they still count as missing)
    declinedSkills: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
