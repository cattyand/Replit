import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import {
  UpdateSettingsBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const existing = await db.select().from(settingsTable);
  if (existing.length > 0) return existing[0];

  const [created] = await db.insert(settingsTable).values({
    autoBackup: false,
    backupHour: 20,
    backupMinute: 0,
    backupRetentionDays: 7,
    wakeupHour: null,    wakeupMinute: null,
    workStartHour: null, workStartMinute: null,
    lunchHour: null,     lunchMinute: null,
    workEndHour: null,   workEndMinute: null,
    dinnerHour: null,    dinnerMinute: null,
    sleepHour: null,     sleepMinute: null,
    sortOrder: "activation",
  }).returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await getOrCreateSettings();

  const [updated] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, settings.id))
    .returning();

  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
