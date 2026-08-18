import { Types } from "mongoose";
import { TimeLogModel } from "../models/timeLog.model";
import { RequestModel, REQUEST_STATUSES } from "../models/request.model";
import { UserModel } from "../models/user.model";
import { parseRange, startOfWeek, formatDate } from "../utils/dates.util";
import { sendMail, layout } from "./email.service";

export async function summary(from?: string, to?: string) {
  const { start, end } = parseRange(from, to);
  const range = { date: { $gte: start, $lte: end } };

  const [byStatus, hoursByUser, hoursByRequest, hoursByDay, totals, requestTotals] = await Promise.all([
    RequestModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    TimeLogModel.aggregate([
      { $match: range },
      { $group: { _id: "$user", hours: { $sum: "$hours" }, entries: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          color: "$user.color",
          role: "$user.role",
          position: "$user.position",
          hours: 1,
          entries: 1,
        },
      },
      { $sort: { hours: -1 } },
    ]),

    TimeLogModel.aggregate([
      { $match: range },
      { $group: { _id: "$request", hours: { $sum: "$hours" } } },
      { $lookup: { from: "requests", localField: "_id", foreignField: "_id", as: "request" } },
      { $unwind: "$request" },
      {
        $project: {
          _id: 0,
          requestId: "$_id",
          code: "$request.code",
          title: "$request.title",
          status: "$request.status",
          estimatedHours: "$request.estimatedHours",
          hours: 1,
        },
      },
      { $sort: { hours: -1 } },
      { $limit: 20 },
    ]),

    TimeLogModel.aggregate([
      { $match: range },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, hours: { $sum: "$hours" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: "$_id", hours: 1 } },
    ]),

    TimeLogModel.aggregate([
      { $match: range },
      { $group: { _id: null, hours: { $sum: "$hours" }, entries: { $sum: 1 } } },
    ]),

    RequestModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          estimated: { $sum: "$estimatedHours" },
          logged: { $sum: "$loggedHours" },
        },
      },
    ]),
  ]);

  const statusMap = Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0]));
  byStatus.forEach((row: { _id: string; count: number }) => {
    statusMap[row._id] = row.count;
  });

  const completed = await RequestModel.find({ status: "done", completedAt: { $ne: null } }).select(
    "createdAt completedAt"
  );

  const avgResolutionDays = completed.length
    ? completed.reduce(
        (acc, item) =>
          acc + (new Date(item.completedAt as Date).getTime() - new Date(item.createdAt).getTime()) / 86400000,
        0
      ) / completed.length
    : 0;

  return {
    range: { from: start, to: end },
    requests: {
      byStatus: statusMap,
      total: requestTotals[0]?.total || 0,
      estimatedHours: requestTotals[0]?.estimated || 0,
      loggedHours: requestTotals[0]?.logged || 0,
      open: statusMap.pending + statusMap.approved + statusMap.in_progress + statusMap.blocked + statusMap.review,
      avgResolutionDays: Number(avgResolutionDays.toFixed(1)),
    },
    hours: {
      total: Number((totals[0]?.hours || 0).toFixed(2)),
      entries: totals[0]?.entries || 0,
      byUser: hoursByUser,
      byRequest: hoursByRequest,
      byDay: hoursByDay,
    },
  };
}

export async function developerReport(userId: string, from?: string, to?: string) {
  const { start, end } = parseRange(from, to);

  const user = await UserModel.findById(userId).select("name email color position role");

  const logs = await TimeLogModel.find({ user: new Types.ObjectId(userId), date: { $gte: start, $lte: end } })
    .populate("request", "code title status priority")
    .sort({ date: -1 });

  const totalHours = logs.reduce((acc, log) => acc + log.hours, 0);

  const assigned = await RequestModel.countDocuments({ assignees: new Types.ObjectId(userId) });
  const delivered = await RequestModel.countDocuments({ assignees: new Types.ObjectId(userId), status: "done" });

  return {
    user,
    range: { from: start, to: end },
    totalHours: Number(totalHours.toFixed(2)),
    entries: logs.length,
    assignedRequests: assigned,
    deliveredRequests: delivered,
    logs,
  };
}

export async function weeklyDigest(to?: string[]) {
  const start = startOfWeek();
  const end = new Date();
  const data = await summary(start.toISOString(), end.toISOString());

  const rows = data.hours.byUser
    .map(
      (row: { name: string; hours: number; entries: number }) =>
        `<tr><td style="padding:6px 0;color:#fff">${row.name}</td>
         <td style="padding:6px 0;text-align:right;color:#21bcfb;font-weight:700">${row.hours.toFixed(1)} h</td>
         <td style="padding:6px 0;text-align:right;color:rgba(255,255,255,.6)">${row.entries} acciones</td></tr>`
    )
    .join("");

  const topRequests = data.hours.byRequest
    .slice(0, 8)
    .map(
      (row: { code: string; title: string; hours: number }) =>
        `<li><b>${row.code}</b> — ${row.title} · ${row.hours.toFixed(1)} h</li>`
    )
    .join("");

  const recipients =
    to && to.length
      ? to
      : (await UserModel.find({ role: { $in: ["admin", "client"] }, isActive: true }).select("email")).map(
          (user) => user.email
        );

  await sendMail({
    to: recipients,
    subject: `Reporte semanal de desarrollo — ${formatDate(start)} a ${formatDate(end)}`,
    html: layout(
      "Reporte semanal del equipo de tecnología",
      `<p>Periodo: <b>${formatDate(start)} — ${formatDate(end)}</b></p>
       <p><b>${data.hours.total} h</b> registradas en <b>${data.hours.entries}</b> acciones ·
       <b>${data.requests.open}</b> solicitudes abiertas · <b>${data.requests.byStatus.done}</b> completadas en total.</p>
       <table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}</table>
       <p style="margin-top:16px"><b>Solicitudes con más trabajo esta semana</b></p>
       <ul style="padding-left:18px">${topRequests || "<li>Sin registros</li>"}</ul>`,
      "Ver panel completo",
      `${process.env.APP_URL}/reportes`
    ),
  });

  return { sentTo: recipients, ...data };
}
