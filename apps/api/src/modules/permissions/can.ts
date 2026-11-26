import { can as contractCan, type Permission, type StaffRole } from "@tavelle/contracts";

/** Thin re-export so API modules import from permissions module, not contracts directly for AuthZ. */
export function can(role: StaffRole, permission: Permission): boolean {
  return contractCan(role, permission);
}

export { type Permission, type StaffRole };
