CREATE TABLE "bracket_nodes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"bracket_id" varchar(64) NOT NULL,
	"version_id" varchar(64) NOT NULL,
	"match_id" varchar(64),
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"bracket_side" varchar(32) NOT NULL,
	"group_key" varchar(64),
	"home_team_id" varchar(64),
	"away_team_id" varchar(64),
	"winner_team_id" varchar(64),
	"loser_team_id" varchar(64),
	"home_seed_number" integer,
	"away_seed_number" integer,
	"source_node_ids" text[] NOT NULL,
	"next_node_id" varchar(64),
	"loser_next_node_id" varchar(64),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"is_if_necessary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bracket_seeds" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"bracket_id" varchar(64) NOT NULL,
	"version_id" varchar(64) NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"seed_number" integer NOT NULL,
	"group_key" varchar(64),
	"locked" boolean DEFAULT false NOT NULL,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bracket_versions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"bracket_id" varchar(64) NOT NULL,
	"version_number" integer NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"generation_policy" varchar(32) NOT NULL,
	"notes" text,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brackets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"format" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"active_version_id" varchar(64) NOT NULL,
	"published_version_id" varchar(64),
	"public_slug" varchar(128),
	"created_by" varchar(64) NOT NULL,
	"published_by" varchar(64),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standing_rows" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"bracket_id" varchar(64) NOT NULL,
	"version_id" varchar(64) NOT NULL,
	"group_key" varchar(64) NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"goal_difference" integer DEFAULT 0 NOT NULL,
	"disciplinary_points" integer DEFAULT 0 NOT NULL,
	"head_to_head_points" integer DEFAULT 0 NOT NULL,
	"rank" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bracket_nodes_tenant_id_idx" ON "bracket_nodes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_bracket_id_idx" ON "bracket_nodes" USING btree ("bracket_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_version_id_idx" ON "bracket_nodes" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_match_id_idx" ON "bracket_nodes" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_next_node_id_idx" ON "bracket_nodes" USING btree ("next_node_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_loser_next_node_id_idx" ON "bracket_nodes" USING btree ("loser_next_node_id");--> statement-breakpoint
CREATE INDEX "bracket_nodes_version_round_position_idx" ON "bracket_nodes" USING btree ("version_id","round","position");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_nodes_tenant_id_id_unique" ON "bracket_nodes" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_nodes_version_round_position_unique" ON "bracket_nodes" USING btree ("version_id","round","position","bracket_side");--> statement-breakpoint
CREATE INDEX "bracket_seeds_tenant_id_idx" ON "bracket_seeds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bracket_seeds_bracket_id_idx" ON "bracket_seeds" USING btree ("bracket_id");--> statement-breakpoint
CREATE INDEX "bracket_seeds_version_id_idx" ON "bracket_seeds" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "bracket_seeds_team_id_idx" ON "bracket_seeds" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "bracket_seeds_group_key_idx" ON "bracket_seeds" USING btree ("group_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_seeds_tenant_id_id_unique" ON "bracket_seeds" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_seeds_version_seed_unique" ON "bracket_seeds" USING btree ("version_id","seed_number");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_seeds_version_team_unique" ON "bracket_seeds" USING btree ("version_id","team_id");--> statement-breakpoint
CREATE INDEX "bracket_versions_tenant_id_idx" ON "bracket_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bracket_versions_bracket_id_idx" ON "bracket_versions" USING btree ("bracket_id");--> statement-breakpoint
CREATE INDEX "bracket_versions_created_at_idx" ON "bracket_versions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_versions_tenant_id_id_unique" ON "bracket_versions" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_versions_bracket_version_unique" ON "bracket_versions" USING btree ("bracket_id","version_number");--> statement-breakpoint
CREATE INDEX "brackets_tenant_id_idx" ON "brackets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "brackets_tournament_id_idx" ON "brackets" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "brackets_active_version_id_idx" ON "brackets" USING btree ("active_version_id");--> statement-breakpoint
CREATE INDEX "brackets_published_version_id_idx" ON "brackets" USING btree ("published_version_id");--> statement-breakpoint
CREATE INDEX "brackets_created_at_idx" ON "brackets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brackets_tenant_id_id_unique" ON "brackets" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "brackets_public_slug_unique" ON "brackets" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "standing_rows_tenant_id_idx" ON "standing_rows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "standing_rows_bracket_id_idx" ON "standing_rows" USING btree ("bracket_id");--> statement-breakpoint
CREATE INDEX "standing_rows_version_id_idx" ON "standing_rows" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "standing_rows_team_id_idx" ON "standing_rows" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "standing_rows_version_group_idx" ON "standing_rows" USING btree ("version_id","group_key");--> statement-breakpoint
CREATE UNIQUE INDEX "standing_rows_tenant_id_id_unique" ON "standing_rows" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "standing_rows_version_group_team_unique" ON "standing_rows" USING btree ("version_id","group_key","team_id");--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_version_id_bracket_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."bracket_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_loser_team_id_teams_id_fk" FOREIGN KEY ("loser_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_tenant_bracket_fk" FOREIGN KEY ("tenant_id","bracket_id") REFERENCES "public"."brackets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_tenant_version_fk" FOREIGN KEY ("tenant_id","version_id") REFERENCES "public"."bracket_versions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_tenant_match_fk" FOREIGN KEY ("tenant_id","match_id") REFERENCES "public"."matches"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_version_id_bracket_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."bracket_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_tenant_bracket_fk" FOREIGN KEY ("tenant_id","bracket_id") REFERENCES "public"."brackets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_seeds" ADD CONSTRAINT "bracket_seeds_tenant_version_fk" FOREIGN KEY ("tenant_id","version_id") REFERENCES "public"."bracket_versions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_versions" ADD CONSTRAINT "bracket_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_versions" ADD CONSTRAINT "bracket_versions_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_versions" ADD CONSTRAINT "bracket_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_versions" ADD CONSTRAINT "bracket_versions_tenant_bracket_fk" FOREIGN KEY ("tenant_id","bracket_id") REFERENCES "public"."brackets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tenant_tournament_fk" FOREIGN KEY ("tenant_id","tournament_id") REFERENCES "public"."tournaments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_version_id_bracket_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."bracket_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_tenant_bracket_fk" FOREIGN KEY ("tenant_id","bracket_id") REFERENCES "public"."brackets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_rows" ADD CONSTRAINT "standing_rows_tenant_version_fk" FOREIGN KEY ("tenant_id","version_id") REFERENCES "public"."bracket_versions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
