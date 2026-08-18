import dotenv from "dotenv";

dotenv.config();

import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { dbConnect } from "./config/mongo";
import { UserModel, UserRole } from "./models/user.model";
import { RequestModel } from "./models/request.model";
import { TimeLogModel } from "./models/timeLog.model";

const DEFAULT_PASSWORD = "123456789";

const USERS: Array<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
  position: string;
  color: string;
}> = [
  {
    name: "PowerHouse Biotech",
    email: "admin@powerhousebiotech.com",
    password: DEFAULT_PASSWORD,
    role: "admin",
    position: "Dirección · PowerHouse Biotech",
    color: "#21bcfb",
  },
  {
    name: "Diego (Yeyo) Reyes",
    email: "dreyes@bakano.ec",
    password: DEFAULT_PASSWORD,
    role: "developer",
    position: "Tech Lead · Bakano",
    color: "#1278f3",
  },
  {
    name: "Carlos Jurado",
    email: "cjurado@bakano.ec",
    password: DEFAULT_PASSWORD,
    role: "developer",
    position: "Automatización & IA · Bakano",
    color: "#3bb77e",
  },
];

const AI_FUNNEL_TOOLS = [
  "GoHighLevel",
  "Conversation AI",
  "Workflows GHL",
  "Inbound Webhook",
  "LeadConnector",
  "Meta Ads",
  "Zoom",
  "Prompt Engineering",
  "JSON / POST testing",
];

/** Fases del reporte de acciones y horas — total 50 h. */
const AI_FUNNEL_PHASES: Array<{ phase: string; action: string; hours: number; owner: "dreyes" | "cjurado"; tools: string[] }> = [
  {
    phase: "Análisis y re-arquitectura de embudo",
    action:
      "Diseño del flujo lógico de dos agentes, matriz de decisión por estado de respuestas (respondidas) y diagramación de estados.",
    hours: 6.5,
    owner: "dreyes",
    tools: ["GoHighLevel", "Conversation AI", "Prompt Engineering"],
  },
  {
    phase: "Desarrollo de prompting de IA (Max & Elena)",
    action:
      "Redacción, refinamiento, delimitación de personalidad, lenguaje neutro, reglas de retención y bloqueo de agendamiento sin filtro.",
    hours: 10,
    owner: "cjurado",
    tools: ["Conversation AI", "Prompt Engineering"],
  },
  {
    phase: "Ingeniería de workflows & webhooks en GHL",
    action:
      "Mapeo de cargas JSON, pruebas de captura por POST, reordenamiento de nodos, lógica de reingreso (Allow Re-entry) y condicionales.",
    hours: 12.5,
    owner: "dreyes",
    tools: ["Workflows GHL", "Inbound Webhook", "LeadConnector", "JSON / POST testing"],
  },
  {
    phase: "Configuración de Conversation AI",
    action:
      "Parametrización de respuestas, vinculación de calendarios, configuración de tiempos de espera e interruptores de mensaje manual/flujo.",
    hours: 7,
    owner: "cjurado",
    tools: ["Conversation AI", "Zoom", "GoHighLevel"],
  },
  {
    phase: "Integration testing & QA",
    action:
      "Pruebas de estrés conversacional, simulación de crisis médicas, validación de transferencia de bot Max ➔ Elena y auditoría de logs.",
    hours: 9,
    owner: "dreyes",
    tools: ["GoHighLevel", "Conversation AI", "JSON / POST testing"],
  },
  {
    phase: "Depuración y ajustes de seguridad médica",
    action:
      "Corrección de desviaciones a hospitales externos, re-escritura de instrucciones de autoridad médica y contención de leads.",
    hours: 5,
    owner: "cjurado",
    tools: ["Conversation AI", "Prompt Engineering", "Meta Ads"],
  },
];

