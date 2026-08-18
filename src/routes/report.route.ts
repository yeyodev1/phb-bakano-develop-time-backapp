import { Router } from "express";
import * as controller from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/summary", controller.summary);
router.get("/developer/:id", controller.developer);
router.post("/weekly-digest", requireRole("admin"), controller.weekly);

export default router;
