export {
  HealthResponseSchema,
  type HealthResponse,
} from "./health.js";

export {
  StaffRoleSchema,
  PermissionSchema,
  ROLE_PERMISSIONS,
  can,
  type StaffRole,
  type Permission,
} from "./permissions.js";

export {
  OrganisationSchema,
  CreateOrganisationSchema,
  SwitchOrgSchema,
  InviteStaffSchema,
  AcceptInviteSchema,
  CreateNoteSchema,
  WorkspaceNoteSchema,
  MeResponseSchema,
  type Organisation,
  type CreateOrganisationInput,
  type InviteStaffInput,
  type WorkspaceNote,
  type MeResponse,
} from "./orgs.js";

export {
  CustomerOps,
  ContactOps,
  ClientNoteOps,
  CustomerStatusSchema,
  CustomerSchema,
  CustomersCreateInputSchema,
  CustomersUpdateInputSchema,
  ContactSchema,
  ContactsCreateInputSchema,
  ContactsUpdateInputSchema,
  ClientNoteSchema,
  ClientNotesCreateInputSchema,
  ActivityEventSchema,
  type CustomerStatus,
  type Customer,
  type CustomersCreateInput,
  type CustomersUpdateInput,
  type Contact,
  type ContactsCreateInput,
  type ContactsUpdateInput,
  type ClientNote,
  type ClientNotesCreateInput,
  type ActivityEvent,
} from "./crm.js";
