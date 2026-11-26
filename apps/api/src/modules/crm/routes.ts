import { Hono } from "hono";
import {
  ClientNoteSchema,
  ClientNotesCreateInputSchema,
  ContactSchema,
  ContactsCreateInputSchema,
  ContactsUpdateInputSchema,
  CustomerSchema,
  CustomersCreateInputSchema,
  CustomersUpdateInputSchema,
} from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import { requireBusinessTenant } from "../../middleware/tenant.js";
import { can } from "../permissions/can.js";
import { getDb } from "../orgs/service.js";
import {
  createClientNote,
  createContact,
  createCustomer,
  getCustomerInTenant,
  listClientNotes,
  listContactsForCustomer,
  listCustomers,
  updateContact,
  updateCustomer,
} from "./service.js";

export const crmRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function serializeCustomer(row: {
  id: string;
  orgId: string;
  businessId: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return CustomerSchema.parse({
    id: row.id,
    orgId: row.orgId,
    businessId: row.businessId,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function serializeContact(row: {
  id: string;
  orgId: string;
  businessId: string;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return ContactSchema.parse({
    id: row.id,
    orgId: row.orgId,
    businessId: row.businessId,
    clientId: row.clientId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function serializeClientNote(row: {
  id: string;
  orgId: string;
  businessId: string;
  clientId: string;
  body: string;
  authorUserId: string | null;
  createdAt: Date;
}) {
  return ClientNoteSchema.parse({
    id: row.id,
    orgId: row.orgId,
    businessId: row.businessId,
    clientId: row.clientId,
    body: row.body,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt.toISOString(),
  });
}

function noBusiness() {
  return { error: "no_active_business" as const };
}

/** Domain op: customers.list */
crmRoutes.get("/customers", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:read")) return c.json({ error: "forbidden" }, 403);

  const db = getDb(c.env);
  const rows = await listCustomers(db, tenant);
  return c.json({
    op: "customers.list",
    customers: rows.map(serializeCustomer),
  });
});

/** Domain op: customers.create */
crmRoutes.post("/customers", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = CustomersCreateInputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  // Ignore any forged orgId/businessId in body — tenant is session/cookie derived.
  const db = getDb(c.env);
  const customer = await createCustomer(db, tenant, parsed.data);
  return c.json({ op: "customers.create", customer: serializeCustomer(customer) }, 201);
});

/** Domain op: customers.get */
crmRoutes.get("/customers/:id", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:read")) return c.json({ error: "forbidden" }, 403);

  const db = getDb(c.env);
  const customer = await getCustomerInTenant(db, tenant, c.req.param("id"));
  // IDOR: cross-business / cross-tenant → 404 (do not leak existence)
  if (!customer) return c.json({ error: "not_found" }, 404);
  return c.json({ op: "customers.get", customer: serializeCustomer(customer) });
});

/** Domain op: customers.update */
crmRoutes.patch("/customers/:id", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = CustomersUpdateInputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  const customer = await updateCustomer(db, tenant, c.req.param("id"), parsed.data);
  if (!customer) return c.json({ error: "not_found" }, 404);
  return c.json({ op: "customers.update", customer: serializeCustomer(customer) });
});

/** Domain op: contacts.list (by customer) */
crmRoutes.get("/customers/:id/contacts", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:read")) return c.json({ error: "forbidden" }, 403);

  const db = getDb(c.env);
  const rows = await listContactsForCustomer(db, tenant, c.req.param("id"));
  if (!rows) return c.json({ error: "not_found" }, 404);
  return c.json({
    op: "contacts.list",
    contacts: rows.map(serializeContact),
  });
});

/** Domain op: contacts.create */
crmRoutes.post("/contacts", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = ContactsCreateInputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  const result = await createContact(db, tenant, parsed.data);
  if ("error" in result) {
    if (result.error === "primary_conflict") {
      return c.json({ error: "primary_conflict" }, 409);
    }
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(
    { op: "contacts.create", contact: serializeContact(result.contact) },
    201,
  );
});

/** Domain op: contacts.update */
crmRoutes.patch("/contacts/:id", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = ContactsUpdateInputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  const result = await updateContact(db, tenant, c.req.param("id"), parsed.data);
  if (!result) return c.json({ error: "not_found" }, 404);
  if ("error" in result) {
    return c.json({ error: result.error }, 409);
  }
  return c.json({
    op: "contacts.update",
    contact: serializeContact(result.contact),
  });
});

/** Domain op: clientNotes.list */
crmRoutes.get("/customers/:id/notes", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:read")) return c.json({ error: "forbidden" }, 403);

  const db = getDb(c.env);
  const rows = await listClientNotes(db, tenant, c.req.param("id"));
  if (!rows) return c.json({ error: "not_found" }, 404);
  return c.json({
    op: "clientNotes.list",
    notes: rows.map(serializeClientNote),
  });
});

/** Domain op: clientNotes.create */
crmRoutes.post("/client-notes", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const tenant = requireBusinessTenant(c);
  if (!tenant) return c.json(noBusiness(), 400);
  if (!can(tenant.role, "client:write")) return c.json({ error: "forbidden" }, 403);

  const parsed = ClientNotesCreateInputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  const result = await createClientNote(db, tenant, parsed.data);
  if ("error" in result) return c.json({ error: "not_found" }, 404);
  return c.json(
    { op: "clientNotes.create", note: serializeClientNote(result.note) },
    201,
  );
});
