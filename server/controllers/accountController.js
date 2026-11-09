import bcrypt from "bcryptjs";
import JSZip from "jszip";
import User, { CONTACT_FIELDS, DATE_FORMATS, LANGUAGES, THEMES } from "../models/User.js";
import Resume from "../models/Resume.js";
import Job from "../models/Job.js";
import CoverLetter from "../models/CoverLetter.js";
import OriginalFile from "../models/OriginalFile.js";
import sendEmail from "../utils/sendEmail.js";
import { EMAIL_REGEX, escapeHtml, generateToken, hashToken, maskEmail, passwordProblem, randomToken } from "../utils/security.js";
import { deletePhotosOrQueue, downloadPhoto, isPhotoStorageConfigured, looksLikeImage, saveAvatar } from "../services/photoStorage.js";

// Account settings: profile, email, password, sessions, preferences, and the user's data
// (export and deletion). Every route here is behind the protect middleware (req.user is set).
// A wrong current password is a 400, not a 401: the client logs out on any 401.

const EMAIL_CHANGE_MINUTES = 30; // How long an email change link stays valid
const TAKEN_EMAIL_MESSAGE = "This email address can't be used. Please choose a different one.";

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// Emails that only inform the user: a failure is logged, never shown
const notify = async (email) => {
  try {
    await sendEmail(email);
  } catch (error) {
    console.error(`Email "${email.subject}" failed:`, error.message);
  }
};

// The logged-in user with their password hash, after checking `password` is their current one
async function checkCurrentPassword(req, res, password, extraFields = "") {
  if (typeof password !== "string" || !password) fail(res, 400, "Please enter your current password.");
  const user = await User.findById(req.user._id).select(`+passwordHash ${extraFields}`.trim());
  if (!(await bcrypt.compare(password, user.passwordHash))) fail(res, 400, "Your current password is incorrect.");
  return user;
}

// ---------- Profile ----------

