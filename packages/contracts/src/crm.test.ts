import { describe, expect, it } from "vitest";
import {
  BusinessOps,
  ContactOps,
  ContactsCreateInputSchema,
  CustomerOps,
  CustomersCreateInputSchema,
  CustomersUpdateInputSchema,
  CustomerSchema,
  SwitchBusinessSchema,
} from "./index.js";
import { can } from "./permissions.js";

describe("CRM domain ops contracts", () => {
  it("names customers ops explicitly (not UI-only)", () => {
    expect(CustomerOps.create).toBe("customers.create");
    expect(CustomerOps.list).toBe("customers.list");
    expect(CustomerOps.get).toBe("customers.get");
    expect(CustomerOps.update).toBe("customers.update");
    expect(ContactOps.create).toBe("contacts.create");
  });

  it("names businesses ops explicitly", () => {
    expect(BusinessOps.list).toBe("businesses.list");
    expect(BusinessOps.setActive).toBe("businesses.setActive");
    expect(BusinessOps.getModules).toBe("businesses.getModules");
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

  it("serializes customer wire shape with businessId", () => {
    const parsed = CustomerSchema.parse({
      id: "1",
      orgId: "o1",
      businessId: "b1",
      name: "Acme",
      status: "active",
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
    });
    expect(parsed.businessId).toBe("b1");
  });

  it("rejects customer without businessId", () => {
    expect(
      CustomerSchema.safeParse({
        id: "1",
        orgId: "o1",
        name: "Acme",
        status: "active",
        createdAt: "2026-11-26T00:00:00.000Z",
        updatedAt: "2026-11-26T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("validates businesses.setActive input", () => {
    expect(SwitchBusinessSchema.safeParse({ businessId: "b1" }).success).toBe(true);
    expect(SwitchBusinessSchema.safeParse({ businessId: "" }).success).toBe(false);
  });

  it("maps client write permissions for staff roles", () => {
    expect(can("member", "client:write")).toBe(true);
    expect(can("viewer", "client:write")).toBe(false);
    expect(can("viewer", "client:read")).toBe(true);
  });
});
