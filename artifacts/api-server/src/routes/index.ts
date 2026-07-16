import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import serversRouter from "./servers";
import templatesRouter from "./templates";
import deploymentsRouter from "./deployments";
import aiRouter from "./ai";
import monitoringRouter from "./monitoring";
import auditRouter from "./audit";
import documentsRouter from "./documents";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(serversRouter);
router.use(templatesRouter);
router.use(deploymentsRouter);
router.use(aiRouter);
router.use(monitoringRouter);
router.use(auditRouter);
router.use(documentsRouter);
router.use(notificationsRouter);

export default router;
