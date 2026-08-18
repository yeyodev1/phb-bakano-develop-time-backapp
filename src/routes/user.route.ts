import { Router } from "express";
import * as controller from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", controller.list);
router.post("/", requireRole("admin"), controller.create);
router.patch("/:id", requireRole("admin"), controller.update);
router.delete("/:id", requireRole("admin"), controller.deactivate);

export default router;
