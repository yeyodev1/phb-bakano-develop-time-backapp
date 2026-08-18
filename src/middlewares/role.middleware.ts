import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { UserRole } from "../models/user.model";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "No tienes permisos para esta acción" });
      return;
    }
    next();
  };
}
