CREATE TABLE "availability_windows" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(32) NOT NULL,
	"reason" text,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_schedules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"match_id" varchar(64) NOT NULL,
	"venue_unit_id" varchar(64) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"conflict_warnings" text[] NOT NULL,
	"override_reason" text,
	"created_by" varchar(64) NOT NULL,
	"published_by" varchar(64),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_assignments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"match_id" varchar(64) NOT NULL,
	"official_profile_id" varchar(64) NOT NULL,
	"role" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'proposed' NOT NULL,
	"assigned_by" varchar(64) NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"report" text
);
--> statement-breakpoint
CREATE TABLE "official_payout_exports" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"official_profile_id" varchar(64) NOT NULL,
	"assignment_ids" text[] NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'exported' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reconciled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "official_profiles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"sports" text[] NOT NULL,
	"certification_level" varchar(64),
	"home_school_id" varchar(64),
	"payout_rate" integer,
	"payout_currency" varchar(16),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_notifications" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"recipient_user_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"type" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "venue_units" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"facility_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"unit_type" varchar(32) NOT NULL,
	"sports" text[] NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_tenant_id_id_unique" ON "facilities" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_units_tenant_id_id_unique" ON "venue_units" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "official_profiles_tenant_id_id_unique" ON "official_profiles" USING btree ("tenant_id","id");--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_venue_unit_id_venue_units_id_fk" FOREIGN KEY ("venue_unit_id") REFERENCES "public"."venue_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_tenant_match_fk" FOREIGN KEY ("tenant_id","match_id") REFERENCES "public"."matches"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_schedules" ADD CONSTRAINT "match_schedules_tenant_venue_unit_fk" FOREIGN KEY ("tenant_id","venue_unit_id") REFERENCES "public"."venue_units"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_official_profile_id_official_profiles_id_fk" FOREIGN KEY ("official_profile_id") REFERENCES "public"."official_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_tenant_match_fk" FOREIGN KEY ("tenant_id","match_id") REFERENCES "public"."matches"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_assignments" ADD CONSTRAINT "official_assignments_tenant_profile_fk" FOREIGN KEY ("tenant_id","official_profile_id") REFERENCES "public"."official_profiles"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_official_profile_id_official_profiles_id_fk" FOREIGN KEY ("official_profile_id") REFERENCES "public"."official_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_payout_exports" ADD CONSTRAINT "official_payout_exports_tenant_profile_fk" FOREIGN KEY ("tenant_id","official_profile_id") REFERENCES "public"."official_profiles"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_home_school_id_schools_id_fk" FOREIGN KEY ("home_school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_tenant_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_profiles" ADD CONSTRAINT "official_profiles_tenant_home_school_fk" FOREIGN KEY ("tenant_id","home_school_id") REFERENCES "public"."schools"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_notifications" ADD CONSTRAINT "schedule_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_notifications" ADD CONSTRAINT "schedule_notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_notifications" ADD CONSTRAINT "schedule_notifications_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_notifications" ADD CONSTRAINT "schedule_notifications_tenant_recipient_fk" FOREIGN KEY ("tenant_id","recipient_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_notifications" ADD CONSTRAINT "schedule_notifications_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_units" ADD CONSTRAINT "venue_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_units" ADD CONSTRAINT "venue_units_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_units" ADD CONSTRAINT "venue_units_tenant_facility_fk" FOREIGN KEY ("tenant_id","facility_id") REFERENCES "public"."facilities"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_windows_tenant_id_idx" ON "availability_windows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "availability_windows_resource_idx" ON "availability_windows" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "availability_windows_tenant_resource_idx" ON "availability_windows" USING btree ("tenant_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "availability_windows_tournament_id_idx" ON "availability_windows" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "availability_windows_window_idx" ON "availability_windows" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_windows_tenant_id_id_unique" ON "availability_windows" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "facilities_tenant_id_idx" ON "facilities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "facilities_created_at_idx" ON "facilities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_schedules_tenant_id_idx" ON "match_schedules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "match_schedules_tournament_status_idx" ON "match_schedules" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "match_schedules_match_id_idx" ON "match_schedules" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_schedules_venue_window_idx" ON "match_schedules" USING btree ("venue_unit_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "match_schedules_tenant_id_id_unique" ON "match_schedules" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_schedules_match_unique" ON "match_schedules" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "official_assignments_tenant_id_idx" ON "official_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "official_assignments_match_id_idx" ON "official_assignments" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "official_assignments_profile_id_idx" ON "official_assignments" USING btree ("official_profile_id");--> statement-breakpoint
CREATE INDEX "official_assignments_status_idx" ON "official_assignments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "official_assignments_tenant_id_id_unique" ON "official_assignments" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "official_assignments_match_profile_role_unique" ON "official_assignments" USING btree ("match_id","official_profile_id","role");--> statement-breakpoint
CREATE INDEX "official_payout_exports_tenant_id_idx" ON "official_payout_exports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "official_payout_exports_tournament_profile_idx" ON "official_payout_exports" USING btree ("tournament_id","official_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "official_payout_exports_tenant_id_id_unique" ON "official_payout_exports" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "official_profiles_tenant_id_idx" ON "official_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "official_profiles_user_id_idx" ON "official_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "official_profiles_home_school_id_idx" ON "official_profiles" USING btree ("home_school_id");--> statement-breakpoint
CREATE INDEX "official_profiles_status_idx" ON "official_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "official_profiles_tenant_user_unique" ON "official_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "schedule_notifications_tenant_id_idx" ON "schedule_notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "schedule_notifications_recipient_status_idx" ON "schedule_notifications" USING btree ("recipient_user_id","status");--> statement-breakpoint
CREATE INDEX "schedule_notifications_tournament_id_idx" ON "schedule_notifications" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_notifications_tenant_id_id_unique" ON "schedule_notifications" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "venue_units_tenant_id_idx" ON "venue_units" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "venue_units_facility_id_idx" ON "venue_units" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "venue_units_status_idx" ON "venue_units" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_units_facility_name_unique" ON "venue_units" USING btree ("facility_id","name");
