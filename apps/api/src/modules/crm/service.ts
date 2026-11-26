import { and, desc, eq, isNull, ne } from "drizzle-orm";
import {
  clientNotes,
  clients,
  contacts,
  type TavelleDb,
} from "@tavelle/db";
import type {
  ClientNotesCreateInput,
  ContactsCreateInput,
  ContactsUpdateInput,
  CustomersCreateInput,
  CustomersUpdateInput,
} from "@tavelle/contracts";
import { CustomerOps, ContactOps, ClientNoteOps } from "@tavelle/contracts";
import { newId } from "../../lib/ids.js";
import type { TenantContext } from "../../env.js";
import { recordActivity } from "../activity/service.js";

function notDeleted() {
  return isNull(clients.deletedAt);
}

function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("UNIQUE constraint failed") ||
    message.includes("contacts_one_primary_uidx")
  );
}

export async function listCustomers(db: TavelleDb, tenant: TenantContext) {
  return db
    .select()
    .from(clients)
    .where(and(eq(clients.orgId, tenant.orgId), notDeleted()))
    .orderBy(desc(clients.createdAt))
    .all();
}

export async function getCustomerInTenant(
  db: TavelleDb,
  tenant: TenantContext,
  customerId: string,
) {
  return db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, customerId),
        eq(clients.orgId, tenant.orgId),
        notDeleted(),
      ),
    )
    .get();
}

