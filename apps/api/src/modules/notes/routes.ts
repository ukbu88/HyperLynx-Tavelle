import { Hono } from "hono";
import { CreateNoteSchema, WorkspaceNoteSchema } from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import { requireTenant } from "../../middleware/tenant.js";
import { can } from "../permissions/can.js";
import { getDb } from "../orgs/service.js";
import { createNote, getNoteInTenant, listNotes } from "./service.js";

export const noteRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function serializeNote(row: {
  id: string;
  orgId: string;
  body: string;
  authorUserId: string | null;
  createdAt: Date;
}) {
  return WorkspaceNoteSchema.parse({
    id: row.id,
    orgId: row.orgId,
    body: row.body,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt.toISOString(),
  });
}

noteRoutes.get("/notes", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);
  if (!can(tenant.role, "note:read")) return c.json({ error: "forbidden" }, 403);

  // Ignore any client-supplied orgId query — tenant is cookie/session derived.
  const db = getDb(c.env);
  const rows = await listNotes(db, tenant);
  return c.json({ notes: rows.map(serializeNote) });
});

noteRoutes.post("/notes", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);
  if (!can(tenant.role, "note:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = CreateNoteSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  // Strip/ignore forged orgId in body if present.
  const db = getDb(c.env);
  const note = await createNote(db, tenant, parsed.data.body);
  return c.json(serializeNote(note), 201);
});

noteRoutes.get("/notes/:id", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);
  if (!can(tenant.role, "note:read")) return c.json({ error: "forbidden" }, 403);

  const db = getDb(c.env);
  const note = await getNoteInTenant(db, tenant, c.req.param("id"));
  // IDOR: cross-tenant → 404 (do not leak existence)
  if (!note) return c.json({ error: "not_found" }, 404);
  return c.json(serializeNote(note));
});
