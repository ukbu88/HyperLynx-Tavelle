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

  it("allows member client write; blocks viewer", () => {
    expect(can("member", "client:write")).toBe(true);
    expect(can("viewer", "client:write")).toBe(false);
    expect(can("viewer", "client:read")).toBe(true);
  });
});
