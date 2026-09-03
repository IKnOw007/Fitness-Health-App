import { config } from "@/server/config";

const bearer = [{ bearerAuth: [] as string[] }];

function envelope(dataSchema: object, meta = false) {
  return {
    type: "object",
    required: ["ok", "data"],
    properties: {
      ok: { type: "boolean", example: true },
      data: dataSchema,
      ...(meta ? { meta: { type: "object", additionalProperties: true } } : {}),
    },
  };
}

function listOf(ref: string) {
  return envelope({ type: "array", items: { $ref: `#/components/schemas/${ref}` } }, true);
}

function one(ref: string) {
  return envelope({ $ref: `#/components/schemas/${ref}` });
}

function jsonBody(ref: string, required = true) {
  return {
    required,
    content: { "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } },
  };
}

function jsonResponse(description: string, schema: object) {
  return { description, content: { "application/json": { schema } } };
}

const ERROR_RESPONSES = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "404": { $ref: "#/components/responses/NotFound" },
  "422": { $ref: "#/components/responses/ValidationFailed" },
  "429": { $ref: "#/components/responses/RateLimited" },
};

const queryParam = (name: string, description: string, schema: object = { type: "string" }) => ({
  name,
  in: "query",
  description,
  required: false,
  schema,
});

const pathParam = (name: string, description: string, schema: object = { type: "string" }) => ({
  name,
  in: "path",
  description,
  required: true,
  schema,
});

