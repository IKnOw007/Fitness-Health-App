import Link from "next/link";
import { headers } from "next/headers";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { config } from "@/server/config";
import { buildOpenApiDocument } from "@/server/openapi";

export const dynamic = "force-dynamic";

type Operation = {
  tags?: string[];
  summary?: string;
  security?: unknown[];
  parameters?: { name: string; in: string; description?: string; required?: boolean }[];
  requestBody?: unknown;
};

const METHOD_COLORS: Record<string, string> = {
  get: "bg-aqua/15 text-aqua border-aqua/30",
  post: "bg-lime/15 text-lime border-lime/30",
  patch: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  put: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  delete: "bg-flame/15 text-flame border-flame/30",
};

export default async function DocsPage() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const spec = buildOpenApiDocument(origin);

  const byTag = new Map<string, { path: string; method: string; op: Operation }[]>();
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, Operation>)) {
      const tag = operation.tags?.[0] ?? "Other";
      byTag.set(tag, [...(byTag.get(tag) ?? []), { path, method, op: operation }]);
    }
  }
  const tags = spec.tags.map((t) => t.name).filter((name) => byTag.has(name));
  const endpointCount = [...byTag.values()].reduce((sum, list) => sum + list.length, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Backend"
        title="PulseFit API v1"
        accent="aqua"
        subtitle={`${endpointCount} REST endpoints for mobile and web clients. JSON envelopes, bearer auth, scoped tokens, rate limiting, pagination and health probes — ready to deploy.`}
        action={
          <>
            <a className="btn-ghost" href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
              OpenAPI JSON
            </a>
            <a className="btn-ghost" href="/api/v1" target="_blank" rel="noreferrer">
              Discovery
            </a>
            <Link className="btn-primary" href="/">
              Open app
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Quick start" subtitle="Authenticate, then call any resource" />
          <div className="space-y-3 px-5 py-5">
            <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-[12px] leading-relaxed text-white/80">
{`# 1. Log in (demo account is seeded automatically)
curl -X POST ${origin}/api/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"demo@pulsefit.app","password":"pulsefit123"}'

# 2. Call the API with the returned token
curl ${origin}/api/v1/stats/summary \\
  -H 'Authorization: Bearer pf_xxx'

# 3. Log a workout
curl -X POST ${origin}/api/v1/workouts \\
  -H 'Authorization: Bearer pf_xxx' -H 'Content-Type: application/json' \\
  -d '{"title":"Tempo Run","category":"cardio","durationMin":32,"calories":390,"distanceKm":6.5}'`}
            </pre>
            <p className="text-xs text-white/40">
              Every response is wrapped as <code className="text-white/70">{`{ ok, data, meta? }`}</code>; errors return{" "}
              <code className="text-white/70">{`{ ok:false, error:{ code, message, details? }, requestId }`}</code>.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Runtime" subtitle="Current deployment settings" />
          <dl className="divide-y divide-white/[0.06]">
            {[
              ["API version", spec.info.version],
              ["Environment", config.environment],
              ["Demo mode", config.demoMode ? "on" : "off"],
              ["Rate limit", `${config.rateLimit.max} req / ${config.rateLimit.windowMs / 1000}s`],
              ["Auth rate limit", `${config.rateLimit.authMax} req / min`],
              ["Token TTL", `${config.tokenTtlDays} days`],
              ["Max page size", String(config.maxPageSize)],
              ["CORS", config.corsAllowedOrigins.length ? config.corsAllowedOrigins.join(", ") : "any origin"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <dt className="text-xs font-semibold text-white/45">{label}</dt>
                <dd className="text-xs font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {tags.map((tag) => (
        <Card key={tag}>
          <CardHeader
            title={tag}
            subtitle={spec.tags.find((t) => t.name === tag)?.description}
            action={<span className="chip">{byTag.get(tag)?.length} endpoints</span>}
          />
          <ul className="divide-y divide-white/[0.06]">
            {byTag.get(tag)?.map(({ path, method, op }) => (
              <li key={`${method}-${path}`} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`w-16 shrink-0 rounded-lg border px-2 py-1 text-center text-[11px] font-black uppercase ${
                      METHOD_COLORS[method] ?? "border-white/15 text-white/60"
                    }`}
                  >
                    {method}
                  </span>
                  <code className="text-sm font-semibold text-white">{path}</code>
                  {Array.isArray(op.security) && op.security.length === 0 ? (
                    <span className="chip border-lime/30 text-lime">public</span>
                  ) : (
                    <span className="chip">🔒 bearer</span>
                  )}
                </div>
                <p className="mt-1.5 pl-[76px] text-xs text-white/50">{op.summary}</p>
                {op.parameters && op.parameters.length > 0 ? (
                  <p className="mt-1 pl-[76px] text-[11px] text-white/35">
                    Params: {op.parameters.map((p) => p.name).join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </main>
  );
}
