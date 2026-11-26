import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@tavelle/contracts";

describe("health contract", () => {
  it("matches the shared schema shape used by /api/health", () => {
    expect(
      HealthResponseSchema.safeParse({
        ok: true,
        service: "tavelle-api",
        version: "0.0.0",
        time: "2026-11-26T02:00:00.000Z",
        bindings: { d1: true, r2: true },
      }).success,
    ).toBe(true);
  });
});
