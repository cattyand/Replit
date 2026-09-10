import { Router, type IRouter } from "express";
import { asc, eq, ne } from "drizzle-orm";
import { db, profilesTable, alarmsTable } from "@workspace/db";
import {
  ListProfilesResponse,
  CreateProfileBody,
  UpdateProfileParams,
  UpdateProfileBody,
  UpdateProfileResponse,
  DeleteProfileParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatProfile(profile: typeof profilesTable.$inferSelect) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

router.get("/profiles", async (_req, res): Promise<void> => {
  const profiles = await db.select().from(profilesTable).orderBy(asc(profilesTable.name));
  res.json(ListProfilesResponse.parse(profiles.map(formatProfile)));
});

router.post("/profiles", async (req, res): Promise<void> => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.isDefault) {
    await db.update(profilesTable).set({ isDefault: false, updatedAt: new Date() });
  }
  const [profile] = await db.insert(profilesTable).values(parsed.data).returning();
  res.status(201).json(formatProfile(profile));
});

router.put("/profiles/:id", async (req, res): Promise<void> => {
  const params = UpdateProfileParams.safeParse(req.params);
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid profile data" });
    return;
  }
  if (parsed.data.isDefault) {
    await db.update(profilesTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(ne(profilesTable.id, params.data.id));
  }
  const [profile] = await db.update(profilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profilesTable.id, params.data.id))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(UpdateProfileResponse.parse(formatProfile(profile)));
});

router.delete("/profiles/:id", async (req, res): Promise<void> => {
  const params = DeleteProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [profile] = await db.delete(profilesTable)
    .where(eq(profilesTable.id, params.data.id))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  await db.update(alarmsTable).set({ profileId: null, updatedAt: new Date() }).where(eq(alarmsTable.profileId, params.data.id));
  res.sendStatus(204);
});

export default router;