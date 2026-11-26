import { z } from "zod";

/**
 * Explicit domain ops — interface-independent contracts.
 * HTTP / future channels bind to these names; UI is not the source of truth.
 * Customers / contacts are scoped to active org + active business.
 */
export const CustomerOps = {
  create: "customers.create",
  list: "customers.list",
  get: "customers.get",
  update: "customers.update",
} as const;

export const ContactOps = {
  create: "contacts.create",
  list: "contacts.list",
  update: "contacts.update",
} as const;

export const ClientNoteOps = {
  create: "clientNotes.create",
  list: "clientNotes.list",
} as const;

export const CustomerStatusSchema = z.enum(["active", "inactive", "archived"]);
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  businessId: z.string(),
  name: z.string(),
  status: CustomerStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const CustomersCreateInputSchema = z.object({
  name: z.string().min(1).max(200),
  status: CustomerStatusSchema.optional().default("active"),
});
export type CustomersCreateInput = z.infer<typeof CustomersCreateInputSchema>;

export const CustomersUpdateInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: CustomerStatusSchema.optional(),
});
export type CustomersUpdateInput = z.infer<typeof CustomersUpdateInputSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  businessId: z.string(),
  clientId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ContactsCreateInputSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).max(40).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
});
export type ContactsCreateInput = z.infer<typeof ContactsCreateInputSchema>;

export const ContactsUpdateInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).max(40).optional().nullable(),
  isPrimary: z.boolean().optional(),
});
export type ContactsUpdateInput = z.infer<typeof ContactsUpdateInputSchema>;

export const ClientNoteSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  businessId: z.string(),
  clientId: z.string(),
  body: z.string(),
  authorUserId: z.string().nullable(),
  createdAt: z.string(),
});
export type ClientNote = z.infer<typeof ClientNoteSchema>;

export const ClientNotesCreateInputSchema = z.object({
  clientId: z.string().min(1),
  body: z.string().min(1).max(4000),
});
export type ClientNotesCreateInput = z.infer<typeof ClientNotesCreateInputSchema>;

export const ActivityEventSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  businessId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
