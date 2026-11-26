import { and, desc, eq } from "drizzle-orm";
import { workspaceNotes, type TavelleDb } from "@tavelle/db";
import { newId } from "../../lib/ids.js";
import type { TenantContext } from "../../env.js";

export async function listNotes(db: TavelleDb, tenant: TenantContext) {
  return db
    .select()
    .from(workspaceNotes)
    .where(eq(workspaceNotes.orgId, tenant.orgId))
    .orderBy(desc(workspaceNotes.createdAt))
    .all();
}

export async function createNote(
  db: TavelleDb,
  tenant: TenantContext,
  body: string,
) {
  const id = newId();
  const now = new Date();
  await db.insert(workspaceNotes).values({
    id,
    orgId: tenant.orgId,
    authorUserId: tenant.actorUserId,
    body,
    createdAt: now,
    updatedAt: now,
  });
  return { id, orgId: tenant.orgId, body, authorUserId: tenant.actorUserId, createdAt: now };
}

export async function getNoteInTenant(
  db: TavelleDb,
  tenant: TenantContext,
  noteId: string,
) {
  return db
    .select()
    .from(workspaceNotes)
    .where(
      and(eq(workspaceNotes.id, noteId), eq(workspaceNotes.orgId, tenant.orgId)),
    )
    .get();
}
