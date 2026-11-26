import { Hono } from "hono";
import type { AppVariables, Env } from "./env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { sessionMiddleware } from "./middleware/session.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { createAuth } from "./modules/identity/auth.js";
import { healthRoutes } from "./modules/health/routes.js";
import { orgRoutes } from "./modules/orgs/routes.js";
import { membershipRoutes } from "./modules/memberships/routes.js";
import { noteRoutes } from "./modules/notes/routes.js";
import { seedRoutes } from "./modules/seed/routes.js";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", requestIdMiddleware);
app.use("/api/*", sessionMiddleware);
app.use("/api/*", tenantMiddleware);

app.all("/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/api", healthRoutes);
app.route("/api", orgRoutes);
app.route("/api", membershipRoutes);
app.route("/api", noteRoutes);
app.route("/api", seedRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.env.ASSETS
    ? c.env.ASSETS.fetch(c.req.raw)
    : c.json({ error: "not_found" }, 404);
});

app.onError((err, c) => {
  console.error("unhandled", c.get("requestId"), err);
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export default app;
