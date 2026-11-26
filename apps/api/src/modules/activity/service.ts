import { activityEvents, type TavelleDb } from "@tavelle/db";
import { newId } from "../../lib/ids.js";
import type { TenantContext } from "../../env.js";

export type RecordActivityInput = {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
};

/** Synchronous append-only activity writer (MODULES: activity.record). */
export async function recordActivity(
  db: TavelleDb,
  tenant: TenantContext,
  input: RecordActivityInput,
) {
  const id = newId();
  const now = new Date();
  await db.insert(activityEvents).values({
    id,
    orgId: tenant.orgId,
    businessId: tenant.businessId,
    actorUserId: tenant.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: now,
  });
  return { id, createdAt: now };
}
