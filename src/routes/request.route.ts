import { Router } from "express";
import * as controller from "../controllers/request.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", controller.list);
router.get("/:id", controller.detail);
router.post("/", controller.create);
router.patch("/:id", requireRole("admin", "developer", "client"), controller.update);
router.patch("/:id/status", controller.changeStatus);
router.post("/:id/comments", controller.comment);
router.delete("/:id", requireRole("admin"), controller.remove);

export default router;
