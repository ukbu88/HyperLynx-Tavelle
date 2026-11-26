import { and, eq } from "drizzle-orm";
import {
  createDb,
  memberships,
  organisations,
  orgBranding,
  user,
  type TavelleDb,
} from "@tavelle/db";
import type { CreateOrganisationInput } from "@tavelle/contracts";
import { newId } from "../../lib/ids.js";
import type { Env } from "../../env.js";
import {
  ensureBusiness,
  ensureModuleEnabled,
} from "../businesses/service.js";

export function getDb(env: Env): TavelleDb {
  return createDb(env.DB);
}

export async function listMembershipsForUser(db: TavelleDb, userId: string) {
  const rows = await db
    .select({
      orgId: organisations.id,
      orgName: organisations.name,
      orgSlug: organisations.slug,
      role: memberships.role,
      status: memberships.status,
      displayName: orgBranding.displayName,
    })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.orgId))
    .leftJoin(orgBranding, eq(orgBranding.orgId, organisations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
    .all();

  return rows.map((r) => ({
    orgId: r.orgId,
    orgName: r.orgName,
    orgSlug: r.orgSlug,
    role: r.role as "owner" | "admin" | "member" | "viewer",
    status: r.status,
    displayName: r.displayName ?? null,
  }));
}

export type ProvisionOrganisationOptions = {
  /**
   * Initial business workspaces. Default: one workspace named after the org
   * (`slug: "default"`) with CRM enabled so TenantContext has a businessId.
   */
  businesses?: Array<{ name: string; slug: string }>;
};

/**
 * Invite-only org create: membership + branding + at least one business workspace.
 * CRM module is enabled on each initial business.
 */
export async function provisionOrganisation(
  db: TavelleDb,
  input: CreateOrganisationInput,
  ownerUserId: string,
  options?: ProvisionOrganisationOptions,
) {
  const orgId = newId();
  const now = new Date();

  await db.insert(organisations).values({
    id: orgId,
    name: input.name,
    slug: input.slug,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  if (input.displayName) {
    await db.insert(orgBranding).values({
      orgId,
      displayName: input.displayName,
    });
  }

  await db.insert(memberships).values({
    id: newId(),
    orgId,
    userId: ownerUserId,
    role: "owner",
    status: "active",
    createdAt: now,
  });

  const initialBusinesses =
    options?.businesses ??
    [{ name: input.displayName ?? input.name, slug: "default" }];

  const createdBusinesses: { id: string; name: string; slug: string }[] = [];
  for (const biz of initialBusinesses) {
    const row = await ensureBusiness(db, orgId, biz);
    await ensureModuleEnabled(db, orgId, row.id, "crm");
    createdBusinesses.push({ id: row.id, name: row.name, slug: row.slug });
  }

  return {
    orgId,
    businessId: createdBusinesses[0]?.id ?? null,
    businesses: createdBusinesses,
  };
}

export async function findUserIdByEmail(db: TavelleDb, email: string) {
  const row = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .get();
  return row?.id ?? null;
}

export async function getMembership(
  db: TavelleDb,
  userId: string,
  orgId: string,
) {
  return db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.orgId, orgId),
        eq(memberships.status, "active"),
      ),
    )
    .get();
}
