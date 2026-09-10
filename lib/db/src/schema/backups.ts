import { pgTable, serial, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  alarmData: jsonb("alarm_data").$type<unknown[]>().notNull(),
  alarmCount: integer("alarm_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Backup = typeof backupsTable.$inferSelect;
