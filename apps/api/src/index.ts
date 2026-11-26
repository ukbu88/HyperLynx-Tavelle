import { Hono } from "hono";
import type { AppVariables, Env } from "./env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { healthRoutes } from "./modules/health/routes.js";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", requestIdMiddleware);

app.route("/api", healthRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found" }, 404);
  }
  // Let Workers static assets / SPA handle non-API routes when assets are bound.
  return c.env.ASSETS
    ? c.env.ASSETS.fetch(c.req.raw)
    : c.json({ error: "not_found" }, 404);
});

app.onError((err, c) => {
  console.error("unhandled", c.get("requestId"), err);
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export default app;
