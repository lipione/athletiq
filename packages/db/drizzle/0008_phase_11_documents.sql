CREATE TABLE "document_duplicate_candidates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"document_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"matched_document_id" varchar(64) NOT NULL,
	"matched_athlete_id" varchar(64) NOT NULL,
	"score" integer NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_extractions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"document_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"extracted" jsonb NOT NULL,
	"field_confidence" jsonb NOT NULL,
	"review_flags" jsonb NOT NULL,
	"overall_confidence" integer NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_review_flags" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"document_id" varchar(64) NOT NULL,
	"extraction_id" varchar(64),
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_review_links" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"document_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_reviews" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"document_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"corrections" jsonb NOT NULL,
	"review_metadata" jsonb NOT NULL,
	"reviewed_by" varchar(64) NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_documents" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'uploaded' NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256_hash" varchar(128) NOT NULL,
	"storage_key" text NOT NULL,
	"malware_scan_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"uploaded_by" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verified_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "identity_documents_tenant_id_id_unique" ON "identity_documents" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_extractions_tenant_id_id_unique" ON "document_extractions" USING btree ("tenant_id","id");--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_document_id_identity_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_matched_document_id_identity_documents_id_fk" FOREIGN KEY ("matched_document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_matched_athlete_id_athletes_id_fk" FOREIGN KEY ("matched_athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_document_fk" FOREIGN KEY ("tenant_id","document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_matched_document_fk" FOREIGN KEY ("tenant_id","matched_document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_duplicate_candidates" ADD CONSTRAINT "document_duplicate_candidates_tenant_matched_athlete_fk" FOREIGN KEY ("tenant_id","matched_athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_document_id_identity_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_tenant_document_fk" FOREIGN KEY ("tenant_id","document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_document_id_identity_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_extraction_id_document_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."document_extractions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_tenant_document_fk" FOREIGN KEY ("tenant_id","document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_tenant_extraction_fk" FOREIGN KEY ("tenant_id","extraction_id") REFERENCES "public"."document_extractions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_flags" ADD CONSTRAINT "document_review_flags_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_document_id_identity_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_tenant_document_fk" FOREIGN KEY ("tenant_id","document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_review_links" ADD CONSTRAINT "document_review_links_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_document_id_identity_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."identity_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_tenant_document_fk" FOREIGN KEY ("tenant_id","document_id") REFERENCES "public"."identity_documents"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_tenant_id_idx" ON "document_duplicate_candidates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_document_id_idx" ON "document_duplicate_candidates" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_school_id_idx" ON "document_duplicate_candidates" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_athlete_id_idx" ON "document_duplicate_candidates" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_status_idx" ON "document_duplicate_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_duplicate_candidates_created_at_idx" ON "document_duplicate_candidates" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_duplicate_candidates_document_match_unique" ON "document_duplicate_candidates" USING btree ("document_id","matched_document_id","matched_athlete_id");--> statement-breakpoint
CREATE INDEX "document_extractions_tenant_id_idx" ON "document_extractions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_extractions_document_id_idx" ON "document_extractions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_extractions_school_id_idx" ON "document_extractions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "document_extractions_athlete_id_idx" ON "document_extractions" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "document_extractions_created_at_idx" ON "document_extractions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_extractions_document_id_unique" ON "document_extractions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_review_flags_tenant_id_idx" ON "document_review_flags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_review_flags_document_id_idx" ON "document_review_flags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_review_flags_school_id_idx" ON "document_review_flags" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "document_review_flags_athlete_id_idx" ON "document_review_flags" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "document_review_flags_status_idx" ON "document_review_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_review_flags_created_at_idx" ON "document_review_flags" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_review_links_tenant_id_idx" ON "document_review_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_review_links_document_id_idx" ON "document_review_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_review_links_school_id_idx" ON "document_review_links" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "document_review_links_athlete_id_idx" ON "document_review_links" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "document_review_links_token_hash_idx" ON "document_review_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "document_review_links_expires_at_idx" ON "document_review_links" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_review_links_token_hash_unique" ON "document_review_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "document_reviews_tenant_id_idx" ON "document_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_reviews_document_id_idx" ON "document_reviews" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_reviews_school_id_idx" ON "document_reviews" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "document_reviews_athlete_id_idx" ON "document_reviews" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "document_reviews_action_idx" ON "document_reviews" USING btree ("action");--> statement-breakpoint
CREATE INDEX "document_reviews_created_at_idx" ON "document_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "identity_documents_tenant_id_idx" ON "identity_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "identity_documents_school_id_idx" ON "identity_documents" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "identity_documents_athlete_id_idx" ON "identity_documents" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "identity_documents_status_idx" ON "identity_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "identity_documents_expires_at_idx" ON "identity_documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "identity_documents_created_at_idx" ON "identity_documents" USING btree ("created_at");--> statement-breakpoint
