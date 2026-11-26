/** UUID v4 via Web Crypto (Workers-safe). */
export function newId(): string {
  return crypto.randomUUID();
}

/** Opaque invite / magic tokens. */
export function newToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}
