import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", controller.login);
router.get("/me", authMiddleware, controller.me);
router.post("/change-password", authMiddleware, controller.changePassword);

export default router;
