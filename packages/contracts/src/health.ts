import { z } from "zod";

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("tavelle-api"),
  version: z.string(),
  time: z.string(),
  bindings: z.object({
    d1: z.boolean(),
    r2: z.boolean(),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
