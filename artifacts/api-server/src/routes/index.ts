import { Router, type IRouter } from "express";
import healthRouter from "./health";
import alarmsRouter from "./alarms";
import backupsRouter from "./backups";
import settingsRouter from "./settings";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(alarmsRouter);
router.use(backupsRouter);
router.use(settingsRouter);
router.use(profilesRouter);

export default router;
