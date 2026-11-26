import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { createDb, memberships } from "@tavelle/db";
import type { StaffRole } from "@tavelle/contracts";
import type { AppVariables, Env, TenantContext } from "../env.js";
import { getCookie, setCookie } from "hono/cookie";

export const ACTIVE_ORG_COOKIE = "tavelle_active_org";

const STAFF_ROLES: StaffRole[] = ["owner", "admin", "member", "viewer"];

function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as string[]).includes(value);
}

/**
 * Resolve TenantContext from session + verified active-org cookie.
 * Never trusts client-supplied orgId in body/query as the tenant source of truth.
 */
export const tenantMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const user = c.get("sessionUser");
  if (!user) {
    c.set("tenant", null);
    await next();
    return;
  }

  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.userId, user.id), eq(memberships.status, "active")),
    )
    .all();

  if (rows.length === 0) {
    c.set("tenant", null);
    await next();
    return;
  }

  const cookieOrgId = getCookie(c, ACTIVE_ORG_COOKIE);
  let membership =
    (cookieOrgId
      ? rows.find((m) => m.orgId === cookieOrgId)
      : undefined) ?? rows[0];

  if (!membership || !isStaffRole(membership.role)) {
    c.set("tenant", null);
    await next();
    return;
  }

  // Keep cookie aligned with verified membership.
  if (cookieOrgId !== membership.orgId) {
    setCookie(c, ACTIVE_ORG_COOKIE, membership.orgId, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: (c.env.ENVIRONMENT ?? "") !== "development",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const tenant: TenantContext = {
    orgId: membership.orgId,
    actorUserId: user.id,
    actorKind: "staff",
    role: membership.role,
  };
  c.set("tenant", tenant);
  await next();
});

export function requireTenant(c: {
  get: (key: "tenant") => AppVariables["tenant"];
}): TenantContext | null {
  return c.get("tenant");
}
