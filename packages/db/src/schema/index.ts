import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Foundation meta table — proves migrations + D1 wiring.
 * Domain tables (orgs, memberships, CRM, …) land in later Phase 1 / Phase 2 work.
 */
export const schemaMeta = sqliteTable("schema_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
