export type ErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "payload_too_large"
  | "internal_error"
  | "service_unavailable";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  internal_error: 500,
  service_unavailable: 503,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError("bad_request", message, details);
  }
  static validation(message: string, details?: unknown) {
    return new ApiError("validation_failed", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError("unauthorized", message);
  }
  static forbidden(message = "Insufficient scope for this operation") {
    return new ApiError("forbidden", message);
  }
  static notFound(resource = "Resource") {
    return new ApiError("not_found", `${resource} not found`);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError("conflict", message, details);
  }
  static rateLimited(retryAfterSeconds: number) {
    return new ApiError("rate_limited", "Too many requests, please slow down", {
      retryAfterSeconds,
    });
  }
  static internal(message = "Unexpected server error") {
    return new ApiError("internal_error", message);
  }
}
