import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { organisations } from "./orgs.js";

/**
 * Business workspaces under an organisation.
 * Org = tenant isolation; business = operational boundary (customers live here).
 */
export const businesses = sqliteTable(
  "businesses",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("businesses_org_idx").on(table.orgId),
    uniqueIndex("businesses_org_slug_uidx").on(table.orgId, table.slug),
  ],
);

/** Per-business module flags (shared core always on; packs toggled here). */
export const businessModuleConfig = sqliteTable(
  "business_module_config",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    settings: text("settings"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("business_module_config_org_idx").on(table.orgId),
    uniqueIndex("business_module_config_biz_key_uidx").on(
      table.businessId,
      table.moduleKey,
    ),
  ],
);
