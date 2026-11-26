import { createMiddleware } from "hono/factory";
import type { AppVariables, Env } from "../env.js";
import { createAuth } from "../modules/identity/auth.js";

/** Attach Better Auth session user (or null) to every request. */
export const sessionMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      c.set("sessionUser", {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: Boolean(session.user.emailVerified),
      });
    } else {
      c.set("sessionUser", null);
    }
  } catch (err) {
    console.error("session_resolve_failed", c.get("requestId"), err);
    c.set("sessionUser", null);
  }
  await next();
});

export function requireSessionUser(c: {
  get: (key: "sessionUser") => AppVariables["sessionUser"];
}) {
  const user = c.get("sessionUser");
  if (!user) return null;
  return user;
}
