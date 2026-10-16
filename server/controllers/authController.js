import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// GET /api/auth/me (protected)
export const getMe = async (req, res) => {
  // req.user is set by the protect middleware
  res.json({ user: req.user });
};
