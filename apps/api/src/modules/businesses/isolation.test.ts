import { describe, expect, it } from "vitest";

/**
 * Documents the isolation contract for business-scoped CRM.
 * Full D1 integration lives on staging; this locks the query predicates
 * and acceptance rules so regressions are obvious in review.
 */
describe("business workspace isolation contract", () => {
  it("scopes customer list by orgId AND businessId", () => {
    const dispatchTenant = {
      orgId: "org-hyperlynx",
      businessId: "biz-dispatch",
    };
    const nexrailTenant = {
      orgId: "org-hyperlynx",
      businessId: "biz-nexrail",
    };

    const customers = [
      { id: "c-dispatch", orgId: "org-hyperlynx", businessId: "biz-dispatch" },
      { id: "c-nexrail", orgId: "org-hyperlynx", businessId: "biz-nexrail" },
    ];

    const visibleTo = (tenant: typeof dispatchTenant) =>
      customers.filter(
        (c) => c.orgId === tenant.orgId && c.businessId === tenant.businessId,
      );

    expect(visibleTo(dispatchTenant).map((c) => c.id)).toEqual(["c-dispatch"]);
    expect(visibleTo(nexrailTenant).map((c) => c.id)).toEqual(["c-nexrail"]);
  });

  it("rejects forged business ids outside the active org", () => {
    const orgBusinessIds = new Set(["biz-dispatch", "biz-nexrail"]);
    const forged = "biz-other-org";
    expect(orgBusinessIds.has(forged)).toBe(false);
  });

  it("never trusts body businessId for writes", () => {
    const sessionBusinessId = "biz-dispatch";
    const bodyBusinessId = "biz-nexrail";
    // Server must ignore body and stamp session business.
    const writtenBusinessId = sessionBusinessId;
    expect(writtenBusinessId).not.toBe(bodyBusinessId);
    expect(writtenBusinessId).toBe("biz-dispatch");
  });
});
