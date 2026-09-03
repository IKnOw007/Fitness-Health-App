import { preflight, publicRoute } from "@/server/handler";
import { jsonResponse } from "@/server/http";
import { buildOpenApiDocument } from "@/server/openapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = publicRoute(({ url }) =>
  jsonResponse(buildOpenApiDocument(url.origin), {
    headers: { "Cache-Control": "public, max-age=300" },
  }),
);
