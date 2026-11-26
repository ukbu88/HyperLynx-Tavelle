import { describe, expect, it } from "vitest";
import { can } from "./can.js";

describe("permissions.can", () => {
  it("allows admin to invite members", () => {
    expect(can("admin", "member:invite")).toBe(true);
  });

  it("blocks member from inviting", () => {
    expect(can("member", "member:invite")).toBe(false);
  });

  it("blocks viewer from writing notes", () => {
    expect(can("viewer", "note:write")).toBe(false);
  });
});
