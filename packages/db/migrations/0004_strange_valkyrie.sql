CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `businesses_org_idx` ON `businesses` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_org_slug_uidx` ON `businesses` (`org_id`,`slug`);--> statement-breakpoint
CREATE TABLE `business_module_config` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`business_id` text NOT NULL,
	`module_key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `business_module_config_org_idx` ON `business_module_config` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `business_module_config_biz_key_uidx` ON `business_module_config` (`business_id`,`module_key`);--> statement-breakpoint
-- Seed Dispatch Sites for every existing org so CRM rows can be backfilled.
INSERT INTO `businesses` (`id`, `org_id`, `name`, `slug`, `status`, `created_at`, `updated_at`)
SELECT
	'migrate-dispatch-' || `id`,
	`id`,
	'Dispatch Sites',
	'dispatch-sites',
	'active',
	cast(unixepoch('subsecond') * 1000 as integer),
	cast(unixepoch('subsecond') * 1000 as integer)
FROM `organisations`;--> statement-breakpoint
-- Seed NexRail on HyperLynx-named orgs (idempotent seed endpoint fills gaps later).
INSERT INTO `businesses` (`id`, `org_id`, `name`, `slug`, `status`, `created_at`, `updated_at`)
SELECT
	'migrate-nexrail-' || `id`,
	`id`,
	'NexRail',
	'nexrail',
	'active',
	cast(unixepoch('subsecond') * 1000 as integer),
	cast(unixepoch('subsecond') * 1000 as integer)
FROM `organisations`
WHERE lower(`slug`) LIKE '%hyperlynx%' OR lower(`name`) LIKE '%hyperlynx%';--> statement-breakpoint
INSERT INTO `business_module_config` (`id`, `org_id`, `business_id`, `module_key`, `enabled`, `created_at`, `updated_at`)
SELECT
	'mod-crm-' || `id`,
	`org_id`,
	`id`,
	'crm',
	1,
	cast(unixepoch('subsecond') * 1000 as integer),
	cast(unixepoch('subsecond') * 1000 as integer)
FROM `businesses`;--> statement-breakpoint
ALTER TABLE `activity_events` ADD `business_id` text REFERENCES businesses(id);--> statement-breakpoint
CREATE INDEX `activity_events_org_business_created_idx` ON `activity_events` (`org_id`,`business_id`,`created_at`);--> statement-breakpoint
-- Nullable first (SQLite cannot ADD NOT NULL without default when rows exist), then backfill.
ALTER TABLE `clients` ADD `business_id` text REFERENCES businesses(id);--> statement-breakpoint
UPDATE `clients`
SET `business_id` = (
	SELECT `b`.`id` FROM `businesses` AS `b`
	WHERE `b`.`org_id` = `clients`.`org_id` AND `b`.`slug` = 'dispatch-sites'
	LIMIT 1
)
WHERE `business_id` IS NULL;--> statement-breakpoint
CREATE INDEX `clients_org_business_idx` ON `clients` (`org_id`,`business_id`);--> statement-breakpoint
ALTER TABLE `contacts` ADD `business_id` text REFERENCES businesses(id);--> statement-breakpoint
UPDATE `contacts`
SET `business_id` = (
	SELECT `c`.`business_id` FROM `clients` AS `c`
	WHERE `c`.`id` = `contacts`.`client_id`
	LIMIT 1
)
WHERE `business_id` IS NULL;--> statement-breakpoint
CREATE INDEX `contacts_org_business_idx` ON `contacts` (`org_id`,`business_id`);--> statement-breakpoint
ALTER TABLE `client_notes` ADD `business_id` text REFERENCES businesses(id);--> statement-breakpoint
UPDATE `client_notes`
SET `business_id` = (
	SELECT `c`.`business_id` FROM `clients` AS `c`
	WHERE `c`.`id` = `client_notes`.`client_id`
	LIMIT 1
)
WHERE `business_id` IS NULL;--> statement-breakpoint
CREATE INDEX `client_notes_org_business_idx` ON `client_notes` (`org_id`,`business_id`);--> statement-breakpoint
UPDATE `activity_events`
SET `business_id` = (
	SELECT `b`.`id` FROM `businesses` AS `b`
	WHERE `b`.`org_id` = `activity_events`.`org_id` AND `b`.`slug` = 'dispatch-sites'
	LIMIT 1
)
WHERE `business_id` IS NULL;
