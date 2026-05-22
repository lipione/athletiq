CREATE TABLE IF NOT EXISTS "analytics_report_drafts" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "report_type" varchar(64) NOT NULL,
  "scope" varchar(128) NOT NULL,
  "locale" varchar(16) NOT NULL,
  "status" varchar(32) NOT NULL,
  "requires_approval" boolean DEFAULT true NOT NULL,
  "sections" jsonb NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "approved_by" varchar(64) REFERENCES "users"("id"),
  "approval_note" text,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "analytics_report_drafts_tenant_id_idx" ON "analytics_report_drafts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "analytics_report_drafts_status_idx" ON "analytics_report_drafts" ("status");
CREATE INDEX IF NOT EXISTS "analytics_report_drafts_created_at_idx" ON "analytics_report_drafts" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_report_drafts_tenant_id_id_unique" ON "analytics_report_drafts" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "spreadsheet_imports" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "source_name" varchar(255) NOT NULL,
  "entity_type" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL,
  "total_rows" integer NOT NULL,
  "valid_rows" integer NOT NULL,
  "invalid_rows" integer NOT NULL,
  "errors" jsonb NOT NULL,
  "rows" jsonb NOT NULL,
  "committed_rows" integer,
  "committed_by" varchar(64) REFERENCES "users"("id"),
  "committed_at" timestamp with time zone,
  "rollback_reason" text,
  "rolled_back_by" varchar(64) REFERENCES "users"("id"),
  "rolled_back_at" timestamp with time zone,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "spreadsheet_imports_tenant_id_idx" ON "spreadsheet_imports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "spreadsheet_imports_status_idx" ON "spreadsheet_imports" ("status");
CREATE INDEX IF NOT EXISTS "spreadsheet_imports_created_at_idx" ON "spreadsheet_imports" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "spreadsheet_imports_tenant_id_id_unique" ON "spreadsheet_imports" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "partner_api_keys" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "partner_name" varchar(255) NOT NULL,
  "key_prefix" varchar(32) NOT NULL,
  "secret_hash" varchar(128) NOT NULL,
  "scopes" text[] NOT NULL,
  "status" varchar(32) NOT NULL,
  "expires_at" timestamp with time zone,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "partner_api_keys_tenant_id_idx" ON "partner_api_keys" ("tenant_id");
CREATE INDEX IF NOT EXISTS "partner_api_keys_status_idx" ON "partner_api_keys" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "partner_api_keys_key_prefix_unique" ON "partner_api_keys" ("key_prefix");

CREATE TABLE IF NOT EXISTS "export_bundles" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "tournament_id" varchar(64) NOT NULL REFERENCES "tournaments"("id"),
  "formats" text[] NOT NULL,
  "include" text[] NOT NULL,
  "status" varchar(32) NOT NULL,
  "download_url" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "export_bundles_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "tournaments"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "export_bundles_tenant_id_idx" ON "export_bundles" ("tenant_id");
CREATE INDEX IF NOT EXISTS "export_bundles_tournament_id_idx" ON "export_bundles" ("tournament_id");
CREATE INDEX IF NOT EXISTS "export_bundles_expires_at_idx" ON "export_bundles" ("expires_at");

CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "url" text NOT NULL,
  "events" text[] NOT NULL,
  "secret_label" varchar(128),
  "status" varchar(32) NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_tenant_id_idx" ON "webhook_subscriptions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_status_idx" ON "webhook_subscriptions" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_subscriptions_tenant_id_id_unique" ON "webhook_subscriptions" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "webhook_id" varchar(64) NOT NULL REFERENCES "webhook_subscriptions"("id"),
  "event" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "attempt" integer NOT NULL,
  "response_code" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webhook_deliveries_tenant_webhook_fk" FOREIGN KEY ("tenant_id","webhook_id") REFERENCES "webhook_subscriptions"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "webhook_deliveries_tenant_id_idx" ON "webhook_deliveries" ("tenant_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries" ("webhook_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_created_at_idx" ON "webhook_deliveries" ("created_at");
