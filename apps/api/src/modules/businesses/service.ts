import { and, asc, eq } from "drizzle-orm";
import {
  businessModuleConfig,
  businesses,
  type TavelleDb,
} from "@tavelle/db";
import { newId } from "../../lib/ids.js";

export async function listBusinessesForOrg(db: TavelleDb, orgId: string) {
  return db
    .select()
    .from(businesses)
    .where(and(eq(businesses.orgId, orgId), eq(businesses.status, "active")))
    .orderBy(asc(businesses.name))
    .all();
}

export async function getBusinessInOrg(
  db: TavelleDb,
  orgId: string,
  businessId: string,
) {
  return db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.orgId, orgId),
        eq(businesses.status, "active"),
      ),
    )
    .get();
}

export async function listModuleConfigForBusiness(
  db: TavelleDb,
  orgId: string,
  businessId: string,
) {
  return db
    .select()
    .from(businessModuleConfig)
    .where(
      and(
        eq(businessModuleConfig.orgId, orgId),
        eq(businessModuleConfig.businessId, businessId),
      ),
    )
    .all();
}

export async function ensureBusiness(
  db: TavelleDb,
  orgId: string,
  input: { name: string; slug: string },
) {
  const existing = await db
    .select()
    .from(businesses)
    .where(
      and(eq(businesses.orgId, orgId), eq(businesses.slug, input.slug)),
    )
    .get();
  if (existing) return existing;

  const id = newId();
  const now = new Date();
  await db.insert(businesses).values({
    id,
    orgId,
    name: input.name,
    slug: input.slug,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return {
    id,
    orgId,
    name: input.name,
    slug: input.slug,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
}

export async function ensureModuleEnabled(
  db: TavelleDb,
  orgId: string,
  businessId: string,
  moduleKey: string,
) {
  const existing = await db
    .select()
    .from(businessModuleConfig)
    .where(
      and(
        eq(businessModuleConfig.businessId, businessId),
        eq(businessModuleConfig.moduleKey, moduleKey),
      ),
    )
    .get();
  if (existing) {
    if (!existing.enabled) {
      await db
        .update(businessModuleConfig)
        .set({ enabled: true, updatedAt: new Date() })
        .where(eq(businessModuleConfig.id, existing.id));
    }
    return existing.id;
  }

  const id = newId();
  const now = new Date();
  await db.insert(businessModuleConfig).values({
    id,
    orgId,
    businessId,
    moduleKey,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
