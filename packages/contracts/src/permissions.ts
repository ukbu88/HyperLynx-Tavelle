import { z } from "zod";

export const StaffRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const PermissionSchema = z.enum([
  "org:manage",
  "org:provision",
  "member:invite",
  "member:read",
  "note:read",
  "note:write",
  "client:read",
  "client:write",
  "project:read",
  "project:write",
  "task:write",
  "portal:invite",
]);
export type Permission = z.infer<typeof PermissionSchema>;

/** Default role → permission map (seeded conceptually; enforced in API). */
export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  owner: [
    "org:manage",
    "member:invite",
    "member:read",
    "note:read",
    "note:write",
    "client:read",
    "client:write",
    "project:read",
    "project:write",
    "task:write",
    "portal:invite",
  ],
  admin: [
    "org:manage",
    "member:invite",
    "member:read",
    "note:read",
    "note:write",
    "client:read",
    "client:write",
    "project:read",
    "project:write",
    "task:write",
    "portal:invite",
  ],
  member: [
    "member:read",
    "note:read",
    "note:write",
    "client:read",
    "client:write",
    "project:read",
    "project:write",
    "task:write",
  ],
  viewer: [
    "member:read",
    "note:read",
    "client:read",
    "project:read",
  ],
} as const;

export function can(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
