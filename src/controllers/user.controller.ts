import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as userService from "../services/user.service";

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await userService.listUsers(req.query.role as string | undefined));
  } catch (error) {
    next(error);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await userService.createUser(req.body));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await userService.updateUser(String(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await userService.deactivateUser(String(req.params.id)));
  } catch (error) {
    next(error);
  }
}
