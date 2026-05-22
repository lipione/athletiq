UPDATE "waiver_signatures" SET "ip_address" = 'unknown' WHERE "ip_address" IS NULL;--> statement-breakpoint
UPDATE "waiver_signatures" SET "user_agent" = 'unknown' WHERE "user_agent" IS NULL;--> statement-breakpoint
ALTER TABLE "waiver_signatures" ALTER COLUMN "ip_address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "waiver_signatures" ALTER COLUMN "user_agent" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_active_entity_unique" ON "invoices" USING btree ("entity_type","entity_id") WHERE "invoices"."status" <> 'void';
