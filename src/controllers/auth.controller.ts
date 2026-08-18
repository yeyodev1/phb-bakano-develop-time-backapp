import { Response, NextFunction, Request } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as authService from "../services/auth.service";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    res.json(await authService.login(email, password));
  } catch (error) {
    next(error);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await authService.me(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    res.json(await authService.changePassword(req.user!.id, currentPassword, newPassword));
  } catch (error) {
    next(error);
  }
}