export function buildOpenApiDocument(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "PulseFit API",
      version: config.appVersion,
      description:
        "Fitness & health tracking backend. Log workouts, meals and daily biometrics, then read " +
        "aggregated rings, trends and coaching insights. Authenticate with a bearer token from " +
        "`/api/v1/auth/login`. When DEMO_MODE is enabled, unauthenticated calls resolve to the seeded demo account.",
      contact: { name: "PulseFit", url: `${origin}/docs` },
      license: { name: "MIT" },
    },
    servers: [{ url: origin, description: config.environment }],
    tags: [
      { name: "Auth", description: "Accounts, sessions and API tokens" },
      { name: "Profile", description: "Athlete profile and goal targets" },
      { name: "Workouts", description: "Training sessions" },
      { name: "Nutrition", description: "Meals and macros" },
      { name: "Daily logs", description: "Steps, sleep, hydration, weight, mood" },
      { name: "Catalog", description: "Exercise library" },
      { name: "Analytics", description: "Summaries, trends and insights" },
      { name: "Ops", description: "Health, readiness and version probes" },
    ],
    paths: {
      "/api/v1": {
        get: {
          tags: ["Ops"],
          summary: "Service discovery",
          responses: { "200": jsonResponse("Endpoint index", envelope({ type: "object" })) },
        },
      },
      "/api/health": {
        get: {
          tags: ["Ops"],
          summary: "Liveness probe",
          responses: { "200": jsonResponse("Service is alive", { type: "object" }) },
        },
      },
      "/api/ready": {
        get: {
          tags: ["Ops"],
          summary: "Readiness probe (DB + migrations)",
          responses: {
            "200": jsonResponse("Ready to serve traffic", { type: "object" }),
            "503": jsonResponse("Dependencies unavailable", { type: "object" }),
          },
        },
      },
      "/api/version": {
        get: {
          tags: ["Ops"],
          summary: "Build and runtime metadata",
          responses: { "200": jsonResponse("Version info", envelope({ type: "object" })) },
        },
      },
      "/api/v1/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create an account and receive a token",
          security: [],
          requestBody: jsonBody("RegisterRequest"),
          responses: {
            "201": jsonResponse("Account created", envelope({ type: "object" })),
            "409": jsonResponse("Email already registered", { $ref: "#/components/schemas/Error" }),
            ...ERROR_RESPONSES,
          },
        },
      },
      "/api/v1/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Exchange credentials for a bearer token",
          security: [],
          requestBody: jsonBody("LoginRequest"),
          responses: {
            "200": jsonResponse("Authenticated", envelope({ type: "object" })),
            ...ERROR_RESPONSES,
          },
        },
      },
      "/api/v1/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user, profile and goals",
          security: bearer,
          responses: { "200": jsonResponse("Session context", envelope({ type: "object" })), ...ERROR_RESPONSES },
        },
        delete: {
          tags: ["Auth"],
          summary: "Log out (revoke the current token)",
          security: bearer,
          responses: { "204": { description: "Token revoked" }, ...ERROR_RESPONSES },
        },
      },
      "/api/v1/auth/tokens": {
        get: {
          tags: ["Auth"],
          summary: "List API tokens",
          security: bearer,
          responses: { "200": jsonResponse("Tokens", envelope({ type: "array", items: { type: "object" } })), ...ERROR_RESPONSES },
        },
        post: {
          tags: ["Auth"],
          summary: "Issue a new API token",
          security: bearer,
          requestBody: jsonBody("TokenRequest", false),
          responses: { "201": jsonResponse("Token created (shown once)", envelope({ type: "object" })), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/auth/tokens/{id}": {
        delete: {
          tags: ["Auth"],
          summary: "Revoke an API token",
          security: bearer,
          parameters: [pathParam("id", "Token id", { type: "integer" })],
          responses: { "204": { description: "Revoked" }, ...ERROR_RESPONSES },
        },
      },
      "/api/v1/profile": {
        get: {
          tags: ["Profile"],
          summary: "Get athlete profile",
          security: bearer,
          responses: { "200": jsonResponse("Profile", one("Profile")), ...ERROR_RESPONSES },
        },
        patch: {
          tags: ["Profile"],
          summary: "Update athlete profile",
          security: bearer,
          requestBody: jsonBody("ProfileUpdate"),
          responses: { "200": jsonResponse("Updated profile", one("Profile")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/goals": {
        get: {
          tags: ["Profile"],
          summary: "Get goal targets",
          security: bearer,
          responses: { "200": jsonResponse("Goals", one("Goals")), ...ERROR_RESPONSES },
        },
        patch: {
          tags: ["Profile"],
          summary: "Update goal targets",
          security: bearer,
          requestBody: jsonBody("Goals"),
          responses: { "200": jsonResponse("Updated goals", one("Goals")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/workouts": {
        get: {
          tags: ["Workouts"],
          summary: "List workouts",
          security: bearer,
          parameters: [
            queryParam("from", "Inclusive start date (YYYY-MM-DD)"),
            queryParam("to", "Inclusive end date (YYYY-MM-DD)"),
            queryParam("category", "strength | cardio | hiit | mobility | core | sport"),
            queryParam("intensity", "low | medium | high"),
            queryParam("q", "Free-text search on title and notes"),
            queryParam("sort", "performedAt | calories | durationMin"),
            queryParam("order", "asc | desc"),
            queryParam("limit", "Page size", { type: "integer", maximum: config.maxPageSize }),
            queryParam("offset", "Rows to skip", { type: "integer" }),
          ],
          responses: { "200": jsonResponse("Workout page", listOf("Workout")), ...ERROR_RESPONSES },
        },
        post: {
          tags: ["Workouts"],
          summary: "Log a workout",
          security: bearer,
          requestBody: jsonBody("WorkoutCreate"),
          responses: { "201": jsonResponse("Created", one("Workout")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/workouts/{id}": {
        get: {
          tags: ["Workouts"],
          summary: "Get a workout",
          security: bearer,
          parameters: [pathParam("id", "Workout id", { type: "integer" })],
          responses: { "200": jsonResponse("Workout", one("Workout")), ...ERROR_RESPONSES },
        },
        patch: {
          tags: ["Workouts"],
          summary: "Update a workout",
          security: bearer,
          parameters: [pathParam("id", "Workout id", { type: "integer" })],
          requestBody: jsonBody("WorkoutCreate"),
          responses: { "200": jsonResponse("Updated", one("Workout")), ...ERROR_RESPONSES },
        },
        delete: {
          tags: ["Workouts"],
          summary: "Delete a workout",
          security: bearer,
          parameters: [pathParam("id", "Workout id", { type: "integer" })],
          responses: { "204": { description: "Deleted" }, ...ERROR_RESPONSES },
        },
      },
      "/api/v1/meals": {
        get: {
          tags: ["Nutrition"],
          summary: "List meals",
          security: bearer,
          parameters: [
            queryParam("from", "Inclusive start date"),
            queryParam("to", "Inclusive end date"),
            queryParam("mealType", "breakfast | lunch | dinner | snack"),
            queryParam("q", "Free-text search on name"),
            queryParam("limit", "Page size", { type: "integer" }),
            queryParam("offset", "Rows to skip", { type: "integer" }),
          ],
          responses: { "200": jsonResponse("Meal page with macro totals", listOf("Meal")), ...ERROR_RESPONSES },
        },
        post: {
          tags: ["Nutrition"],
          summary: "Log a meal (calories derived from macros when omitted)",
          security: bearer,
          requestBody: jsonBody("MealCreate"),
          responses: { "201": jsonResponse("Created", one("Meal")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/meals/{id}": {
        get: {
          tags: ["Nutrition"],
          summary: "Get a meal",
          security: bearer,
          parameters: [pathParam("id", "Meal id", { type: "integer" })],
          responses: { "200": jsonResponse("Meal", one("Meal")), ...ERROR_RESPONSES },
        },
        patch: {
          tags: ["Nutrition"],
          summary: "Update a meal",
          security: bearer,
          parameters: [pathParam("id", "Meal id", { type: "integer" })],
          requestBody: jsonBody("MealCreate"),
          responses: { "200": jsonResponse("Updated", one("Meal")), ...ERROR_RESPONSES },
        },
        delete: {
          tags: ["Nutrition"],
          summary: "Delete a meal",
          security: bearer,
          parameters: [pathParam("id", "Meal id", { type: "integer" })],
          responses: { "204": { description: "Deleted" }, ...ERROR_RESPONSES },
        },
      },
      "/api/v1/logs": {
        get: {
          tags: ["Daily logs"],
          summary: "List daily logs in a range",
          security: bearer,
          parameters: [
            queryParam("from", "Inclusive start date"),
            queryParam("to", "Inclusive end date"),
            queryParam("days", "Rolling window when from/to omitted", { type: "integer" }),
          ],
          responses: { "200": jsonResponse("Daily logs", listOf("DailyLog")), ...ERROR_RESPONSES },
        },
        post: {
          tags: ["Daily logs"],
          summary: "Upsert today's (or a given day's) metrics",
          security: bearer,
          requestBody: jsonBody("DailyLogUpsert"),
          responses: { "200": jsonResponse("Stored log", one("DailyLog")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/logs/water": {
        post: {
          tags: ["Daily logs"],
          summary: "Atomically add or remove hydration",
          security: bearer,
          requestBody: jsonBody("WaterRequest"),
          responses: { "200": jsonResponse("Updated hydration", envelope({ type: "object" })), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/logs/{date}": {
        get: {
          tags: ["Daily logs"],
          summary: "Get one day of metrics",
          security: bearer,
          parameters: [pathParam("date", "YYYY-MM-DD")],
          responses: { "200": jsonResponse("Daily log", one("DailyLog")), ...ERROR_RESPONSES },
        },
        patch: {
          tags: ["Daily logs"],
          summary: "Update one day of metrics",
          security: bearer,
          parameters: [pathParam("date", "YYYY-MM-DD")],
          requestBody: jsonBody("DailyLogUpsert"),
          responses: { "200": jsonResponse("Updated", one("DailyLog")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/exercises": {
        get: {
          tags: ["Catalog"],
          summary: "Search the exercise library",
          security: bearer,
          parameters: [
            queryParam("q", "Search name, muscle group or equipment"),
            queryParam("category", "strength | cardio | hiit | mobility | core"),
            queryParam("muscleGroup", "Target muscle"),
            queryParam("equipment", "Required equipment"),
            queryParam("difficulty", "beginner | intermediate | advanced"),
            queryParam("limit", "Page size", { type: "integer" }),
            queryParam("offset", "Rows to skip", { type: "integer" }),
          ],
          responses: { "200": jsonResponse("Exercise page", listOf("Exercise")), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/stats/summary": {
        get: {
          tags: ["Analytics"],
          summary: "Daily summary with activity rings",
          security: bearer,
          parameters: [queryParam("date", "Defaults to today")],
          responses: { "200": jsonResponse("Summary", envelope({ type: "object" })), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/stats/trends": {
        get: {
          tags: ["Analytics"],
          summary: "Time series, averages and weight delta",
          security: bearer,
          parameters: [queryParam("days", "7-365, default 30", { type: "integer" })],
          responses: { "200": jsonResponse("Trends", envelope({ type: "object" })), ...ERROR_RESPONSES },
        },
      },
      "/api/v1/insights": {
        get: {
          tags: ["Analytics"],
          summary: "Rule-based coaching insights",
          security: bearer,
          responses: { "200": jsonResponse("Insights", envelope({ type: "array", items: { type: "object" } })), ...ERROR_RESPONSES },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Token from /api/v1/auth/login" },
        apiKey: { type: "apiKey", in: "header", name: "X-Api-Key" },
      },
      responses: {
        BadRequest: jsonResponse("Malformed request", { $ref: "#/components/schemas/Error" }),
        Unauthorized: jsonResponse("Missing or invalid token", { $ref: "#/components/schemas/Error" }),
        NotFound: jsonResponse("Resource not found", { $ref: "#/components/schemas/Error" }),
        ValidationFailed: jsonResponse("Body/query validation failed", { $ref: "#/components/schemas/Error" }),
        RateLimited: jsonResponse("Rate limit exceeded", { $ref: "#/components/schemas/Error" }),
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "validation_failed" },
                message: { type: "string" },
                details: { type: "object", additionalProperties: true },
              },
            },
            requestId: { type: "string", format: "uuid" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "demo@pulsefit.app" },
            password: { type: "string", example: "pulsefit123" },
            deviceName: { type: "string", example: "iPhone 16" },
          },
        },
        TokenRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "ios-app" },
            scopes: { type: "array", items: { type: "string", enum: ["read", "write", "admin"] } },
          },
        },
        Profile: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            age: { type: "integer" },
            heightCm: { type: "integer" },
            startWeightKg: { type: "number" },
            activityLevel: { type: "string", enum: ["sedentary", "light", "moderate", "high", "athlete"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ProfileUpdate: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
            heightCm: { type: "integer" },
            startWeightKg: { type: "number" },
            activityLevel: { type: "string" },
          },
        },
        Goals: {
          type: "object",
          properties: {
            calorieTarget: { type: "integer", example: 2400 },
            burnTarget: { type: "integer", example: 650 },
            proteinTarget: { type: "integer", example: 165 },
            stepTarget: { type: "integer", example: 10000 },
            waterTargetMl: { type: "integer", example: 3000 },
            sleepTargetHours: { type: "number", example: 8 },
            activeMinutesTarget: { type: "integer", example: 45 },
            workoutsPerWeek: { type: "integer", example: 5 },
            weightTargetKg: { type: "number", example: 76 },
          },
        },
        Workout: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            category: { type: "string" },
            durationMin: { type: "integer" },
            calories: { type: "integer" },
            intensity: { type: "string" },
            distanceKm: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            performedAt: { type: "string", format: "date-time" },
          },
        },
        WorkoutCreate: {
          type: "object",
          required: ["title", "durationMin"],
          properties: {
            title: { type: "string", example: "Upper Body Strength" },
            category: { type: "string", enum: ["strength", "cardio", "hiit", "mobility", "core", "sport"] },
            durationMin: { type: "integer", example: 55 },
            calories: { type: "integer", example: 420 },
            intensity: { type: "string", enum: ["low", "medium", "high"] },
            distanceKm: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            performedAt: { type: "string", format: "date-time" },
          },
        },
        Meal: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            mealType: { type: "string" },
            calories: { type: "integer" },
            protein: { type: "integer" },
            carbs: { type: "integer" },
            fat: { type: "integer" },
            consumedAt: { type: "string", format: "date-time" },
          },
        },
        MealCreate: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Chicken quinoa bowl" },
            mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
            calories: { type: "integer", example: 610 },
            protein: { type: "integer", example: 48 },
            carbs: { type: "integer", example: 62 },
            fat: { type: "integer", example: 18 },
            consumedAt: { type: "string", format: "date-time" },
          },
        },
        DailyLog: {
          type: "object",
          properties: {
            date: { type: "string", format: "date" },
            steps: { type: "integer" },
            waterMl: { type: "integer" },
            sleepHours: { type: "number" },
            restingHr: { type: "integer" },
            weightKg: { type: "number", nullable: true },
            mood: { type: "string", enum: ["great", "good", "tired", "sore"] },
          },
        },
        DailyLogUpsert: {
          type: "object",
          properties: {
            logDate: { type: "string", format: "date" },
            steps: { type: "integer", example: 11250 },
            waterMl: { type: "integer", example: 2500 },
            sleepHours: { type: "number", example: 7.5 },
            restingHr: { type: "integer", example: 56 },
            weightKg: { type: "number", example: 78.4 },
            mood: { type: "string", enum: ["great", "good", "tired", "sore"] },
          },
        },
        WaterRequest: {
          type: "object",
          properties: {
            amountMl: { type: "integer", example: 250 },
            logDate: { type: "string", format: "date" },
          },
        },
        Exercise: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            category: { type: "string" },
            muscleGroup: { type: "string" },
            equipment: { type: "string" },
            difficulty: { type: "string" },
            metValue: { type: "number" },
            description: { type: "string" },
          },
        },
      },
    },
    security: bearer,
  };
}
