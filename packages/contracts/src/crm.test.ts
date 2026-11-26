import { describe, expect, it } from "vitest";
import {
  ContactOps,
  ContactsCreateInputSchema,
  CustomerOps,
  CustomersCreateInputSchema,
  CustomersUpdateInputSchema,
  CustomerSchema,
} from "./crm.js";
import { can } from "./permissions.js";

describe("CRM domain ops contracts", () => {
  it("names customers ops explicitly (not UI-only)", () => {
    expect(CustomerOps.create).toBe("customers.create");
    expect(CustomerOps.list).toBe("customers.list");
    expect(CustomerOps.get).toBe("customers.get");
    expect(CustomerOps.update).toBe("customers.update");
    expect(ContactOps.create).toBe("contacts.create");
  });

  it("validates customers.create input", () => {
    const ok = CustomersCreateInputSchema.safeParse({ name: "Dispatch Co" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.status).toBe("active");

    const bad = CustomersCreateInputSchema.safeParse({ name: "" });
    expect(bad.success).toBe(false);
  });

  it("validates customers.update partials", () => {
    expect(CustomersUpdateInputSchema.safeParse({ status: "inactive" }).success).toBe(
      true,
    );
    expect(CustomersUpdateInputSchema.safeParse({ status: "nope" }).success).toBe(
      false,
    );
  });

  it("requires clientId on contacts.create", () => {
    const ok = ContactsCreateInputSchema.safeParse({
      clientId: "c1",
      name: "Alex",
      isPrimary: true,
    });
    expect(ok.success).toBe(true);

    const bad = ContactsCreateInputSchema.safeParse({ name: "Alex" });
    expect(bad.success).toBe(false);
  });

  it("serializes customer wire shape", () => {
    const parsed = CustomerSchema.parse({
      id: "1",
      orgId: "o1",
      name: "Acme",
      status: "active",
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
    });
    expect(parsed.name).toBe("Acme");
  });

  it("maps client write permissions for staff roles", () => {
    expect(can("member", "client:write")).toBe(true);
    expect(can("viewer", "client:write")).toBe(false);
    expect(can("viewer", "client:read")).toBe(true);
  });
});
