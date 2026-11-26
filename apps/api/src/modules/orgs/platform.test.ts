import { describe, expect, it } from "vitest";
import { isPlatformAdmin } from "./platform.js";
import type { Env } from "../../env.js";

function envWithAdmins(emails: string): Env {
  return {
    DB: {} as D1Database,
    FILES: {} as R2Bucket,
    PLATFORM_ADMIN_EMAILS: emails,
  };
}

describe("isPlatformAdmin", () => {
  it("denies allowlisted email when not verified", () => {
    expect(
      isPlatformAdmin(envWithAdmins("ops@example.com"), "ops@example.com", false),
    ).toBe(false);
  });

  it("allows allowlisted email when verified", () => {
    expect(
      isPlatformAdmin(envWithAdmins("ops@example.com"), "ops@example.com", true),
    ).toBe(true);
  });

  it("denies non-allowlisted verified email", () => {
    expect(
      isPlatformAdmin(envWithAdmins("ops@example.com"), "other@example.com", true),
    ).toBe(false);
  });
});