// "linkedin.com/in/x" or "https://..." -> a URL object, or null when it isn't a web link
const parseLink = (value) => {
  if (/\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
};
const onHost = (host) => (url) => url.hostname === host || url.hostname.endsWith(`.${host}`);

// Each contact field: its label, maximum length and check (an empty value is always allowed)
const CONTACT_RULES = {
  phone: { label: "Phone", max: 30, valid: (value) => /^\+?[0-9()\-./\s]{3,}$/.test(value) && /\d{3,}/.test(value.replace(/\D/g, "")) },
  location: { label: "Location", max: 100, valid: (value) => !/[<>]/.test(value) },
  linkedin: { label: "LinkedIn", max: 200, valid: (value) => Boolean(parseLink(value) && onHost("linkedin.com")(parseLink(value))), hint: "a LinkedIn link, e.g. linkedin.com/in/your-name" },
  github: { label: "GitHub", max: 200, valid: (value) => Boolean(parseLink(value) && onHost("github.com")(parseLink(value))), hint: "a GitHub link, e.g. github.com/your-name" },
  website: { label: "Website", max: 200, valid: (value) => Boolean(parseLink(value)), hint: "a web address, e.g. yourname.dev" },
};

// The profile fields from a JSON or multipart body, checked. Returns the changes to apply.
function readProfile(body, res) {
  const changes = {};
  const text = (field, label) => {
    const value = body[field];
    if (typeof value !== "string") fail(res, 400, `${label} must be text.`);
    return value.trim();
  };

  if (body.name !== undefined) {
    const name = text("name", "Name");
    if (!name) fail(res, 400, "Name can't be empty.");
    if (name.length > 50) fail(res, 400, "Please keep your name under 50 characters.");
    changes.name = name;
  }
  for (const field of CONTACT_FIELDS) {
    if (body[field] === undefined) continue;
    const rule = CONTACT_RULES[field];
    const value = text(field, rule.label);
    if (value.length > rule.max) fail(res, 400, `Please keep ${rule.label} under ${rule.max} characters.`);
    if (value && !rule.valid(value)) fail(res, 400, rule.hint ? `${rule.label} must be ${rule.hint}.` : `Please enter a valid ${rule.label.toLowerCase()}.`);
    changes[`contactDefaults.${field}`] = value;
  }
  return changes;
}

// PATCH /api/account/profile (JSON, or multipart/form-data with an optional "avatar" image)
// Fields: name, phone, location, linkedin, github, website (the contact details pre-fill new
// resumes), removeAvatar (true to remove the avatar). Returns { user }.
export const updateProfile = async (req, res) => {
  const body = req.body ?? {};
  const changes = readProfile(body, res);
  const removeAvatar = body.removeAvatar === true || body.removeAvatar === "true";
  const user = req.user;

  if (req.file) {
    if (!isPhotoStorageConfigured()) fail(res, 503, "Avatar uploads aren't set up on this server yet (the Cloudinary keys are missing).");
    if (!looksLikeImage(req.file.buffer, req.file.mimetype)) fail(res, 415, "This file isn't a valid JPG, PNG or WebP image.");
    let avatar;
    try {
      avatar = await saveAvatar(user._id, req.file.buffer, req.file.mimetype);
    } catch (error) {
      console.error("Avatar upload to Cloudinary failed:", error.message);
      fail(res, 502, "We couldn't upload your avatar right now. Please try again.");
    }
    changes.avatarUrl = avatar.url;
    changes.avatarPublicId = avatar.publicId;
  } else if (removeAvatar && user.avatarPublicId) {
    // Removed from the profile even if Cloudinary fails (the deletion is then retried later)
    await deletePhotosOrQueue([user.avatarPublicId]);
    changes.avatarUrl = "";
    changes.avatarPublicId = "";
  }

  user.set(changes);
  await user.save();
  res.json({ user });
};

// ---------- Preferences ----------

// PATCH /api/account/preferences (JSON: theme, language, defaultTemplate, dateFormat (null =
// each template's own)). Used as defaults for new resumes, cover letters and tailoring.
export const updatePreferences = async (req, res) => {
  const body = req.body ?? {};
  const changes = {};
  const choose = (field, allowed) => {
    if (body[field] === undefined) return;
    if (!allowed.includes(body[field])) fail(res, 400, `${field} must be one of: ${allowed.map(String).join(", ")}`);
    changes[`preferences.${field}`] = body[field];
  };
  choose("theme", THEMES);
  choose("language", LANGUAGES);
  choose("dateFormat", [...DATE_FORMATS, null]);
  if (body.defaultTemplate !== undefined) {
    if (typeof body.defaultTemplate !== "string" || !/^[a-z0-9-]{1,60}$/.test(body.defaultTemplate)) fail(res, 400, "defaultTemplate must be a template id, e.g. classic-navy");
    changes["preferences.defaultTemplate"] = body.defaultTemplate;
  }
  if (Object.keys(changes).length === 0) fail(res, 400, "Nothing to update. Send theme, language, defaultTemplate or dateFormat.");

  req.user.set(changes);
  await req.user.save();
  res.json({ user: req.user });
};

// ---------- Email ----------

// POST /api/account/email (JSON: newEmail, currentPassword)
// Emails a confirmation link to the NEW address (the email only changes once it's opened) and
// tells the OLD address about it. An address another account uses gets a generic refusal.
export const requestEmailChange = async (req, res) => {
  const { newEmail, currentPassword } = req.body ?? {};
  const email = typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";
  if (!EMAIL_REGEX.test(email) || email.length > 254) fail(res, 400, "Please enter a valid email.");

  const user = await checkCurrentPassword(req, res, currentPassword);
  if (email === user.email) fail(res, 400, "That's already your email address.");
  if (await User.exists({ email, _id: { $ne: user._id } })) fail(res, 400, TAKEN_EMAIL_MESSAGE);

  const token = randomToken();
  user.pendingEmail = email;
  user.emailChangeTokenHash = hashToken(token);
  user.emailChangeExpires = new Date(Date.now() + EMAIL_CHANGE_MINUTES * 60 * 1000);
  await user.save();

  const confirmUrl = `${process.env.CLIENT_URL}/confirm-email/${token}`;
  try {
    await sendEmail({
      to: email,
      subject: "Confirm your new Resume Builder email",
      text: `Hi ${user.name},\n\nClick the link below to use this address for your Resume Builder account. It expires in ${EMAIL_CHANGE_MINUTES} minutes and works once.\n\n${confirmUrl}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Click the link below to use this address for your Resume Builder account. It expires in ${EMAIL_CHANGE_MINUTES} minutes and works once.</p><p><a href="${confirmUrl}">Confirm my new email</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
    });
  } catch (error) {
    // Don't leave a usable link behind if the email never went out
    user.pendingEmail = undefined;
    user.emailChangeTokenHash = undefined;
    user.emailChangeExpires = undefined;
    await user.save();
    console.error("Email change confirmation failed:", error.message);
    fail(res, 500, "We couldn't send the email right now. Please try again later.");
  }

  await notify({
    to: user.email,
    subject: "Your Resume Builder email is being changed",
    text: `Hi ${user.name},\n\nYour email is being changed to ${maskEmail(email)}. If this wasn't you, change your password.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Your email is being changed to ${escapeHtml(maskEmail(email))}. If this wasn't you, change your password.</p>`,
  });

  res.json({ message: `We've sent a confirmation link to ${email}. Your email changes once you open it.`, pendingEmail: email });
};

// POST /api/account/email/confirm (JSON: token) - opened from the link, while logged in
// The token works once, for 30 minutes, and only for the account that asked for the change.
export const confirmEmailChange = async (req, res) => {
  const token = req.body?.token;
  const user = await User.findById(req.user._id).select("+emailChangeTokenHash +emailChangeExpires");
  const clear = () => {
    user.pendingEmail = undefined;
    user.emailChangeTokenHash = undefined;
    user.emailChangeExpires = undefined;
  };

  // "code" lets the client show the right message for each case
  if (typeof token !== "string" || !user.emailChangeTokenHash || hashToken(token) !== user.emailChangeTokenHash) {
    return res.status(400).json({ code: "INVALID_TOKEN", message: "This confirmation link is invalid or has already been used." });
  }
  if (!user.emailChangeExpires || user.emailChangeExpires < new Date()) {
    clear();
    await user.save();
    return res.status(400).json({ code: "EXPIRED_TOKEN", message: `This confirmation link has expired. Links are valid for ${EMAIL_CHANGE_MINUTES} minutes.` });
  }

  const email = user.pendingEmail;
  clear(); // The link works once, whatever happens next
  if (await User.exists({ email, _id: { $ne: user._id } })) {
    await user.save();
    fail(res, 400, TAKEN_EMAIL_MESSAGE);
  }
  user.email = email;
  // A reset link sent to the old address shouldn't work any more
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) fail(res, 400, TAKEN_EMAIL_MESSAGE); // Taken in the meantime
    throw error;
  }

  res.json({ message: "Your email address has been changed.", user });
};

// ---------- Password and sessions ----------

// POST /api/account/password (JSON: currentPassword, newPassword)
// The same rules as at registration, and it must differ from the current one. Logs out every
// other device; returns a new token for this one.
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (passwordProblem(newPassword)) fail(res, 400, passwordProblem(newPassword));

  const user = await checkCurrentPassword(req, res, currentPassword);
  if (await bcrypt.compare(newPassword, user.passwordHash)) fail(res, 400, "Your new password must be different from your current one.");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // Every existing login stops working
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await notify({
    to: user.email,
    subject: "Your Resume Builder password was changed",
    text: `Hi ${user.name},\n\nThe password for your Resume Builder account was just changed, and every other device was logged out.\n\nIf this wasn't you, reset your password right away: ${process.env.CLIENT_URL}/forgot-password`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>The password for your Resume Builder account was just changed, and every other device was logged out.</p><p>If this wasn't you, <a href="${process.env.CLIENT_URL}/forgot-password">reset your password</a> right away.</p>`,
  });

  res.json({ message: "Your password has been changed. Other devices have been logged out.", token: generateToken(user) });
};

// POST /api/account/logout-all
// Every token issued so far (including this one) stops working
export const logoutAll = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ message: "You've been logged out on every device." });
};

