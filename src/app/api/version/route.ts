import { config } from "@/server/config";
import { preflight, publicRoute } from "@/server/handler";
import { ok } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = publicRoute(() =>
  ok({
    name: "pulsefit-api",
    version: config.appVersion,
    apiVersion: config.apiVersion,
    commit: config.gitSha,
    environment: config.environment,
    demoMode: config.demoMode,
    startedAt: new Date(Date.now() - Math.round(process.uptime() * 1000)).toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  }),
);
