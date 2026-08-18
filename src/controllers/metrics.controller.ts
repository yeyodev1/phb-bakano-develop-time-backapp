import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as metricsService from "../services/metrics.service";

export async function traffic(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    res.json(await metricsService.trafficReport(days));
  } catch (error) {
    next(error);
  }
}
