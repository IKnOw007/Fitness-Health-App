import { preflight, route } from "@/server/handler";
import { ok, paginationMeta, parseQuery } from "@/server/http";
import { listExercises } from "@/server/repo";
import { exerciseQuery } from "@/server/schemas";
import { serializeExercise } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url }) => {
  const query = parseQuery(url, exerciseQuery);
  const result = await listExercises(query);
  return ok(result.items.map(serializeExercise), paginationMeta(result.total, result.limit, result.offset));
});
