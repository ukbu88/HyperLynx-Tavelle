import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.js";

describe("HealthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const parsed = HealthResponseSchema.parse({
      ok: true,
      service: "tavelle-api",
      version: "0.0.0",
      time: new Date().toISOString(),
      bindings: { d1: true, r2: true },
    });
    expect(parsed.ok).toBe(true);
  });
});
