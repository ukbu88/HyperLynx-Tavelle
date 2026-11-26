export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  /** Better Auth secret — set via wrangler secret / .dev.vars */
  BETTER_AUTH_SECRET?: string;
  /** Public origin for auth links (e.g. https://tavelle-api-staging….workers.dev) */
  BETTER_AUTH_URL?: string;
  /** Comma-separated emails allowed to provision orgs (invite-only ops). */
  PLATFORM_ADMIN_EMAILS?: string;
  /** Optional transactional email (stubbed when unset). */
  EMAIL_FROM?: string;
  EMAIL_API_KEY?: string;
};

export type AppSessionUser = {
  id: string;
  email: string;
  name: string;
};

export type TenantContext = {
  orgId: string;
  actorUserId: string;
  actorKind: "staff";
  role: "owner" | "admin" | "member" | "viewer";
  clientId?: string;
};

export type AppVariables = {
  requestId: string;
  sessionUser: AppSessionUser | null;
  tenant: TenantContext | null;
};
