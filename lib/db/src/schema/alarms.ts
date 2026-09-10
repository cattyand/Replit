import { pgTable, serial, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alarmsTable = pgTable("alarms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  hour: integer("hour").notNull(),
  minute: integer("minute").notNull(),
  alarmType: text("alarm_type").notNull().default("once"),
  specificDates: jsonb("specific_dates").$type<string[]>().default([]),
  weekDays: jsonb("week_days").$type<number[]>().default([]),
  autoDelete: boolean("auto_delete").notNull().default(false),
  ringtone: text("ringtone").notNull().default("Sveglia classica"),
  volume: integer("volume").notNull().default(50),
  gradualVolume: integer("gradual_volume").notNull().default(0),
  vibration: text("vibration").notNull().default("on"),
  autoSnooze: integer("auto_snooze").notNull().default(0),
  maxSnoozes: integer("max_snoozes").notNull().default(3),
  skippedDates: jsonb("skipped_dates").$type<string[]>().default([]),
  personalTimeKey: text("personal_time_key"),
  iconName: text("icon_name").notNull().default("alarm-clock"),
  profileId: integer("profile_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlarmSchema = createInsertSchema(alarmsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlarm = z.infer<typeof insertAlarmSchema>;
export type Alarm = typeof alarmsTable.$inferSelect;
