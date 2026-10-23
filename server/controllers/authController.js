import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_MINUTES = 15; // How long a reset link stays valid

// Reset tokens are stored hashed, so a leaked database can't be used to reset passwords
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Makes user-typed text (like a name) safe to put inside an HTML email
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Creates a JWT that stores the user's id and expires in 7 days
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/auth/register
export const register = async (req, res) => {
  // req.body is undefined in Express 5 if no JSON body was sent
  const { name, email, password } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    res.status(400);
    throw new Error("Please enter a valid email");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ token: generateToken(user._id), user });
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email?.trim() || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  // passwordHash has select: false, so we have to ask for it here
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");

  // Same message for both cases so attackers can't tell which emails exist
  const isMatch = user && (await bcrypt.compare(password, user.passwordHash));
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({ token: generateToken(user._id), user });
};

// POST /api/auth/forgot-password
// Emails a one-time link for choosing a new password
export const forgotPassword = async (req, res) => {
  const { email } = req.body ?? {};

  if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
    res.status(400);
    throw new Error("Please enter a valid email");
  }

  // Same reply whether or not the account exists, so attackers can't tell which emails exist
  const reply = {
    message: "If an account exists for this email, we've sent a reset link. Check your inbox and spam folder.",
  };

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.json(reply);

  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = hashToken(token);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your Resume Builder password",
      text: `Hi ${user.name},\n\nClick the link below to choose a new password. It expires in ${RESET_TOKEN_MINUTES} minutes.\n\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Click the link below to choose a new password. It expires in ${RESET_TOKEN_MINUTES} minutes.</p><p><a href="${resetUrl}">Reset my password</a></p><p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`,
    });
  } catch (error) {
    // Don't leave a usable token behind if the email never went out
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.error("Password reset email failed:", error.message);
    res.status(500);
    throw new Error("We couldn't send the email right now. Please try again later.");
  }

  res.json(reply);
};

// POST /api/auth/reset-password/:token
// Sets a new password; the user then logs in with it
export const resetPassword = async (req, res) => {
  const { password } = req.body ?? {};

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const user = await User.findOne({ resetPasswordTokenHash: hashToken(req.params.token) }).select(
    "+resetPasswordExpires"
  );
  // "code" lets the client show the right message for each case
  if (!user) {
    res.status(400);
    return res.json({ code: "INVALID_TOKEN", message: "This reset link is invalid or has already been used." });
  }
  if (user.resetPasswordExpires < new Date()) {
    res.status(400);
    return res.json({ code: "EXPIRED_TOKEN", message: "This reset link has expired. Links are valid for 15 minutes." });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = undefined; // The link only works once
  user.resetPasswordExpires = undefined;
  // Logs out every device that was logged in with the old password.
  // 1 second back so a login right after (JWT time is rounded down to the second) stays valid.
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await user.save();

  res.json({ message: "Your password has been reset. You can now log in with your new password." });
};

// GET /api/auth/me (protected)
export const getMe = async (req, res) => {
  // req.user is set by the protect middleware
  res.json({ user: req.user });
};
