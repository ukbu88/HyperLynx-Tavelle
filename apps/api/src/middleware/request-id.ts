import { createMiddleware } from "hono/factory";
import type { AppVariables, Env } from "../env.js";

export const requestIdMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const requestId = incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});
