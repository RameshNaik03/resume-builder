// Runs when no route matched the request
export const notFound = (req, res, next) => {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler: every error passed to next() ends up here.
// Express knows it's an error handler because it takes 4 arguments.
export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  // Use the status a route already set, or one attached to the error
  // (e.g. 413 "body too large" from express.json), otherwise 500
  let statusCode = res.statusCode >= 400 ? res.statusCode : err.status || 500;
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

  // File upload problems (from multer)
  if (err.name === "MulterError") {
    const uploadMessages = {
      LIMIT_FILE_SIZE: "File is too large. The maximum size is 5 MB.",
      LIMIT_FILE_COUNT: "Please upload one file at a time.",
      LIMIT_UNEXPECTED_FILE: 'Please upload one file in a form field named "file".',
    };
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = uploadMessages[err.code] ?? err.message;
  }

  // Malformed JSON in the request body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  // Unexpected errors: log the details for us, but in production don't send
  // internal messages (database errors etc.) to the browser
  if (statusCode >= 500) {
    console.error(err);
    if (isProduction) message = "Something went wrong on our side. Please try again.";
  }

  res.status(statusCode).json({
    message,
    // Only show the stack trace while developing
    stack: isProduction ? undefined : err.stack,
  });
};
