import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as timeLogService from "../services/timeLog.service";

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await timeLogService.listTimeLogs(req.query as Record<string, string>, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await timeLogService.createTimeLog(req.body, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await timeLogService.updateTimeLog(String(req.params.id), req.body, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await timeLogService.deleteTimeLog(String(req.params.id), req.user!));
  } catch (error) {
    next(error);
  }
}
