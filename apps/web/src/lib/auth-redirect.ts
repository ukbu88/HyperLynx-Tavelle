/** Safe in-app redirect targets only (path + optional query). */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  return decoded;
}

export function withNextParam(path: string, next: string | null): string {
  if (!next) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}next=${encodeURIComponent(next)}`;
}

export function acceptInvitePath(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return "/accept-invite";
  return `/accept-invite?token=${encodeURIComponent(trimmed)}`;
}
