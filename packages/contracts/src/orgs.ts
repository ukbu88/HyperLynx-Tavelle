import { z } from "zod";
import { StaffRoleSchema } from "./permissions.js";

export const OrganisationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  role: StaffRoleSchema.optional(),
  displayName: z.string().nullable().optional(),
});
export type Organisation = z.infer<typeof OrganisationSchema>;

export const CreateOrganisationSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  displayName: z.string().min(1).max(120).optional(),
  ownerEmail: z.string().email().optional(),
});
export type CreateOrganisationInput = z.infer<typeof CreateOrganisationSchema>;

export const SwitchOrgSchema = z.object({
  orgId: z.string().min(1),
});

export const InviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});
export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(16),
});

export const CreateNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const WorkspaceNoteSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  body: z.string(),
  authorUserId: z.string().nullable(),
  createdAt: z.string(),
});
export type WorkspaceNote = z.infer<typeof WorkspaceNoteSchema>;

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  memberships: z.array(
    z.object({
      orgId: z.string(),
      orgName: z.string(),
      orgSlug: z.string(),
      role: StaffRoleSchema,
      status: z.string(),
      displayName: z.string().nullable().optional(),
    }),
  ),
  activeOrgId: z.string().nullable(),
  /** Active business workspace within the active org (server-resolved). */
  activeBusinessId: z.string().nullable(),
  businesses: z
    .array(
      z.object({
        id: z.string(),
        orgId: z.string(),
        name: z.string(),
        slug: z.string(),
        status: z.string(),
      }),
    )
    .default([]),
  isPlatformAdmin: z.boolean(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
