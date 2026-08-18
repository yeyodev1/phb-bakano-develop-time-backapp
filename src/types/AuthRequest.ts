import { Request } from "express";
import { UserRole } from "../models/user.model";

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
