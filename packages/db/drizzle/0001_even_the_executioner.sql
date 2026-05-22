CREATE TABLE "athletes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"date_of_birth" varchar(64),
	"gender" varchar(32),
	"status" varchar(32) NOT NULL,
	"athletiq_id" varchar(64),
	"created_by" varchar(64) NOT NULL,
	"approved_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"actor_user_id" varchar(64) NOT NULL,
	"action" varchar(128) NOT NULL,
	"resource" varchar(64) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"home_team_id" varchar(64) NOT NULL,
	"away_team_id" varchar(64) NOT NULL,
	"scheduled_at" varchar(64) NOT NULL,
	"status" varchar(24) NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"report" jsonb,
	"created_by" varchar(64) NOT NULL,
	"submitted_by" varchar(64),
	"verified_by" varchar(64),
	"submitted_at" varchar(64),
	"verified_at" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"status" varchar(24) NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"approved_by" varchar(64),
	"admin_user_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"school_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"athlete_ids" text[] NOT NULL,
	"coach_user_id" varchar(64),
	"status" varchar(24) NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"sport" varchar(128) NOT NULL,
	"format" varchar(32) NOT NULL,
	"status" varchar(24) NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"approved_by" varchar(64),
	"max_teams" integer,
	"season" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"school_ids" text[] NOT NULL,
	"team_ids" text[] NOT NULL,
	"match_ids" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"roles" text[] NOT NULL,
	"school_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
