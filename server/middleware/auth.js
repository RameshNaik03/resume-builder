import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protects routes: only lets the request through if it has a valid JWT.
// Expects the header: Authorization: Bearer <token>
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Not authorized, invalid or expired token");
  }

  // Load the user from the token (passwordHash is excluded by default)
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error("Not authorized, user no longer exists");
  }

  req.user = user;
  next();
};

// For public routes that do a little more for logged-in users (e.g. the ATS checker).
// Sets req.user when a valid token is sent; otherwise carries on as a guest.
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      req.user = (await User.findById(decoded.id)) ?? undefined;
    } catch {
      // Invalid or expired token: treat the request as a guest
    }
  }
  next();
};