// ---------- Your data ----------

// A file name that's safe inside a ZIP (no folders, no odd characters)
const safeFileName = (name) => String(name).replace(/[^\p{L}\p{N} ._()-]/gu, "_").replace(/^\.+/, "").slice(0, 150) || "file";

// GET /api/account/export
// A ZIP with everything the user has: profile, resumes, jobs, cover letters and ATS results as
// JSON, plus their uploaded originals, resume photos and avatar
export const exportData = async (req, res) => {
  const userId = req.user._id;
  const [resumes, jobs, coverLetters, originals] = await Promise.all([
    Resume.find({ userId }).lean(),
    Job.find({ userId }).lean(),
    CoverLetter.find({ userId }).lean(),
    OriginalFile.find({ userId }), // Not lean: `data` stays a Buffer
  ]);

  const zip = new JSZip();
  const json = (name, data) => zip.file(name, JSON.stringify(data, null, 2));
  const missing = [];

  json("profile.json", req.user.toJSON());
  json("resumes.json", resumes.map(({ photoPublicId: _storageId, ...resume }) => resume));
  json("jobs.json", jobs);
  json("cover-letters.json", coverLetters);
  json(
    "ats-results.json",
    resumes
      .filter((resume) => resume.atsScore || resume.atsOptimization)
      .map((resume) => ({ resumeId: resume._id, title: resume.title, atsScore: resume.atsScore ?? null, atsOptimization: resume.atsOptimization ?? null }))
  );

  for (const file of originals) {
    zip.file(`originals/${file.resumeId}/${safeFileName(file.fileName)}`, file.data);
  }
  const photos = [
    ...resumes.filter((resume) => resume.personalInfo?.photoUrl).map((resume) => ({ url: resume.personalInfo.photoUrl, name: `photos/${resume._id}` })),
    ...(req.user.avatarUrl ? [{ url: req.user.avatarUrl, name: "avatar" }] : []),
  ];
  for (const photo of photos) {
    const downloaded = await downloadPhoto(photo.url);
    if (downloaded) zip.file(`${photo.name}.${downloaded.extension}`, downloaded.data);
    else missing.push({ file: photo.name, url: photo.url });
  }

  json("export-info.json", {
    exportedAt: new Date().toISOString(),
    counts: { resumes: resumes.length, jobs: jobs.length, coverLetters: coverLetters.length, originals: originals.length, photos: photos.length - missing.length },
    // Photos that couldn't be downloaded right now (their links are still listed here)
    missingFiles: missing,
  });

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  res.set({
    "Content-Type": "application/zip",
    "Content-Length": String(buffer.length),
    "Content-Disposition": `attachment; filename="resume-builder-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    "Cache-Control": "private, no-store",
  });
  res.send(buffer);
};

// DELETE /api/account (JSON: currentPassword, confirm: "DELETE")
// Permanently removes the user and everything they own: resumes, uploaded originals, jobs,
// cover letters, and their photos and avatar on Cloudinary. Then emails a confirmation.
export const deleteAccount = async (req, res) => {
  const { currentPassword, confirm } = req.body ?? {};
  if (confirm !== "DELETE") fail(res, 400, 'Please type DELETE to confirm.');
  const user = await checkCurrentPassword(req, res, currentPassword);
  const userId = user._id;

  // Stored photos first (while we still know their ids)
  const resumes = await Resume.find({ userId }, { photoPublicId: 1 }).lean();
  // Any that can't be deleted now are queued and retried later (never forgotten)
  await deletePhotosOrQueue([...resumes.map((resume) => resume.photoPublicId), user.avatarPublicId]);

  await Promise.all([
    Resume.deleteMany({ userId }),
    OriginalFile.deleteMany({ userId }),
    Job.deleteMany({ userId }),
    CoverLetter.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId });

  await notify({
    to: user.email,
    subject: "Your Resume Builder account was deleted",
    text: `Hi ${user.name},\n\nYour Resume Builder account and all its data (resumes, uploaded files, jobs, cover letters and photos) have been permanently deleted.\n\nThanks for using Resume Builder.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Your Resume Builder account and all its data (resumes, uploaded files, jobs, cover letters and photos) have been permanently deleted.</p><p>Thanks for using Resume Builder.</p>`,
  });

  res.json({ message: "Your account and all its data have been deleted." });
};
