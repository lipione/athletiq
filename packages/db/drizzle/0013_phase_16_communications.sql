CREATE TABLE IF NOT EXISTS "guardian_athlete_links" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "guardian_user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "athlete_id" varchar(64) NOT NULL REFERENCES "athletes"("id"),
  "school_id" varchar(64) NOT NULL REFERENCES "schools"("id"),
  "relationship" varchar(64) NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "guardian_athlete_links_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "athletes"("tenant_id","id"),
  CONSTRAINT "guardian_athlete_links_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "schools"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "guardian_athlete_links_tenant_id_idx" ON "guardian_athlete_links" ("tenant_id");
CREATE INDEX IF NOT EXISTS "guardian_athlete_links_guardian_user_id_idx" ON "guardian_athlete_links" ("guardian_user_id");
CREATE INDEX IF NOT EXISTS "guardian_athlete_links_athlete_id_idx" ON "guardian_athlete_links" ("athlete_id");
CREATE INDEX IF NOT EXISTS "guardian_athlete_links_school_id_idx" ON "guardian_athlete_links" ("school_id");
CREATE UNIQUE INDEX IF NOT EXISTS "guardian_athlete_links_tenant_id_id_unique" ON "guardian_athlete_links" ("tenant_id","id");
CREATE UNIQUE INDEX IF NOT EXISTS "guardian_athlete_links_guardian_athlete_unique" ON "guardian_athlete_links" ("guardian_user_id","athlete_id");

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "category" varchar(64) NOT NULL,
  "priority" varchar(32) DEFAULT 'normal' NOT NULL,
  "locale" varchar(16) DEFAULT 'en' NOT NULL,
  "target" jsonb NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "announcements_tenant_id_idx" ON "announcements" ("tenant_id");
CREATE INDEX IF NOT EXISTS "announcements_category_idx" ON "announcements" ("category");
CREATE INDEX IF NOT EXISTS "announcements_created_at_idx" ON "announcements" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "announcements_tenant_id_id_unique" ON "announcements" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "channel" varchar(32) NOT NULL,
  "category" varchar(64) NOT NULL,
  "enabled" boolean NOT NULL,
  "locale" varchar(16) DEFAULT 'en' NOT NULL,
  "quiet_hours_start" varchar(16),
  "quiet_hours_end" varchar(16),
  "updated_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notification_preferences_tenant_id_idx" ON "notification_preferences" ("tenant_id");
CREATE INDEX IF NOT EXISTS "notification_preferences_user_id_idx" ON "notification_preferences" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_channel_category_unique" ON "notification_preferences" ("user_id","channel","category");

CREATE TABLE IF NOT EXISTS "communication_templates" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "key" varchar(128) NOT NULL,
  "category" varchar(64) NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "variants" jsonb NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "communication_templates_tenant_id_idx" ON "communication_templates" ("tenant_id");
CREATE INDEX IF NOT EXISTS "communication_templates_category_idx" ON "communication_templates" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "communication_templates_tenant_id_id_unique" ON "communication_templates" ("tenant_id","id");
CREATE UNIQUE INDEX IF NOT EXISTS "communication_templates_tenant_key_unique" ON "communication_templates" ("tenant_id","key");

CREATE TABLE IF NOT EXISTS "communication_notifications" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "recipient_user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "category" varchar(64) NOT NULL,
  "channel" varchar(32) NOT NULL,
  "locale" varchar(16) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "resource_type" varchar(64),
  "resource_id" varchar(64),
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "communication_notifications_tenant_id_idx" ON "communication_notifications" ("tenant_id");
CREATE INDEX IF NOT EXISTS "communication_notifications_recipient_idx" ON "communication_notifications" ("recipient_user_id");
CREATE INDEX IF NOT EXISTS "communication_notifications_status_idx" ON "communication_notifications" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "communication_notifications_tenant_id_id_unique" ON "communication_notifications" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "notification_id" varchar(64) NOT NULL REFERENCES "communication_notifications"("id"),
  "channel" varchar(32) NOT NULL,
  "provider" varchar(32) NOT NULL,
  "status" varchar(32) NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_deliveries_tenant_notification_fk" FOREIGN KEY ("tenant_id","notification_id") REFERENCES "communication_notifications"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "notification_deliveries_tenant_id_idx" ON "notification_deliveries" ("tenant_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_notification_id_idx" ON "notification_deliveries" ("notification_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx" ON "notification_deliveries" ("status");

CREATE TABLE IF NOT EXISTS "conversation_threads" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "title" varchar(255) NOT NULL,
  "school_id" varchar(64) NOT NULL REFERENCES "schools"("id"),
  "team_id" varchar(64) REFERENCES "teams"("id"),
  "athlete_id" varchar(64) REFERENCES "athletes"("id"),
  "participant_user_ids" text[] NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "created_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conversation_threads_tenant_school_fk" FOREIGN KEY ("tenant_id","school_id") REFERENCES "schools"("tenant_id","id"),
  CONSTRAINT "conversation_threads_tenant_team_fk" FOREIGN KEY ("tenant_id","team_id") REFERENCES "teams"("tenant_id","id"),
  CONSTRAINT "conversation_threads_tenant_athlete_fk" FOREIGN KEY ("tenant_id","athlete_id") REFERENCES "athletes"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "conversation_threads_tenant_id_idx" ON "conversation_threads" ("tenant_id");
CREATE INDEX IF NOT EXISTS "conversation_threads_school_status_idx" ON "conversation_threads" ("school_id","status");
CREATE INDEX IF NOT EXISTS "conversation_threads_created_at_idx" ON "conversation_threads" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_threads_tenant_id_id_unique" ON "conversation_threads" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "thread_messages" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "thread_id" varchar(64) NOT NULL REFERENCES "conversation_threads"("id"),
  "author_user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "status" varchar(32) DEFAULT 'visible' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "hidden_at" timestamp with time zone,
  "hidden_by" varchar(64) REFERENCES "users"("id"),
  "moderation_reason" text,
  CONSTRAINT "thread_messages_tenant_thread_fk" FOREIGN KEY ("tenant_id","thread_id") REFERENCES "conversation_threads"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "thread_messages_tenant_id_idx" ON "thread_messages" ("tenant_id");
CREATE INDEX IF NOT EXISTS "thread_messages_thread_id_idx" ON "thread_messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "thread_messages_created_at_idx" ON "thread_messages" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "thread_messages_tenant_id_id_unique" ON "thread_messages" ("tenant_id","id");

CREATE TABLE IF NOT EXISTS "message_moderation_actions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(64) NOT NULL REFERENCES "tenants"("id"),
  "thread_id" varchar(64) NOT NULL REFERENCES "conversation_threads"("id"),
  "message_id" varchar(64) NOT NULL REFERENCES "thread_messages"("id"),
  "action" varchar(32) NOT NULL,
  "reason" text NOT NULL,
  "acted_by" varchar(64) NOT NULL REFERENCES "users"("id"),
  "acted_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "message_moderation_actions_tenant_thread_fk" FOREIGN KEY ("tenant_id","thread_id") REFERENCES "conversation_threads"("tenant_id","id"),
  CONSTRAINT "message_moderation_actions_tenant_message_fk" FOREIGN KEY ("tenant_id","message_id") REFERENCES "thread_messages"("tenant_id","id")
);
CREATE INDEX IF NOT EXISTS "message_moderation_actions_tenant_id_idx" ON "message_moderation_actions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "message_moderation_actions_thread_id_idx" ON "message_moderation_actions" ("thread_id");
CREATE INDEX IF NOT EXISTS "message_moderation_actions_message_id_idx" ON "message_moderation_actions" ("message_id");
