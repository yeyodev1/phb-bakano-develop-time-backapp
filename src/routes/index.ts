import express, { Application } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import requestRouter from "./request.route";
import timeLogRouter from "./timeLog.route";
import reportRouter from "./report.route";
import metricsRouter from "./metrics.route";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "phb-bakano-develop-time", time: new Date().toISOString() });
  });

  router.use("/auth", authRouter);
  router.use("/users", userRouter);
  router.use("/requests", requestRouter);
  router.use("/time-logs", timeLogRouter);
  router.use("/reports", reportRouter);
  router.use("/metrics", metricsRouter);
}

export default routerApi;
