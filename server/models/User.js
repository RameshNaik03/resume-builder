import mongoose from "mongoose";

// Choices for the account preferences (see controllers/accountController.js)
export const THEMES = ["light", "dark", "system"];
export const LANGUAGES = ["en", "de"];
export const DATE_FORMATS = ["short", "numeric", "year"]; // Same as a resume's design.dateFormat
export const CONTACT_FIELDS = ["phone", "location", "linkedin", "github", "website"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never included in queries unless we ask for it
    },
    // Forgot password: we store a hash of the emailed token, never the token itself
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // Logins (JWTs) issued before this time stop working after a password reset
    passwordChangedAt: Date,
    // Every login token carries this number; raising it logs out every device at once
    // ("log out everywhere", a password change)
    tokenVersion: { type: Number, default: 0 },

    // Email change: the new address waits here until the link sent to it is opened.
    // Like the reset token, only a hash of the emailed token is stored.
    pendingEmail: { type: String, lowercase: true, trim: true },
    emailChangeTokenHash: { type: String, select: false },
    emailChangeExpires: { type: Date, select: false },

    // Profile picture on Cloudinary (square). The public id is kept out of API responses.
    avatarUrl: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    // Contact details that pre-fill every new resume
    contactDefaults: {
      phone: { type: String, trim: true, maxlength: 30, default: "" },
      location: { type: String, trim: true, maxlength: 100, default: "" },
      linkedin: { type: String, trim: true, maxlength: 200, default: "" },
      github: { type: String, trim: true, maxlength: 200, default: "" },
      website: { type: String, trim: true, maxlength: 200, default: "" },
    },
    // Defaults used across the app (new resumes, cover letters, tailoring) and by the client
    preferences: {
      theme: { type: String, enum: THEMES, default: "system" },
      language: { type: String, enum: LANGUAGES, default: "en" },
      defaultTemplate: { type: String, trim: true, default: "classic-navy" },
      // Not set = each template's own date format
      dateFormat: { type: String, enum: [...DATE_FORMATS, null], default: null },
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Remove private fields whenever a user is sent as JSON
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetPasswordTokenHash;
    delete ret.resetPasswordExpires;
    delete ret.passwordChangedAt;
    delete ret.tokenVersion;
    delete ret.emailChangeTokenHash;
    delete ret.emailChangeExpires;
    delete ret.avatarPublicId;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
