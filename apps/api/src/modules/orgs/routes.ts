import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import {
  CreateOrganisationSchema,
  MeResponseSchema,
  SwitchOrgSchema,
} from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import {
  ACTIVE_BUSINESS_COOKIE,
  ACTIVE_ORG_COOKIE,
} from "../../middleware/tenant.js";
import { listBusinessesForOrg } from "../businesses/service.js";
import { isPlatformAdmin } from "./platform.js";
import {
  getDb,
  getMembership,
  listMembershipsForUser,
  provisionOrganisation,
} from "./service.js";

export const orgRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function cookieOpts(env: Env) {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    path: "/",
    secure: (env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  };
}

orgRoutes.get("/me", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const db = getDb(c.env);
  const memberships = await listMembershipsForUser(db, user.id);
  const tenant = c.get("tenant");

  const orgBusinesses = tenant
    ? await listBusinessesForOrg(db, tenant.orgId)
    : [];

  const body = MeResponseSchema.parse({
    user: { id: user.id, email: user.email, name: user.name },
    memberships,
    activeOrgId: tenant?.orgId ?? null,
    activeBusinessId: tenant?.businessId ?? null,
    businesses: orgBusinesses.map((b) => ({
      id: b.id,
      orgId: b.orgId,
      name: b.name,
      slug: b.slug,
      status: b.status,
    })),
    isPlatformAdmin: isPlatformAdmin(c.env, user.email, user.emailVerified),
  });

  return c.json(body);
});

orgRoutes.post("/orgs", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!isPlatformAdmin(c.env, user.email, user.emailVerified)) {
    return c.json(
      {
        error: "forbidden",
        message: user.emailVerified
          ? "Organisation creation is invite-only. Platform admins provision orgs."
          : "Verify your email (e.g. magic link) before using platform-admin actions.",
      },
      403,
    );
  }

  const parsed = CreateOrganisationSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  try {
    const { orgId, businessId, businesses } = await provisionOrganisation(
      db,
      parsed.data,
      user.id,
    );
    const opts = cookieOpts(c.env);
    setCookie(c, ACTIVE_ORG_COOKIE, orgId, opts);
    // Default business is created with the org — activate it for CRM.
    if (businessId) {
      setCookie(c, ACTIVE_BUSINESS_COOKIE, businessId, opts);
    } else {
      setCookie(c, ACTIVE_BUSINESS_COOKIE, "", { ...opts, maxAge: 0 });
    }
    return c.json({ orgId, businessId, businesses }, 201);
  } catch (err) {
    console.error("org_provision_failed", c.get("requestId"), err);
    return c.json({ error: "provision_failed" }, 500);
  }
});

orgRoutes.post("/orgs/switch", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const parsed = SwitchOrgSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body" }, 400);
  }

  // Reject forged org IDs — membership must exist.
  const db = getDb(c.env);
  const membership = await getMembership(db, user.id, parsed.data.orgId);
  if (!membership) {
    return c.json({ error: "forbidden", message: "Not a member of that org" }, 403);
  }

  const opts = cookieOpts(c.env);
  setCookie(c, ACTIVE_ORG_COOKIE, parsed.data.orgId, opts);

  // Reset business to first in the new org (middleware will align on next request).
  const orgBusinesses = await listBusinessesForOrg(db, parsed.data.orgId);
  const first = orgBusinesses[0];
  if (first) {
    setCookie(c, ACTIVE_BUSINESS_COOKIE, first.id, opts);
  } else {
    setCookie(c, ACTIVE_BUSINESS_COOKIE, "", { ...opts, maxAge: 0 });
  }

  return c.json({
    activeOrgId: parsed.data.orgId,
    activeBusinessId: first?.id ?? null,
    role: membership.role,
  });
});
