import { ZodError, type ZodType } from "zod";
import { config, isOriginAllowed } from "@/server/config";
import { ApiError } from "@/server/errors";

export type Meta = Record<string, unknown>;

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    config.corsAllowedOrigins.length === 0 ? (origin ?? "*") : isOriginAllowed(origin) ? origin! : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, X-Request-Id",
    "Access-Control-Expose-Headers": "X-Request-Id, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

export function ok<T>(data: T, meta?: Meta, status = 200): Response {
  return jsonResponse(meta ? { ok: true, data, meta } : { ok: true, data }, { status });
}

export function created<T>(data: T, meta?: Meta): Response {
  return ok(data, meta, 201);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(error: ApiError, requestId: string): Response {
  const headers: Record<string, string> = { "X-Request-Id": requestId };
  if (error.code === "rate_limited") {
    const details = error.details as { retryAfterSeconds?: number } | undefined;
    headers["Retry-After"] = String(details?.retryAfterSeconds ?? 60);
  }
  return jsonResponse(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      requestId,
    },
    { status: error.status, headers },
  );
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return ApiError.validation("Request body failed validation", flattenZodError(error));
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/duplicate key|unique constraint/i.test(message)) {
    return ApiError.conflict("Resource already exists");
  }
  if (/ECONNREFUSED|Connection terminated|timeout/i.test(message)) {
    return new ApiError("service_unavailable", "Database is unavailable");
  }
  return ApiError.internal(message);
}

export function flattenZodError(error: ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw ApiError.badRequest("Content-Type must be application/json");
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw ApiError.validation("Request body failed validation", flattenZodError(result.error));
  }
  return result.data;
}

export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw ApiError.validation("Query parameters failed validation", flattenZodError(result.error));
  }
  return result.data;
}

export function paginationMeta(total: number, limit: number, offset: number): Meta {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    nextOffset: offset + limit < total ? offset + limit : null,
  };
}
