import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  autoDelete: boolean("auto_delete"),
  ringtone: text("ringtone"),
  volume: integer("volume"),
  gradualVolume: integer("gradual_volume"),
  vibration: text("vibration"),
  autoSnooze: integer("auto_snooze"),
  maxSnoozes: integer("max_snoozes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;