import jwt from "jsonwebtoken";
import User from "../models/User.js";

// True if the token was issued before the user's last password reset
// (jwt "iat" is in seconds, Dates are in milliseconds)
const issuedBeforePasswordChange = (decoded, user) =>
  Boolean(user.passwordChangedAt) && decoded.iat * 1000 < user.passwordChangedAt.getTime();

// True if the token is from before the user's last "log out everywhere" (or password change).
// Tokens issued before token versions existed have none, which counts as version 0.
const revokedVersion = (decoded, user) => (decoded.tv ?? 0) !== (user.tokenVersion ?? 0);

// True when a valid token may no longer be used
const tokenRevoked = (decoded, user) => issuedBeforePasswordChange(decoded, user) || revokedVersion(decoded, user);

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
  if (issuedBeforePasswordChange(decoded, user)) {
    res.status(401);
    throw new Error("Not authorized, password was changed. Please log in again");
  }
  if (revokedVersion(decoded, user)) {
    res.status(401);
    throw new Error("Not authorized, you were logged out. Please log in again");
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
      const user = await User.findById(decoded.id);
      req.user = user && !tokenRevoked(decoded, user) ? user : undefined;
    } catch {
      // Invalid or expired token: treat the request as a guest
    }
  }
  next();
};