/** Domain op: customers.create — orgId always from TenantContext. */
export async function createCustomer(
  db: TavelleDb,
  tenant: TenantContext,
  input: CustomersCreateInput,
) {
  const id = newId();
  const now = new Date();
  await db.insert(clients).values({
    id,
    orgId: tenant.orgId,
    name: input.name,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity(db, tenant, {
    action: CustomerOps.create,
    entityType: "customer",
    entityId: id,
    metadata: { name: input.name, status: input.status },
  });

  return {
    id,
    orgId: tenant.orgId,
    name: input.name,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
}

/** Domain op: customers.update */
export async function updateCustomer(
  db: TavelleDb,
  tenant: TenantContext,
  customerId: string,
  input: CustomersUpdateInput,
) {
  const existing = await getCustomerInTenant(db, tenant, customerId);
  if (!existing) return null;

  const now = new Date();
  const next = {
    name: input.name ?? existing.name,
    status: input.status ?? existing.status,
    updatedAt: now,
  };

  await db
    .update(clients)
    .set(next)
    .where(
      and(eq(clients.id, customerId), eq(clients.orgId, tenant.orgId)),
    );

  await recordActivity(db, tenant, {
    action: CustomerOps.update,
    entityType: "customer",
    entityId: customerId,
    metadata: {
      name: next.name,
      status: next.status,
    },
  });

  return {
    id: existing.id,
    orgId: existing.orgId,
    name: next.name,
    status: next.status,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export async function listContactsForCustomer(
  db: TavelleDb,
  tenant: TenantContext,
  clientId: string,
) {
  const customer = await getCustomerInTenant(db, tenant, clientId);
  if (!customer) return null;

  const rows = await db
    .select()
    .from(contacts)
    .where(
      and(eq(contacts.orgId, tenant.orgId), eq(contacts.clientId, clientId)),
    )
    .orderBy(desc(contacts.isPrimary), desc(contacts.createdAt))
    .all();
  return rows;
}

export async function getContactInTenant(
  db: TavelleDb,
  tenant: TenantContext,
  contactId: string,
) {
  return db
    .select()
    .from(contacts)
    .where(
      and(eq(contacts.id, contactId), eq(contacts.orgId, tenant.orgId)),
    )
    .get();
}

/**
 * Domain op: contacts.create — one primary contact per customer.
 * Demotion + insert run in a single D1 batch (atomic); partial unique index
 * enforces the invariant under concurrency.
 */
export async function createContact(
  db: TavelleDb,
  tenant: TenantContext,
  input: ContactsCreateInput,
) {
  const customer = await getCustomerInTenant(db, tenant, input.clientId);
  if (!customer) return { error: "customer_not_found" as const };

  const id = newId();
  const now = new Date();
  const isPrimary = input.isPrimary ?? false;

  const insert = db.insert(contacts).values({
    id,
    orgId: tenant.orgId,
    clientId: input.clientId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    isPrimary,
    createdAt: now,
    updatedAt: now,
  });

  try {
    if (isPrimary) {
      const clear = db
        .update(contacts)
        .set({ isPrimary: false, updatedAt: now })
        .where(
          and(
            eq(contacts.orgId, tenant.orgId),
            eq(contacts.clientId, input.clientId),
            eq(contacts.isPrimary, true),
          ),
        );
      await db.batch([clear, insert]);
    } else {
      await insert;
    }
  } catch (err) {
    if (isPrimary && isUniqueConstraintError(err)) {
      return { error: "primary_conflict" as const };
    }
    throw err;
  }

  await recordActivity(db, tenant, {
    action: ContactOps.create,
    entityType: "contact",
    entityId: id,
    metadata: {
      clientId: input.clientId,
      name: input.name,
      isPrimary,
    },
  });

  return {
    contact: {
      id,
      orgId: tenant.orgId,
      clientId: input.clientId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      isPrimary,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/**
 * Domain op: contacts.update
 * Primary replacement uses atomic batch + unique index (same as create).
 */
export async function updateContact(
  db: TavelleDb,
  tenant: TenantContext,
  contactId: string,
  input: ContactsUpdateInput,
) {
  const existing = await getContactInTenant(db, tenant, contactId);
  if (!existing) return null;

  const now = new Date();
  const next = {
    name: input.name ?? existing.name,
    email: input.email === undefined ? existing.email : input.email,
    phone: input.phone === undefined ? existing.phone : input.phone,
    isPrimary:
      input.isPrimary === undefined ? existing.isPrimary : input.isPrimary,
    updatedAt: now,
  };

  const write = db
    .update(contacts)
    .set(next)
    .where(
      and(eq(contacts.id, contactId), eq(contacts.orgId, tenant.orgId)),
    );

  try {
    if (next.isPrimary && !existing.isPrimary) {
      const clearOthers = db
        .update(contacts)
        .set({ isPrimary: false, updatedAt: now })
        .where(
          and(
            eq(contacts.orgId, tenant.orgId),
            eq(contacts.clientId, existing.clientId),
            eq(contacts.isPrimary, true),
            ne(contacts.id, contactId),
          ),
        );
      await db.batch([clearOthers, write]);
    } else {
      await write;
    }
  } catch (err) {
    if (next.isPrimary && isUniqueConstraintError(err)) {
      return { error: "primary_conflict" as const };
    }
    throw err;
  }

  await recordActivity(db, tenant, {
    action: ContactOps.update,
    entityType: "contact",
    entityId: contactId,
    metadata: {
      clientId: existing.clientId,
      name: next.name,
      isPrimary: next.isPrimary,
    },
  });

  return {
    contact: {
      id: existing.id,
      orgId: existing.orgId,
      clientId: existing.clientId,
      name: next.name,
      email: next.email,
      phone: next.phone,
      isPrimary: next.isPrimary,
      createdAt: existing.createdAt,
      updatedAt: now,
    },
  };
}

export async function listClientNotes(
  db: TavelleDb,
  tenant: TenantContext,
  clientId: string,
) {
  const customer = await getCustomerInTenant(db, tenant, clientId);
  if (!customer) return null;

  return db
    .select()
    .from(clientNotes)
    .where(
      and(
        eq(clientNotes.orgId, tenant.orgId),
        eq(clientNotes.clientId, clientId),
      ),
    )
    .orderBy(desc(clientNotes.createdAt))
    .all();
}

/** Domain op: clientNotes.create */
export async function createClientNote(
  db: TavelleDb,
  tenant: TenantContext,
  input: ClientNotesCreateInput,
) {
  const customer = await getCustomerInTenant(db, tenant, input.clientId);
  if (!customer) return { error: "customer_not_found" as const };

  const id = newId();
  const now = new Date();
  await db.insert(clientNotes).values({
    id,
    orgId: tenant.orgId,
    clientId: input.clientId,
    authorUserId: tenant.actorUserId,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity(db, tenant, {
    action: ClientNoteOps.create,
    entityType: "client_note",
    entityId: id,
    metadata: { clientId: input.clientId },
  });

  return {
    note: {
      id,
      orgId: tenant.orgId,
      clientId: input.clientId,
      body: input.body,
      authorUserId: tenant.actorUserId,
      createdAt: now,
    },
  };
}
