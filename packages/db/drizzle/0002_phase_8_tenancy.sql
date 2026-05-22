CREATE TABLE "athlete_guardians" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"guardian_id" varchar(64) NOT NULL,
	"relationship" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federation_overrides" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"scope" varchar(64) NOT NULL,
	"target_id" varchar(64) NOT NULL,
	"field" varchar(128) NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"actor_user_id" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"user_id" varchar(64),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(64),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"match_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"type" varchar(64) NOT NULL,
	"minute" integer,
	"details" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"corrected_by" varchar(64),
	"corrected_at" timestamp with time zone,
	"corrected_from_event_id" varchar(64),
	"correction_reason" text,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"code" varchar(255) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"school_id" varchar(64),
	"tournament_id" varchar(64),
	"match_id" varchar(64),
	"team_id" varchar(64),
	"athlete_id" varchar(64),
	"revoked" boolean DEFAULT false NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"role" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"invited_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_mutations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"client_id" varchar(128) NOT NULL,
	"mutation_id" varchar(128) NOT NULL,
	"actor_user_id" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"mutation_type" varchar(128) NOT NULL,
	"mutation_payload" jsonb NOT NULL,
	"error_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"athlete_id" varchar(64) NOT NULL,
	"role" varchar(64) DEFAULT 'player' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"type" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "tenants" ("id", "type", "name", "status")
VALUES ('platform', 'platform', 'ATHLETIQ Platform', 'active')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tenants" ("id", "type", "name", "status", "created_at", "updated_at")
SELECT "id", 'school', "name", CASE WHEN "status" = 'approved' THEN 'active' ELSE 'pending' END, "created_at", "updated_at"
FROM "schools"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"registered_by" varchar(64) NOT NULL,
	"approved_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "athletes" SET "tenant_id" = "school_id" WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "athletes" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "audit_logs" SET "tenant_id" = 'platform' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "matches" SET "tenant_id" = 'platform' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "schools" SET "tenant_id" = "id" WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "teams" SET "tenant_id" = "school_id" WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "tournaments" SET "tenant_id" = 'platform' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" varchar(64);--> statement-breakpoint
UPDATE "users" SET "tenant_id" = 'platform' WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_overrides" ADD CONSTRAINT "federation_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_overrides" ADD CONSTRAINT "federation_overrides_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mutations" ADD CONSTRAINT "sync_mutations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mutations" ADD CONSTRAINT "sync_mutations_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_guardians_tenant_id_idx" ON "athlete_guardians" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "athlete_guardians_athlete_id_idx" ON "athlete_guardians" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "athlete_guardians_guardian_id_idx" ON "athlete_guardians" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "athlete_guardians_created_at_idx" ON "athlete_guardians" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_guardians_athlete_guardian_unique" ON "athlete_guardians" USING btree ("athlete_id","guardian_id");--> statement-breakpoint
CREATE INDEX "federation_overrides_tenant_id_idx" ON "federation_overrides" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "federation_overrides_target_id_idx" ON "federation_overrides" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "federation_overrides_created_at_idx" ON "federation_overrides" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "guardians_tenant_id_idx" ON "guardians" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "guardians_school_id_idx" ON "guardians" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "guardians_user_id_idx" ON "guardians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardians_created_at_idx" ON "guardians" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_events_tenant_id_idx" ON "match_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "match_events_match_id_idx" ON "match_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_events_tournament_id_idx" ON "match_events" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "match_events_athlete_id_idx" ON "match_events" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "match_events_team_id_idx" ON "match_events" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "match_events_created_at_idx" ON "match_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qr_codes_tenant_id_idx" ON "qr_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "qr_codes_school_id_idx" ON "qr_codes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "qr_codes_tournament_id_idx" ON "qr_codes" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "qr_codes_match_id_idx" ON "qr_codes" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "qr_codes_team_id_idx" ON "qr_codes" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "qr_codes_athlete_id_idx" ON "qr_codes" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "qr_codes_created_at_idx" ON "qr_codes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_codes_code_unique" ON "qr_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "school_users_tenant_id_idx" ON "school_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "school_users_school_id_idx" ON "school_users" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "school_users_user_id_idx" ON "school_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "school_users_created_at_idx" ON "school_users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "school_users_school_user_role_unique" ON "school_users" USING btree ("school_id","user_id","role");--> statement-breakpoint
CREATE INDEX "sync_mutations_tenant_id_idx" ON "sync_mutations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sync_mutations_client_id_idx" ON "sync_mutations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "sync_mutations_created_at_idx" ON "sync_mutations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_mutations_tenant_client_mutation_unique" ON "sync_mutations" USING btree ("tenant_id","client_id","mutation_id");--> statement-breakpoint
CREATE INDEX "team_members_tenant_id_idx" ON "team_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_athlete_id_idx" ON "team_members" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "team_members_created_at_idx" ON "team_members" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_athlete_unique" ON "team_members" USING btree ("team_id","athlete_id");--> statement-breakpoint
CREATE INDEX "tenants_type_idx" ON "tenants" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tournament_registrations_tenant_id_idx" ON "tournament_registrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_tournament_id_idx" ON "tournament_registrations" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_school_id_idx" ON "tournament_registrations" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_created_at_idx" ON "tournament_registrations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_registrations_tournament_school_unique" ON "tournament_registrations" USING btree ("tournament_id","school_id");--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_coach_user_id_users_id_fk" FOREIGN KEY ("coach_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athletes_tenant_id_idx" ON "athletes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "athletes_school_id_idx" ON "athletes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "athletes_created_at_idx" ON "athletes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athletes_athletiq_id_unique" ON "athletes" USING btree ("athletiq_id");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "matches_tenant_id_idx" ON "matches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "matches_tournament_id_idx" ON "matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "matches_home_team_id_idx" ON "matches" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "matches_away_team_id_idx" ON "matches" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "matches_created_at_idx" ON "matches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "schools_tenant_id_idx" ON "schools" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "schools_created_at_idx" ON "schools" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "teams_tenant_id_idx" ON "teams" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "teams_tournament_id_idx" ON "teams" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "teams_school_id_idx" ON "teams" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_tournament_school_name_unique" ON "teams" USING btree ("tournament_id","school_id","name");--> statement-breakpoint
CREATE INDEX "tournaments_tenant_id_idx" ON "tournaments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tournaments_created_at_idx" ON "tournaments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_id_id_unique" ON "users" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_tenant_id_id_unique" ON "schools" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "athletes_tenant_id_id_unique" ON "athletes" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_tenant_id_id_unique" ON "guardians" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_tenant_id_id_unique" ON "tournaments" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_tenant_id_id_unique" ON "teams" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tenant_id_id_unique" ON "matches" USING btree ("tenant_id","id");--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_tenant_guardian_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_team_fk" FOREIGN KEY ("tenant_id","team_id") REFERENCES "public"."teams"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_tenant_team_fk" FOREIGN KEY ("tenant_id","team_id") REFERENCES "public"."teams"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_match_fk" FOREIGN KEY ("tenant_id","match_id") REFERENCES "public"."matches"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_team_fk" FOREIGN KEY ("tenant_id","team_id") REFERENCES "public"."teams"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "public"."athletes"("tenant_id","id") ON DELETE no action ON UPDATE no action;
