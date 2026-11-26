import { describe, expect, it } from "vitest";
import { can, ROLE_PERMISSIONS } from "./permissions.js";

describe("can()", () => {
  it("grants owner full baseline catalogue", () => {
    expect(can("owner", "org:manage")).toBe(true);
    expect(can("owner", "member:invite")).toBe(true);
    expect(can("owner", "note:write")).toBe(true);
  });

  it("denies viewer mutations", () => {
    expect(can("viewer", "note:write")).toBe(false);
    expect(can("viewer", "member:invite")).toBe(false);
    expect(can("viewer", "note:read")).toBe(true);
  });

  it("does not grant org:provision via staff roles (platform-only)", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Array<
      keyof typeof ROLE_PERMISSIONS
    >) {
      expect(ROLE_PERMISSIONS[role].includes("org:provision" as never)).toBe(
        false,
      );
    }
  });
});
