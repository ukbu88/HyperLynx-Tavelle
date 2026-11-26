import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { organisations, orgBranding, memberships } from "@tavelle/db";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import { isPlatformAdmin } from "../orgs/platform.js";
import { getDb, provisionOrganisation } from "../orgs/service.js";
import { newId } from "../../lib/ids.js";

/**
 * Staging/local helper to seed ≥2 orgs for isolation demos.
 * Gated to platform admins. Idempotent by slug.
 */
export const seedRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

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
  const seeds = [
    {
      name: "HyperLynx Internal",
      slug: "hyperlynx-internal",
      displayName: "HyperLynx",
    },
    {
      name: "Demo Tenant Alpha",
      slug: "demo-tenant-alpha",
      displayName: "Demo Tenant Alpha",
    },
  ];

  const created: string[] = [];
  for (const seed of seeds) {
    const existing = await db
      .select()
      .from(organisations)
      .where(eq(organisations.slug, seed.slug))
      .get();

    if (existing) {
      const membership = await db
        .select()
        .from(memberships)
        .where(eq(memberships.orgId, existing.id))
        .all();
      const hasUser = membership.some((m) => m.userId === user.id);
      if (!hasUser) {
        await db.insert(memberships).values({
          id: newId(),
          orgId: existing.id,
          userId: user.id,
          role: "owner",
          status: "active",
          createdAt: new Date(),
        });
      }
      const branding = await db
        .select()
        .from(orgBranding)
        .where(eq(orgBranding.orgId, existing.id))
        .get();
      if (!branding && seed.displayName) {
        await db.insert(orgBranding).values({
          orgId: existing.id,
          displayName: seed.displayName,
        });
      }
      created.push(existing.id);
      continue;
    }

    const { orgId } = await provisionOrganisation(db, seed, user.id);
    created.push(orgId);
  }

  return c.json({ orgIds: created, count: created.length });
});
