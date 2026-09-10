import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, alarmsTable } from "@workspace/db";
import {
  CreateAlarmBody,
  GetAlarmParams,
  GetAlarmResponse,
  UpdateAlarmParams,
  UpdateAlarmBody,
  UpdateAlarmResponse,
  DeleteAlarmParams,
  SkipNextOccurrenceParams,
  SkipNextOccurrenceResponse,
  CloneAlarmParams,
  CloneAlarmBody,
  ListAlarmsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeNextActivation(alarm: {
  enabled: boolean;
  hour: number;
  minute: number;
  alarmType: string;
  specificDates?: string[] | null;
  weekDays?: number[] | null;
  skippedDates?: string[] | null;
}): string | null {
  if (!alarm.enabled) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const skippedSet = new Set((alarm.skippedDates ?? []).map(d => d.split("T")[0]));

  if (alarm.alarmType === "once") {
    const candidate = new Date(today);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1);
    }
    const dateStr = candidate.toISOString().split("T")[0];
    if (skippedSet.has(dateStr)) return null;
    return candidate.toISOString();
  }

  if (alarm.alarmType === "specific_dates") {
    const dates = (alarm.specificDates ?? [])
      .map(d => {
        const dt = new Date(d);
        dt.setHours(alarm.hour, alarm.minute, 0, 0);
        return dt;
      })
      .filter(dt => dt > now && !skippedSet.has(dt.toISOString().split("T")[0]))
      .sort((a, b) => a.getTime() - b.getTime());
    return dates.length > 0 ? dates[0].toISOString() : null;
  }

  if (alarm.alarmType === "weekly") {
    const days = alarm.weekDays ?? [];
    if (days.length === 0) return null;

    // Scan up to 3650 days (≈ 10 years) — effectively unlimited for practical use.
    // This ensures skip works regardless of how many occurrences have been skipped.
    for (let i = 0; i <= 3650; i++) {
      const candidate = new Date(today);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(alarm.hour, alarm.minute, 0, 0);
      if (candidate <= now) continue;
      if (!days.includes(candidate.getDay())) continue;
      const dateStr = candidate.toISOString().split("T")[0];
      if (skippedSet.has(dateStr)) continue;
      return candidate.toISOString();
    }
    return null;
  }

  return null;
}

function formatAlarmResponse(alarm: typeof alarmsTable.$inferSelect) {
  return {
    ...alarm,
    specificDates: alarm.specificDates ?? [],
    weekDays: alarm.weekDays ?? [],
    skippedDates: alarm.skippedDates ?? [],
    nextActivation: computeNextActivation(alarm),
    createdAt: alarm.createdAt.toISOString(),
    updatedAt: alarm.updatedAt.toISOString(),
  };
}

router.get("/alarms", async (_req, res): Promise<void> => {
  const alarms = await db
    .select()
    .from(alarmsTable)
    .orderBy(asc(alarmsTable.hour), asc(alarmsTable.minute));

  const formatted = alarms.map(formatAlarmResponse);
  formatted.sort((a, b) => {
    if (!a.nextActivation && !b.nextActivation) return 0;
    if (!a.nextActivation) return 1;
    if (!b.nextActivation) return -1;
    return new Date(a.nextActivation).getTime() - new Date(b.nextActivation).getTime();
  });

  res.json(ListAlarmsResponse.parse(formatted));
});

router.post("/alarms", async (req, res): Promise<void> => {
  const parsed = CreateAlarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alarm] = await db.insert(alarmsTable).values({
    ...parsed.data,
    specificDates: parsed.data.specificDates ?? [],
    weekDays: parsed.data.weekDays ?? [],
  }).returning();

  res.status(201).json(GetAlarmResponse.parse(formatAlarmResponse(alarm)));
});

router.get("/alarms/:id", async (req, res): Promise<void> => {
  const params = GetAlarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alarm] = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.id, params.data.id));

  if (!alarm) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }

  res.json(GetAlarmResponse.parse(formatAlarmResponse(alarm)));
});

router.put("/alarms/:id", async (req, res): Promise<void> => {
  const params = UpdateAlarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAlarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alarm] = await db
    .update(alarmsTable)
    .set({
      ...parsed.data,
      specificDates: parsed.data.specificDates ?? [],
      weekDays:      parsed.data.weekDays      ?? [],
      ...(parsed.data.skippedDates !== undefined
        ? { skippedDates: parsed.data.skippedDates }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(alarmsTable.id, params.data.id))
    .returning();

  if (!alarm) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }

  res.json(UpdateAlarmResponse.parse(formatAlarmResponse(alarm)));
});

router.delete("/alarms/:id", async (req, res): Promise<void> => {
  const params = DeleteAlarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alarm] = await db
    .delete(alarmsTable)
    .where(eq(alarmsTable.id, params.data.id))
    .returning();

  if (!alarm) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/alarms/:id/skip", async (req, res): Promise<void> => {
  const params = SkipNextOccurrenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alarm] = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.id, params.data.id));

  if (!alarm) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }

  const nextActivation = computeNextActivation(alarm);
  if (!nextActivation) {
    res.status(400).json({ error: "No next activation to skip" });
    return;
  }

  const dateToSkip = nextActivation.split("T")[0];
  const currentSkipped = (alarm.skippedDates ?? []) as string[];
  const newSkipped = [...currentSkipped, dateToSkip];

  const [updated] = await db
    .update(alarmsTable)
    .set({ skippedDates: newSkipped, updatedAt: new Date() })
    .where(eq(alarmsTable.id, params.data.id))
    .returning();

  res.json(SkipNextOccurrenceResponse.parse(formatAlarmResponse(updated)));
});

router.post("/alarms/:id/clone", async (req, res): Promise<void> => {
  const params = CloneAlarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CloneAlarmBody.safeParse(req.body ?? {});

  const [original] = await db
    .select()
    .from(alarmsTable)
    .where(eq(alarmsTable.id, params.data.id));

  if (!original) {
    res.status(404).json({ error: "Alarm not found" });
    return;
  }

  const suffix     = body.success && body.data.nameSuffix  ? body.data.nameSuffix  : " (clonata)";
  const autoDelete = body.success && body.data.autoDelete !== undefined ? body.data.autoDelete : original.autoDelete;
  const enabled    = body.success && body.data.enabled    !== undefined ? body.data.enabled    : original.enabled;
  const alarmType  = body.success && body.data.alarmType  ? body.data.alarmType   : original.alarmType;

  // When cloning as a different type, reset the type-specific fields
  const specificDates = alarmType === "once" ? [] : (original.specificDates ?? []);
  const weekDays      = alarmType === "weekly" ? (original.weekDays ?? []) : [];

  const [cloned] = await db.insert(alarmsTable).values({
    name: original.name + suffix,
    enabled,
    hour: original.hour,
    minute: original.minute,
    alarmType,
    specificDates,
    weekDays,
    autoDelete,
    ringtone: original.ringtone,
    volume: original.volume,
    gradualVolume: original.gradualVolume,
    vibration: original.vibration,
    autoSnooze: original.autoSnooze,
    maxSnoozes: original.maxSnoozes,
    skippedDates: [],
     iconName: original.iconName,
  }).returning();

  res.status(201).json(GetAlarmResponse.parse(formatAlarmResponse(cloned)));
});

export default router;
