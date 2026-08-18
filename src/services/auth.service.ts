import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel, IUser } from "../models/user.model";
import { CustomError } from "../errors/customError.error";
import { JwtPayload } from "../types/AuthRequest";

export function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    color: user.color,
    isActive: user.isActive,
    hourlyRate: user.hourlyRate,
    lastLoginAt: user.lastLoginAt,
  };
}

export function signToken(user: IUser) {
  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "30d") as jwt.SignOptions["expiresIn"],
  });
}

export async function login(email: string, password: string) {
  if (!email || !password) throw new CustomError("Correo y contraseña son obligatorios", 400);

  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new CustomError("Credenciales inválidas", 401);
  if (!user.isActive) throw new CustomError("Usuario desactivado", 403);

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw new CustomError("Credenciales inválidas", 401);

  user.lastLoginAt = new Date();
  await user.save();

  return { token: signToken(user), user: publicUser(user) };
}

export async function me(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new CustomError("Usuario no encontrado", 404);
  return publicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6)
    throw new CustomError("La nueva contraseña debe tener al menos 6 caracteres", 400);

  const user = await UserModel.findById(userId);
  if (!user) throw new CustomError("Usuario no encontrado", 404);

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) throw new CustomError("La contraseña actual no es correcta", 401);

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: "Contraseña actualizada" };
}
