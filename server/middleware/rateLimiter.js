import rateLimit from "express-rate-limit";

// Limits login/register attempts per IP address to slow down password guessing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Max 20 requests per IP in that window
  standardHeaders: "draft-8", // Send RateLimit headers so clients know the limit
  legacyHeaders: false,
  // Same { message } shape as our other errors, so the client shows it as-is
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});
