import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as reportService from "../services/report.service";

export async function summary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await reportService.summary(req.query.from as string, req.query.to as string));
  } catch (error) {
    next(error);
  }
}

export async function developer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(
      await reportService.developerReport(String(req.params.id), req.query.from as string, req.query.to as string)
    );
  } catch (error) {
    next(error);
  }
}

export async function weekly(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await reportService.weeklyDigest(req.body?.to));
  } catch (error) {
    next(error);
  }
}