const AI_FUNNEL_DESCRIPTION = `Reestructuración del embudo conversacional y optimización de los agentes de IA (Max / Elena) con flujo de calificación automatizado.

Requerimientos del cliente:
1. Separar atención/calificación inicial del agendamiento médico definitivo.
2. Filtrado riguroso vía webhook: nadie agenda en Zoom sin completar el Perfil de Inteligencia Biológica de 50 preguntas.
3. Conversación fluida, empática y alineada a los protocolos clínicos de PowerHouse Biotech.
4. Manejo de tráfico multicanal (Meta Ads y landing) con sincronización de datos en tiempo real.
5. Contención de emergencias: el sistema asume la responsabilidad médica de la clínica y retiene al lead hacia la plataforma web.

Implementación: framework dual-agent (Max setter de calificación y retención / Elena setter senior y agendadora médica), mapeo avanzado de inbound webhook con 50 variables personalizadas, reordenamiento de nodos Create/Update Contact antes de las bifurcaciones, conmutación automática de bots con umbral respondidas == 50, reingreso habilitado (Allow Re-entry) y blindaje de protocolos clínicos.`;

async function main() {
  await dbConnect();

  const ids: Record<string, Types.ObjectId> = {};

  for (const entry of USERS) {
    const existing = await UserModel.findOne({ email: entry.email });

    if (existing) {
      existing.name = entry.name;
      existing.role = entry.role;
      existing.position = entry.position;
      existing.color = entry.color;
      existing.isActive = true;
      existing.password = await bcrypt.hash(entry.password, 10);
      await existing.save();
      ids[entry.email] = existing._id;
      console.log(`~ actualizado: ${entry.email} / ${entry.password} (${entry.role})`);
      continue;
    }

    const user = await UserModel.create({ ...entry, password: await bcrypt.hash(entry.password, 10) });
    ids[entry.email] = user._id;
    console.log(`+ creado: ${entry.email} / ${entry.password} (${entry.role})`);
  }

  const admin = ids["admin@powerhousebiotech.com"];
  const owners = { dreyes: ids["dreyes@bakano.ec"], cjurado: ids["cjurado@bakano.ec"] };

  const title = "Reestructuración y optimización de agentes IA conversacional (Max / Elena)";
  let request = await RequestModel.findOne({ title });

  if (!request) {
    const count = await RequestModel.countDocuments();
    request = await RequestModel.create({
      code: `SOL-${String(count + 1).padStart(3, "0")}`,
      title,
      description: AI_FUNNEL_DESCRIPTION,
      category: "automatización / IA",
      status: "done",
      priority: "urgent",
      requestedBy: admin,
      assignees: [owners.dreyes, owners.cjurado],
      estimatedHours: 50,
      tools: AI_FUNNEL_TOOLS,
      startedAt: new Date(Date.now() - 21 * 86400000),
      completedAt: new Date(),
      history: [
        { from: null, to: "pending", by: admin, note: "Solicitud del cliente", at: new Date(Date.now() - 24 * 86400000) },
        { from: "pending", to: "in_progress", by: owners.dreyes, note: "Inicio de re-arquitectura", at: new Date(Date.now() - 21 * 86400000) },
        { from: "in_progress", to: "done", by: owners.dreyes, note: "Finalizado e implementado en producción", at: new Date() },
      ],
    });
    console.log(`+ solicitud ${request.code}: ${title}`);
  }

  const existingLogs = await TimeLogModel.countDocuments({ request: request._id });

  if (existingLogs === 0) {
    let offset = AI_FUNNEL_PHASES.length;

    for (const phase of AI_FUNNEL_PHASES) {
      await TimeLogModel.create({
        request: request._id,
        user: owners[phase.owner],
        date: new Date(Date.now() - offset * 3 * 86400000),
        hours: phase.hours,
        action: phase.action,
        phase: phase.phase,
        tools: phase.tools,
      });
      console.log(`  + ${phase.hours} h — ${phase.phase} (${phase.owner})`);
      offset -= 1;
    }
  }

  const [totals] = await TimeLogModel.aggregate([
    { $match: { request: request._id } },
    { $group: { _id: null, hours: { $sum: "$hours" } } },
  ]);

  request.loggedHours = totals?.hours || 0;
  await request.save();
  console.log(`= horas registradas en ${request.code}: ${request.loggedHours} h`);

  await mongoose.disconnect();
  console.log("\nSeed completo.");
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
