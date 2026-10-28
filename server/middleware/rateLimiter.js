import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Limits login/register attempts per IP address to slow down password guessing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Max 20 requests per IP in that window
  standardHeaders: "draft-8", // Send RateLimit headers so clients know the limit
  legacyHeaders: false,
  // Same { message } shape as our other errors, so the client shows it as-is
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

// Limits resume imports per logged-in user (imports parse files and may call the AI)
// Must run after the protect middleware, which sets req.user.
export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // Max 10 imports per user per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(), // Count per user, not per IP address
  message: { message: "You've reached the limit of 10 imports per hour. Please try again later." },
});

// Limits ATS checks (they parse files and may call the AI). Open to guests, so
// logged-in users are counted per account and guests per IP address.
// Must run after the optionalAuth middleware.
export const atsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 15, // Max 15 checks per user (or IP) per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // ipKeyGenerator groups IPv6 addresses by network, so one device can't rotate addresses
  keyGenerator: (req) => (req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip)),
  message: { message: "You've reached the limit of 15 checks per hour. Please try again later." },
});

// Limits ATS optimizations per logged-in user (each one saves a new resume and may call the AI).
// Must run after the protect middleware, which sets req.user.
export const optimizeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // Max 10 optimizations per user per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: "You've reached the limit of 10 optimized versions per hour. Please try again later." },
});

// Limits photo uploads per logged-in user (each one is stored on Cloudinary's free tier).
// Must run after the protect middleware, which sets req.user.
export const photoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // Max 20 uploads per user per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: "You've uploaded a lot of photos in the last hour. Please try again later." },
});
