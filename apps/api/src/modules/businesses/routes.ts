import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import {
  BusinessModuleConfigSchema,
  BusinessOps,
  BusinessSchema,
  SwitchBusinessSchema,
} from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import {
  ACTIVE_BUSINESS_COOKIE,
  requireTenant,
} from "../../middleware/tenant.js";
import { getDb } from "../orgs/service.js";
import {
  getBusinessInOrg,
  listBusinessesForOrg,
  listModuleConfigForBusiness,
} from "./service.js";

export const businessRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

function serializeBusiness(row: {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
}) {
  return BusinessSchema.parse({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
}

/** Domain op: businesses.list */
businessRoutes.get("/businesses", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);

  const db = getDb(c.env);
  const rows = await listBusinessesForOrg(db, tenant.orgId);
  return c.json({
    op: BusinessOps.list,
    businesses: rows.map(serializeBusiness),
    activeBusinessId: tenant.businessId,
  });
});

/** Domain op: businesses.setActive — membership/org ownership verified server-side. */
businessRoutes.post("/businesses/switch", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);

  const parsed = SwitchBusinessSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body" }, 400);
  }

  // Reject forged business IDs — must belong to the active org.
  const db = getDb(c.env);
  const business = await getBusinessInOrg(
    db,
    tenant.orgId,
    parsed.data.businessId,
  );
  if (!business) {
    return c.json(
      { error: "forbidden", message: "Business not in active organisation" },
      403,
    );
  }

  setCookie(c, ACTIVE_BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: (c.env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({
    op: BusinessOps.setActive,
    activeBusinessId: business.id,
    business: serializeBusiness(business),
  });
});

/** Domain op: businesses.getModules */
businessRoutes.get("/businesses/:id/modules", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);

  const businessId = c.req.param("id");
  const db = getDb(c.env);
  const business = await getBusinessInOrg(db, tenant.orgId, businessId);
  if (!business) return c.json({ error: "not_found" }, 404);

  const rows = await listModuleConfigForBusiness(db, tenant.orgId, businessId);
  return c.json({
    op: BusinessOps.getModules,
    modules: rows.map((r) =>
      BusinessModuleConfigSchema.parse({
        moduleKey: r.moduleKey,
        enabled: r.enabled,
        settings: r.settings ? (JSON.parse(r.settings) as Record<string, unknown>) : null,
      }),
    ),
  });
});
