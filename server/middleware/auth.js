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
