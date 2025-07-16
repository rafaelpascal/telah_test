export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  /**
   * Creates an AppError instance.
   *
   * @param statusCode The HTTP status code for this error.
   * @param message A human-readable message describing the error.
   * @param details Optional extra information about the error.
   * @param isOperational Whether this error is an operational error (as opposed to a programmer error).
   */
  constructor(
    statusCode: number,
    message: string,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this);
  }
}

// Validation Error (use for joi/zod/react-hook-form validation error)
export class ValidationError extends AppError {
  constructor(message = "Invalid request data", details?: any) {
    super(400, message, true, details);
  }
}

// Rate limiting Error (If user exceeds rate limit)
export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later.") {
    super(429, message);
  }
}

// Authentication error
export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(401, message);
  }
}
