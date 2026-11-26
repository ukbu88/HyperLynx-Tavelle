import type { Env } from "../../env.js";

export function parsePlatformAdminEmails(env: Env): Set<string> {
  const raw = env.PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Platform-admin privilege requires both allowlist match AND verified email
 * ownership — prevents registering an allowlisted address without mailbox proof.
 */
export function isPlatformAdmin(
  env: Env,
  email: string,
  emailVerified: boolean,
): boolean {
  if (!emailVerified) return false;
  return parsePlatformAdminEmails(env).has(email.trim().toLowerCase());
}
