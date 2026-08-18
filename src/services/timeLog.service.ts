import { FilterQuery, Types } from "mongoose";
import { TimeLogModel, ITimeLog } from "../models/timeLog.model";
import { RequestModel } from "../models/request.model";
import { CustomError } from "../errors/customError.error";
import { JwtPayload } from "../types/AuthRequest";
import { parseRange } from "../utils/dates.util";

async function syncLoggedHours(requestId: Types.ObjectId | string) {
  const [totals] = await TimeLogModel.aggregate([
    { $match: { request: new Types.ObjectId(requestId) } },
    { $group: { _id: null, hours: { $sum: "$hours" } } },
  ]);

  await RequestModel.findByIdAndUpdate(requestId, { loggedHours: totals?.hours || 0 });
  return totals?.hours || 0;
}

export async function listTimeLogs(query: Record<string, string | undefined>, user: JwtPayload) {
  const filter: FilterQuery<ITimeLog> = {};
  const { start, end } = parseRange(query.from, query.to);

  filter.date = { $gte: start, $lte: end };
  if (query.request) filter.request = new Types.ObjectId(query.request) as never;
  if (query.user) filter.user = new Types.ObjectId(query.user) as never;
  if (query.mine === "true") filter.user = new Types.ObjectId(user.id) as never;

  return TimeLogModel.find(filter)
    .populate("user", "name color role")
    .populate("request", "code title status")
    .sort({ date: -1, createdAt: -1 })
    .limit(500);
}

export async function createTimeLog(payload: Record<string, unknown>, user: JwtPayload) {
  const hours = Number(payload.hours);

  if (!payload.request) throw new CustomError("Debes indicar la solicitud", 400);
  if (!payload.action) throw new CustomError("Describe la acción realizada", 400);
  if (!hours || hours <= 0) throw new CustomError("Las horas deben ser mayores a cero", 400);

  const request = await RequestModel.findById(payload.request as string);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);

  const log = await TimeLogModel.create({
    request: request._id,
    user: payload.user && user.role === "admin" ? payload.user : user.id,
    date: payload.date ? new Date(payload.date as string) : new Date(),
    hours,
    action: payload.action,
    tools: (payload.tools as string[]) || [],
    phase: (payload.phase as string) || "",
  });

  if (request.status === "pending" || request.status === "approved") {
    const previousStatus = request.status;
    request.status = "in_progress";
    request.startedAt = request.startedAt || new Date();
    request.history.push({
      from: previousStatus,
      to: "in_progress",
      by: new Types.ObjectId(user.id),
      note: "Inicio automático al registrar horas",
      at: new Date(),
    });
    await request.save();
  }

  await syncLoggedHours(request._id);

  return TimeLogModel.findById(log._id)
    .populate("user", "name color role")
    .populate("request", "code title status");
}

export async function updateTimeLog(id: string, patch: Record<string, unknown>, user: JwtPayload) {
  const log = await TimeLogModel.findById(id);
  if (!log) throw new CustomError("Registro no encontrado", 404);
  if (user.role !== "admin" && log.user.toString() !== user.id)
    throw new CustomError("Solo puedes editar tus propios registros", 403);

  if (patch.hours !== undefined) log.hours = Number(patch.hours);
  if (patch.action !== undefined) log.action = String(patch.action);
  if (patch.date !== undefined) log.date = new Date(patch.date as string);
  if (patch.tools !== undefined) log.tools = patch.tools as string[];
  if (patch.phase !== undefined) log.phase = String(patch.phase);

  await log.save();
  await syncLoggedHours(log.request);

  return TimeLogModel.findById(id).populate("user", "name color role").populate("request", "code title status");
}

export async function deleteTimeLog(id: string, user: JwtPayload) {
  const log = await TimeLogModel.findById(id);
  if (!log) throw new CustomError("Registro no encontrado", 404);
  if (user.role !== "admin" && log.user.toString() !== user.id)
    throw new CustomError("Solo puedes eliminar tus propios registros", 403);

  await log.deleteOne();
  await syncLoggedHours(log.request);

  return { message: "Registro eliminado" };
}
