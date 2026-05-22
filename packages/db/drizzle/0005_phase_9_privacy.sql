CREATE TABLE "guardian_consents" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"guardian_name" varchar(255) NOT NULL,
	"relationship" varchar(64) NOT NULL,
	"consent_type" varchar(64) NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"recorded_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "public_profile_status" varchar(32) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "guardian_consent_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "guardian_consent_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardian_consents_tenant_id_idx" ON "guardian_consents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "guardian_consents_athlete_id_idx" ON "guardian_consents" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "guardian_consents_school_id_idx" ON "guardian_consents" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "guardian_consents_created_at_idx" ON "guardian_consents" USING btree ("created_at");