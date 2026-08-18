import { FilterQuery, Types } from "mongoose";
import { RequestModel, IRequest, RequestStatus } from "../models/request.model";
import { CommentModel } from "../models/comment.model";
import { TimeLogModel } from "../models/timeLog.model";
import { UserModel } from "../models/user.model";
import { CustomError } from "../errors/customError.error";
import { JwtPayload } from "../types/AuthRequest";
import { sendMail, layout } from "./email.service";

const POPULATE = [
  { path: "requestedBy", select: "name email role color" },
  { path: "assignees", select: "name email role color" },
  { path: "history.by", select: "name color" },
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  in_progress: "En progreso",
  blocked: "Bloqueada",
  review: "En revisión",
  done: "Completada",
  cancelled: "Cancelada",
};

async function nextCode() {
  const last = await RequestModel.findOne().sort({ createdAt: -1 }).select("code");
  const lastNumber = last?.code ? parseInt(last.code.replace(/\D/g, ""), 10) : 0;
  return `SOL-${String((Number.isNaN(lastNumber) ? 0 : lastNumber) + 1).padStart(3, "0")}`;
}

async function notify(emails: string[], subject: string, title: string, body: string, requestId: string) {
  const recipients = emails.filter(Boolean);
  if (!recipients.length) return;

  await sendMail({
    to: recipients,
    subject,
    html: layout(title, body, "Ver solicitud", `${process.env.APP_URL}/solicitudes/${requestId}`),
  });
}

export async function listRequests(query: Record<string, string | undefined>, user: JwtPayload) {
  const filter: FilterQuery<IRequest> = {};

  if (query.status) filter.status = { $in: query.status.split(",") } as never;
  if (query.priority) filter.priority = { $in: query.priority.split(",") } as never;
  if (query.assignee) filter.assignees = new Types.ObjectId(query.assignee) as never;
  if (query.mine === "true" && user.role === "developer")
    filter.assignees = new Types.ObjectId(user.id) as never;
  if (query.search) filter.$or = [
    { title: { $regex: query.search, $options: "i" } },
    { code: { $regex: query.search, $options: "i" } },
  ];

  return RequestModel.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(300);
}

export async function getRequest(id: string) {
  const request = await RequestModel.findById(id).populate(POPULATE);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);

  const [logs, comments] = await Promise.all([
    TimeLogModel.find({ request: id }).populate("user", "name color role").sort({ date: -1 }),
    CommentModel.find({ request: id }).populate("user", "name color role").sort({ createdAt: -1 }),
  ]);

  return { request, timeLogs: logs, comments };
}

export async function createRequest(payload: Record<string, unknown>, user: JwtPayload) {
  if (!payload.title) throw new CustomError("El título es obligatorio", 400);

  const request = await RequestModel.create({
    code: await nextCode(),
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "desarrollo",
    priority: payload.priority || "medium",
    estimatedHours: Number(payload.estimatedHours) || 0,
    dueDate: payload.dueDate ? new Date(payload.dueDate as string) : undefined,
    assignees: (payload.assignees as string[]) || [],
    tools: (payload.tools as string[]) || [],
    requestedBy: user.id,
    status: "pending",
    history: [{ from: null, to: "pending", by: new Types.ObjectId(user.id), note: "Solicitud creada", at: new Date() }],
  });

  const team = await UserModel.find({ role: { $in: ["developer", "admin"] }, isActive: true }).select("email");

  await notify(
    team.map((member) => member.email),
    `Nueva solicitud ${request.code}: ${request.title}`,
    `Nueva solicitud de ${user.name}`,
    `<p><b>${request.code} — ${request.title}</b></p>
     <p>${request.description || "Sin descripción"}</p>
     <p>Prioridad: <b>${request.priority}</b> · Estimado: <b>${request.estimatedHours} h</b></p>`,
    request._id.toString()
  );

  return RequestModel.findById(request._id).populate(POPULATE);
}

export async function updateRequest(id: string, patch: Record<string, unknown>) {
  const data = { ...patch };
  delete data.status;
  delete data.loggedHours;
  delete data.code;

  const request = await RequestModel.findByIdAndUpdate(id, data, { new: true }).populate(POPULATE);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);
  return request;
}

export async function changeStatus(id: string, status: RequestStatus, note: string, user: JwtPayload) {
  const request = await RequestModel.findById(id);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);
  if (request.status === status) throw new CustomError("La solicitud ya está en ese estado", 400);

  const previous = request.status;
  request.status = status;
  request.history.push({ from: previous, to: status, by: new Types.ObjectId(user.id), note, at: new Date() });

  if (status === "in_progress" && !request.startedAt) request.startedAt = new Date();
  if (status === "done") request.completedAt = new Date();
  if (status !== "done") request.completedAt = undefined;

  await request.save();

  const requester = await UserModel.findById(request.requestedBy).select("email");

  await notify(
    [requester?.email || ""],
    `${request.code} → ${STATUS_LABELS[status]}`,
    `${request.code} cambió de estado`,
    `<p><b>${request.title}</b></p>
     <p>${STATUS_LABELS[previous]} → <b style="color:#21bcfb">${STATUS_LABELS[status]}</b></p>
     <p>${note ? `Nota: ${note}` : ""}</p>
     <p>Horas registradas: <b>${request.loggedHours} h</b> de ${request.estimatedHours} h estimadas.</p>`,
    request._id.toString()
  );

  return RequestModel.findById(id).populate(POPULATE);
}

export async function deleteRequest(id: string) {
  const request = await RequestModel.findByIdAndDelete(id);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);

  await Promise.all([TimeLogModel.deleteMany({ request: id }), CommentModel.deleteMany({ request: id })]);
  return { message: "Solicitud eliminada" };
}

export async function addComment(requestId: string, message: string, user: JwtPayload) {
  if (!message?.trim()) throw new CustomError("El comentario no puede estar vacío", 400);

  const request = await RequestModel.findById(requestId);
  if (!request) throw new CustomError("Solicitud no encontrada", 404);

  const comment = await CommentModel.create({ request: requestId, user: user.id, message: message.trim() });

  const participants = await UserModel.find({
    _id: { $in: [request.requestedBy, ...request.assignees], $ne: new Types.ObjectId(user.id) },
  }).select("email");

  await notify(
    participants.map((member) => member.email),
    `Nuevo comentario en ${request.code}`,
    `${user.name} comentó en ${request.code}`,
    `<p><b>${request.title}</b></p><p>${message}</p>`,
    request._id.toString()
  );

  return CommentModel.findById(comment._id).populate("user", "name color role");
}
