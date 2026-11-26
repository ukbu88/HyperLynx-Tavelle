import { Hono } from "hono";
import { HealthResponseSchema, type HealthResponse } from "@tavelle/contracts";
import { createDb, schemaMeta } from "@tavelle/db";
import { eq } from "drizzle-orm";
import type { AppVariables, Env } from "../../env.js";

const API_VERSION = "0.0.0";

export const healthRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

healthRoutes.get("/health", async (c) => {
  let d1Ok = false;
  let r2Ok = false;

  try {
    const db = createDb(c.env.DB);
    const now = Date.now();
    await db
      .insert(schemaMeta)
      .values({ key: "healthcheck", value: "ok", updatedAt: now })
      .onConflictDoUpdate({
        target: schemaMeta.key,
        set: { value: "ok", updatedAt: now },
      });
    const row = await db
      .select()
      .from(schemaMeta)
      .where(eq(schemaMeta.key, "healthcheck"))
      .get();
    d1Ok = row?.value === "ok";
  } catch {
    d1Ok = false;
  }

  try {
    // Binding presence + list is enough for foundation wiring; no objects required.
    r2Ok = typeof c.env.FILES?.list === "function";
  } catch {
    r2Ok = false;
  }

  const body: HealthResponse = HealthResponseSchema.parse({
    ok: true as const,
    service: "tavelle-api" as const,
    version: API_VERSION,
    time: new Date().toISOString(),
    bindings: { d1: d1Ok, r2: r2Ok },
  });

  return c.json(body, d1Ok ? 200 : 503);
});

healthRoutes.get("/hello", (c) =>
  c.json({
    message: "Hello from Tavelle",
    product: "HyperLynx Tavelle",
    environment: c.env.ENVIRONMENT ?? "unknown",
    requestId: c.get("requestId"),
  }),
);
