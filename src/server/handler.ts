import { config } from "@/server/config";
import { ApiError } from "@/server/errors";
import { authenticate, newRequestId, requireScope, type AuthContext, type Scope } from "@/server/auth";
import { corsHeaders, errorResponse, toApiError } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";

export type HandlerCtx<P> = {
  request: Request;
  url: URL;
  params: P;
  auth: AuthContext;
  requestId: string;
};

export type PublicHandlerCtx<P> = Omit<HandlerCtx<P>, "auth">;

export type RouteOptions = {
  /** Scope the caller must hold. Defaults to "read" for GET, "write" otherwise. */
  scope?: Scope;
  /** Override the requests-per-window budget for this endpoint. */
  rateLimitMax?: number;
};

type NextContext<P> = { params?: Promise<P> } | undefined;

function baseHeaders(request: Request, requestId: string): Record<string, string> {
  return {
    ...corsHeaders(request.headers.get("origin")),
    "X-Request-Id": requestId,
    "X-Api-Version": config.apiVersion,
  };
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) merged.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

function log(entry: Record<string, unknown>) {
  if (process.env.API_LOGGING === "off") return;
  console.log(JSON.stringify({ scope: "api", ...entry }));
}

async function resolveParams<P>(context: NextContext<P>): Promise<P> {
  if (!context?.params) return {} as P;
  return (await context.params) as P;
}

function runPipeline<P>(
  handler: (ctx: HandlerCtx<P>) => Promise<Response> | Response,
  options: RouteOptions,
  authenticated: true,
): (request: Request, context: NextContext<P>) => Promise<Response>;
function runPipeline<P>(
  handler: (ctx: PublicHandlerCtx<P>) => Promise<Response> | Response,
  options: RouteOptions,
  authenticated: false,
): (request: Request, context: NextContext<P>) => Promise<Response>;
function runPipeline<P>(
  handler: (ctx: never) => Promise<Response> | Response,
  options: RouteOptions,
  authenticated: boolean,
) {
  return async (request: Request, context: NextContext<P>): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") ?? newRequestId();
    const started = Date.now();
    const url = new URL(request.url);
    const headers = baseHeaders(request, requestId);

    try {
      const limit = options.rateLimitMax ?? config.rateLimit.max;
      const identity = request.headers.get("authorization") ?? clientKey(request);
      const rl = rateLimit(`${url.pathname}:${identity}`, limit, config.rateLimit.windowMs);
      headers["X-RateLimit-Limit"] = String(limit);
      headers["X-RateLimit-Remaining"] = String(rl.remaining);
      headers["X-RateLimit-Reset"] = String(rl.resetSeconds);
      if (!rl.allowed) throw ApiError.rateLimited(rl.resetSeconds);

      const params = await resolveParams<P>(context);

      let response: Response;
      if (authenticated) {
        const auth = await authenticate(request);
        const scope = options.scope ?? (request.method === "GET" ? "read" : "write");
        requireScope(auth, scope);
        const ctx: HandlerCtx<P> = { request, url, params, auth, requestId };
        response = await (handler as (c: HandlerCtx<P>) => Promise<Response> | Response)(ctx);
      } else {
        const ctx: PublicHandlerCtx<P> = { request, url, params, requestId };
        response = await (handler as (c: PublicHandlerCtx<P>) => Promise<Response> | Response)(ctx);
      }

      log({
        requestId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        ms: Date.now() - started,
      });
      return withHeaders(response, headers);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status >= 500) {
        log({
          requestId,
          method: request.method,
          path: url.pathname,
          status: apiError.status,
          ms: Date.now() - started,
          error: apiError.message,
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        log({
          requestId,
          method: request.method,
          path: url.pathname,
          status: apiError.status,
          ms: Date.now() - started,
          code: apiError.code,
        });
      }
      return withHeaders(errorResponse(apiError, requestId), headers);
    }
  };
}

/** Authenticated endpoint: resolves the caller, enforces scope and rate limits. */
export function route<P extends Record<string, string> = Record<string, never>>(
  handler: (ctx: HandlerCtx<P>) => Promise<Response> | Response,
  options: RouteOptions = {},
) {
  return runPipeline<P>(handler, options, true);
}

/** Public endpoint: no auth, but still rate limited and wrapped in the error envelope. */
export function publicRoute<P extends Record<string, string> = Record<string, never>>(
  handler: (ctx: PublicHandlerCtx<P>) => Promise<Response> | Response,
  options: RouteOptions = {},
) {
  return runPipeline<P>(handler, options, false);
}

/** Shared CORS preflight handler. */
export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}
