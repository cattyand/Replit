import { pgTable, serial, boolean, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  autoBackup: boolean("auto_backup").notNull().default(false),
  backupHour: integer("backup_hour").notNull().default(20),
  backupMinute: integer("backup_minute").notNull().default(0),
  backupRetentionDays: integer("backup_retention_days").notNull().default(7),
  // Personal times (nullable = not set)
  wakeupHour:    integer("wakeup_hour"),
  wakeupMinute:  integer("wakeup_minute"),
  workStartHour:  integer("work_start_hour"),
  workStartMinute: integer("work_start_minute"),
  lunchHour:     integer("lunch_hour"),
  lunchMinute:   integer("lunch_minute"),
  workEndHour:   integer("work_end_hour"),
  workEndMinute: integer("work_end_minute"),
  dinnerHour:    integer("dinner_hour"),
  dinnerMinute:  integer("dinner_minute"),
  sleepHour:     integer("sleep_hour"),
  sleepMinute:   integer("sleep_minute"),
  languageCode:  text("language_code"),
  sortOrder:     text("sort_order").notNull().default("activation"),
  // Custom labels for personal times (nullable = use default translation)
  wakeupLabel:    text("wakeup_label"),
  workStartLabel: text("work_start_label"),
  lunchLabel:     text("lunch_label"),
  workEndLabel:   text("work_end_label"),
  dinnerLabel:    text("dinner_label"),
  sleepLabel:     text("sleep_label"),
  // Custom colors for personal times (nullable = no color)
  wakeupColor:    text("wakeup_color"),
  workStartColor: text("work_start_color"),
  lunchColor:     text("lunch_color"),
  workEndColor:   text("work_end_color"),
  dinnerColor:    text("dinner_color"),
  sleepColor:     text("sleep_color"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
