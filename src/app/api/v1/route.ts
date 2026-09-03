import { config } from "@/server/config";
import { preflight, publicRoute } from "@/server/handler";
import { ok } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

/** Service discovery document — lists every endpoint the mobile/web clients can call. */
export const GET = publicRoute(({ url }) => {
  const base = `${url.origin}/api/${config.apiVersion}`;
  return ok({
    service: "pulsefit-api",
    apiVersion: config.apiVersion,
    appVersion: config.appVersion,
    documentation: `${url.origin}/docs`,
    openapi: `${base}/openapi.json`,
    demoMode: config.demoMode,
    authentication: {
      type: "bearer",
      header: "Authorization: Bearer <token>",
      alternateHeader: "X-Api-Key: <token>",
      obtain: `${base}/auth/login`,
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      authMax: config.rateLimit.authMax,
    },
    endpoints: {
      auth: {
        register: `POST ${base}/auth/register`,
        login: `POST ${base}/auth/login`,
        me: `GET ${base}/auth/me`,
        logout: `DELETE ${base}/auth/me`,
        listTokens: `GET ${base}/auth/tokens`,
        createToken: `POST ${base}/auth/tokens`,
        revokeToken: `DELETE ${base}/auth/tokens/{id}`,
      },
      profile: { get: `GET ${base}/profile`, update: `PATCH ${base}/profile` },
      goals: { get: `GET ${base}/goals`, update: `PATCH ${base}/goals` },
      workouts: {
        list: `GET ${base}/workouts`,
        create: `POST ${base}/workouts`,
        get: `GET ${base}/workouts/{id}`,
        update: `PATCH ${base}/workouts/{id}`,
        remove: `DELETE ${base}/workouts/{id}`,
      },
      meals: {
        list: `GET ${base}/meals`,
        create: `POST ${base}/meals`,
        get: `GET ${base}/meals/{id}`,
        update: `PATCH ${base}/meals/{id}`,
        remove: `DELETE ${base}/meals/{id}`,
      },
      logs: {
        list: `GET ${base}/logs`,
        upsert: `POST ${base}/logs`,
        getDay: `GET ${base}/logs/{date}`,
        updateDay: `PATCH ${base}/logs/{date}`,
        addWater: `POST ${base}/logs/water`,
      },
      exercises: { list: `GET ${base}/exercises` },
      stats: {
        summary: `GET ${base}/stats/summary?date=YYYY-MM-DD`,
        trends: `GET ${base}/stats/trends?days=30`,
        insights: `GET ${base}/insights`,
      },
      ops: {
        health: `GET ${url.origin}/api/health`,
        ready: `GET ${url.origin}/api/ready`,
        version: `GET ${url.origin}/api/version`,
      },
    },
  });
});
