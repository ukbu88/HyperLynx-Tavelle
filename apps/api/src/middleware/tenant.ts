import { createMiddleware } from "hono/factory";
import { and, asc, eq } from "drizzle-orm";
import { businesses, createDb, memberships } from "@tavelle/db";
import type { StaffRole } from "@tavelle/contracts";
import type {
  AppVariables,
  BusinessTenantContext,
  Env,
  TenantContext,
} from "../env.js";
import { getCookie, setCookie } from "hono/cookie";

export const ACTIVE_ORG_COOKIE = "tavelle_active_org";
export const ACTIVE_BUSINESS_COOKIE = "tavelle_active_business";

const STAFF_ROLES: StaffRole[] = ["owner", "admin", "member", "viewer"];

function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as string[]).includes(value);
}

function cookieOpts(env: Env) {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    path: "/",
    secure: (env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/**
 * Resolve TenantContext from session + verified active-org / active-business cookies.
 * Never trusts client-supplied orgId or businessId in body/query as the source of truth.
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

  const opts = cookieOpts(c.env);

  // Keep org cookie aligned with verified membership.
  if (cookieOrgId !== membership.orgId) {
    setCookie(c, ACTIVE_ORG_COOKIE, membership.orgId, opts);
  }

  const orgBusinesses = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.orgId, membership.orgId),
        eq(businesses.status, "active"),
      ),
    )
    .orderBy(asc(businesses.name))
    .all();

  const cookieBusinessId = getCookie(c, ACTIVE_BUSINESS_COOKIE);
  let activeBusiness =
    (cookieBusinessId
      ? orgBusinesses.find((b) => b.id === cookieBusinessId)
      : undefined) ?? orgBusinesses[0] ?? null;

  // Forged / cross-org business cookie → fall back to first business in org.
  if (cookieBusinessId && !activeBusiness && orgBusinesses[0]) {
    activeBusiness = orgBusinesses[0];
  }

  if (activeBusiness && cookieBusinessId !== activeBusiness.id) {
    setCookie(c, ACTIVE_BUSINESS_COOKIE, activeBusiness.id, opts);
  }

  const tenant: TenantContext = {
    orgId: membership.orgId,
    businessId: activeBusiness?.id ?? null,
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

/** CRM ops require both org and business workspace. */
export function requireBusinessTenant(c: {
  get: (key: "tenant") => AppVariables["tenant"];
}): BusinessTenantContext | null {
  const tenant = c.get("tenant");
  if (!tenant?.businessId) return null;
  return tenant as BusinessTenantContext;
}
