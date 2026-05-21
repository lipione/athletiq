import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
