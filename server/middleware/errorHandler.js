// Runs when no route matched the request
export const notFound = (req, res, next) => {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler: every error passed to next() ends up here.
// Express knows it's an error handler because it takes 4 arguments.
export const errorHandler = (err, req, res, next) => {
  // If a route already set an error status, keep it; otherwise use 500
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message || "Server error";

  // Invalid MongoDB ObjectId (e.g. /api/resumes/abc)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // Mongoose validation failed (e.g. a required field is missing)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // Duplicate value on a unique field (e.g. two users signing up with the same email at once)
  if (err.code === 11000) {
    statusCode = 409;
    message = "That value is already in use";
  }

  // Malformed JSON in the request body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  res.status(statusCode).json({
    message,
    // Only show the stack trace while developing
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
