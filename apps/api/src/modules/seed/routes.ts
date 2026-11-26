import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { organisations, orgBranding, memberships } from "@tavelle/db";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import {
  ACTIVE_BUSINESS_COOKIE,
  ACTIVE_ORG_COOKIE,
} from "../../middleware/tenant.js";
import { isPlatformAdmin } from "../orgs/platform.js";
import { getDb, provisionOrganisation } from "../orgs/service.js";
import {
  ensureBusiness,
  ensureModuleEnabled,
  listBusinessesForOrg,
} from "../businesses/service.js";
import { newId } from "../../lib/ids.js";

/**
 * Staging/local helpers for tenancy demos.
 * Gated to platform admins. Idempotent by slug.
 */
export const seedRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const HYPERLYNX = {
  name: "HyperLynx",
  slug: "hyperlynx",
  displayName: "HyperLynx",
};

const HYPERLYNX_BUSINESSES = [
  { name: "Dispatch Sites", slug: "dispatch-sites" },
  { name: "NexRail", slug: "nexrail" },
] as const;

async function ensureMembership(
  db: ReturnType<typeof getDb>,
  orgId: string,
  userId: string,
) {
  const membership = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    .get();
  if (!membership) {
    await db.insert(memberships).values({
      id: newId(),
      orgId,
      userId,
      role: "owner",
      status: "active",
      createdAt: new Date(),
    });
  }
}

async function ensureOrgBranding(
  db: ReturnType<typeof getDb>,
  orgId: string,
  displayName: string,
) {
  const branding = await db
    .select()
    .from(orgBranding)
    .where(eq(orgBranding.orgId, orgId))
    .get();
  if (!branding) {
    await db.insert(orgBranding).values({
      orgId,
      displayName,
    });
  }
}

/** Seed HyperLynx org + Dispatch Sites + NexRail with CRM module enabled. */
seedRoutes.post("/seed/hyperlynx", async (c) => {
  if (c.env.ENVIRONMENT === "production") {
    return c.json({ error: "forbidden" }, 403);
  }

  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!isPlatformAdmin(c.env, user.email, user.emailVerified)) {
    return c.json(
      {
        error: "forbidden",
        message: user.emailVerified
          ? "Platform admin required"
          : "Verify your email before using platform-admin actions.",
      },
      403,
    );
  }

  const db = getDb(c.env);
  const existing = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, HYPERLYNX.slug))
    .get();

  let orgId: string;
  if (existing) {
    orgId = existing.id;
    await ensureMembership(db, orgId, user.id);
    await ensureOrgBranding(db, orgId, HYPERLYNX.displayName);
  } else {
    const provisioned = await provisionOrganisation(db, HYPERLYNX, user.id);
    orgId = provisioned.orgId;
  }

  const seededBusinesses: { id: string; name: string; slug: string }[] = [];
  for (const biz of HYPERLYNX_BUSINESSES) {
    const row = await ensureBusiness(db, orgId, biz);
    await ensureModuleEnabled(db, orgId, row.id, "crm");
    seededBusinesses.push({ id: row.id, name: row.name, slug: row.slug });
  }

  const opts = {
    httpOnly: true,
    sameSite: "Lax" as const,
    path: "/",
    secure: (c.env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  };
  setCookie(c, ACTIVE_ORG_COOKIE, orgId, opts);
  const dispatch = seededBusinesses.find((b) => b.slug === "dispatch-sites");
  if (dispatch) {
    setCookie(c, ACTIVE_BUSINESS_COOKIE, dispatch.id, opts);
  }

  return c.json({
    orgId,
    businesses: seededBusinesses,
    activeBusinessId: dispatch?.id ?? null,
    message:
      "HyperLynx org with Dispatch Sites + NexRail (CRM enabled). Switch businesses in the workspace UI.",
  });
});

seedRoutes.post("/seed/demo-orgs", async (c) => {
  if (c.env.ENVIRONMENT === "production") {
    return c.json({ error: "forbidden" }, 403);
  }

  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!isPlatformAdmin(c.env, user.email, user.emailVerified)) {
    return c.json(
      {
        error: "forbidden",
        message: user.emailVerified
          ? "Platform admin required"
          : "Verify your email before using platform-admin actions.",
      },
      403,
    );
  }

  const db = getDb(c.env);

  // Prefer HyperLynx multi-business seed as the Phase 3 happy path.
  const existingHyper = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, HYPERLYNX.slug))
    .get();

  let orgId: string;
  if (existingHyper) {
    orgId = existingHyper.id;
    await ensureMembership(db, orgId, user.id);
    await ensureOrgBranding(db, orgId, HYPERLYNX.displayName);
  } else {
    const provisioned = await provisionOrganisation(db, HYPERLYNX, user.id);
    orgId = provisioned.orgId;
  }

  for (const biz of HYPERLYNX_BUSINESSES) {
    const row = await ensureBusiness(db, orgId, biz);
    await ensureModuleEnabled(db, orgId, row.id, "crm");
  }

  // Keep a second org for isolation demos (no businesses required).
  const alphaSlug = "demo-tenant-alpha";
  const alphaExisting = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, alphaSlug))
    .get();
  let alphaId: string;
  if (alphaExisting) {
    alphaId = alphaExisting.id;
    await ensureMembership(db, alphaId, user.id);
  } else {
    const provisioned = await provisionOrganisation(
      db,
      {
        name: "Demo Tenant Alpha",
        slug: alphaSlug,
        displayName: "Demo Tenant Alpha",
      },
      user.id,
    );
    alphaId = provisioned.orgId;
  }

  const bizRows = await listBusinessesForOrg(db, orgId);
  const opts = {
    httpOnly: true,
    sameSite: "Lax" as const,
    path: "/",
    secure: (c.env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  };
  setCookie(c, ACTIVE_ORG_COOKIE, orgId, opts);
  const dispatch = bizRows.find((b) => b.slug === "dispatch-sites");
  if (dispatch) {
    setCookie(c, ACTIVE_BUSINESS_COOKIE, dispatch.id, opts);
  }

  return c.json({
    orgIds: [orgId, alphaId],
    count: 2,
    hyperlynx: {
      orgId,
      businesses: bizRows.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
      })),
    },
  });
});
