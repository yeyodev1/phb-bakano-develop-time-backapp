import bcrypt from "bcryptjs";
import { UserModel, UserRole } from "../models/user.model";
import { CustomError } from "../errors/customError.error";
import { publicUser } from "./auth.service";
import { sendMail, layout } from "./email.service";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  position?: string;
  hourlyRate?: number;
  color?: string;
}

export async function listUsers(role?: string) {
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;

  const users = await UserModel.find(filter).sort({ role: 1, name: 1 });
  return users.map(publicUser);
}

export async function createUser(input: CreateUserInput) {
  if (!input.name || !input.email || !input.password)
    throw new CustomError("Nombre, correo y contraseña son obligatorios", 400);

  const exists = await UserModel.findOne({ email: input.email.toLowerCase().trim() });
  if (exists) throw new CustomError("Ya existe un usuario con ese correo", 409);

  const user = await UserModel.create({
    ...input,
    email: input.email.toLowerCase().trim(),
    password: await bcrypt.hash(input.password, 10),
  });

  await sendMail({
    to: user.email,
    subject: "Tus accesos al panel PHB Develop Time",
    html: layout(
      `Bienvenido, ${user.name}`,
      `<p>Ya puedes entrar al panel de solicitudes y horas de desarrollo.</p>
       <p><b>Correo:</b> ${user.email}<br/><b>Contraseña temporal:</b> ${input.password}</p>
       <p>Cambia tu contraseña desde tu perfil al primer ingreso.</p>`,
      "Entrar al panel",
      process.env.APP_URL
    ),
  });

  return publicUser(user);
}

export async function updateUser(id: string, patch: Partial<CreateUserInput> & { isActive?: boolean }) {
  const data: Record<string, unknown> = { ...patch };
  if (patch.password) data.password = await bcrypt.hash(patch.password, 10);
  else delete data.password;

  const user = await UserModel.findByIdAndUpdate(id, data, { new: true });
  if (!user) throw new CustomError("Usuario no encontrado", 404);

  return publicUser(user);
}

export async function deactivateUser(id: string) {
  const user = await UserModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!user) throw new CustomError("Usuario no encontrado", 404);
  return publicUser(user);
}
