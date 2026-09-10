import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, alarmsTable, backupsTable } from "@workspace/db";
import {
  RestoreBackupParams,
  DeleteBackupParams,
  ListBackupsResponse,
  RestoreBackupResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/backups", async (_req, res): Promise<void> => {
  const backups = await db
    .select({
      id: backupsTable.id,
      createdAt: backupsTable.createdAt,
      alarmCount: backupsTable.alarmCount,
    })
    .from(backupsTable)
    .orderBy(desc(backupsTable.createdAt));

  const formatted = backups.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
  }));

  res.json(ListBackupsResponse.parse(formatted));
});

router.post("/backups", async (_req, res): Promise<void> => {
  const alarms = await db.select().from(alarmsTable);

  const [backup] = await db.insert(backupsTable).values({
    alarmData: alarms,
    alarmCount: alarms.length,
  }).returning();

  res.status(201).json({
    id: backup.id,
    createdAt: backup.createdAt.toISOString(),
    alarmCount: backup.alarmCount,
  });
});

router.delete("/backups/:id", async (req, res): Promise<void> => {
  const params = DeleteBackupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [backup] = await db
    .select({ id: backupsTable.id })
    .from(backupsTable)
    .where(eq(backupsTable.id, params.data.id));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  await db.delete(backupsTable).where(eq(backupsTable.id, params.data.id));
  res.status(204).end();
});

router.post("/backups/:id/restore", async (req, res): Promise<void> => {
  const params = RestoreBackupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.id, params.data.id));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  await db.delete(alarmsTable);

  const alarmData = backup.alarmData as Array<Record<string, unknown>>;
  const restoredAlarms = [];

  for (const a of alarmData) {
    const [restored] = await db.insert(alarmsTable).values({
      name: a.name as string,
      enabled: a.enabled as boolean,
      hour: a.hour as number,
      minute: a.minute as number,
      alarmType: a.alarm_type as string || a.alarmType as string || "once",
      specificDates: (a.specific_dates ?? a.specificDates ?? []) as string[],
      weekDays: (a.week_days ?? a.weekDays ?? []) as number[],
      autoDelete: a.auto_delete as boolean ?? a.autoDelete as boolean ?? false,
      ringtone: a.ringtone as string ?? "Sveglia classica",
      volume: a.volume as number ?? 50,
      gradualVolume: a.gradual_volume as number ?? a.gradualVolume as number ?? 0,
      vibration: a.vibration as string ?? "on",
      autoSnooze: a.auto_snooze as number ?? a.autoSnooze as number ?? 0,
      maxSnoozes: a.max_snoozes as number ?? a.maxSnoozes as number ?? 3,
      skippedDates: (a.skipped_dates ?? a.skippedDates ?? []) as string[],
    }).returning();
    restoredAlarms.push({
      ...restored,
      specificDates: restored.specificDates ?? [],
      weekDays: restored.weekDays ?? [],
      skippedDates: restored.skippedDates ?? [],
      nextActivation: null,
      createdAt: restored.createdAt.toISOString(),
      updatedAt: restored.updatedAt.toISOString(),
    });
  }

  res.json(RestoreBackupResponse.parse(restoredAlarms));
});

export default router;
