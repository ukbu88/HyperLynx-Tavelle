import { z } from "zod";

/**
 * Explicit domain ops — interface-independent contracts.
 * Business workspace context is resolved server-side (never trust body businessId alone).
 */
export const BusinessOps = {
  list: "businesses.list",
  setActive: "businesses.setActive",
  getModules: "businesses.getModules",
} as const;

export const BusinessSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
export type Business = z.infer<typeof BusinessSchema>;

export const SwitchBusinessSchema = z.object({
  businessId: z.string().min(1),
});
export type SwitchBusinessInput = z.infer<typeof SwitchBusinessSchema>;

export const BusinessModuleConfigSchema = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type BusinessModuleConfig = z.infer<typeof BusinessModuleConfigSchema>;

/** Known module keys for Phase 3 basic config (CRM on for both businesses). */
export const CORE_MODULE_KEYS = ["crm"] as const;
export type CoreModuleKey = (typeof CORE_MODULE_KEYS)[number];
