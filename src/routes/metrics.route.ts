import { Router } from "express";
import * as controller from "../controllers/metrics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/traffic", controller.traffic);

export default router;
