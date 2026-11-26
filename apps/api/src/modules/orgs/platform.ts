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

export function isPlatformAdmin(env: Env, email: string): boolean {
  return parsePlatformAdminEmails(env).has(email.trim().toLowerCase());
}
