import express from "express";
import cors from "cors";
import http from "http";
import routerApi from "./routes";
import { dbConnect } from "./config/mongo";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.middleware";

const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:8080",
  "http://localhost:8110",
];

/** Orígenes extra de producción, separados por coma en CORS_ORIGINS. */
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const whitelist = [...localOrigins, ...envOrigins];

/** Los deploys de preview de Vercel cambian de hash en cada push. */
function isAllowed(origin: string) {
  if (whitelist.includes(origin)) return true;
  return /^https:\/\/phb-bakano-develop-time-frontapp[a-z0-9-]*\.vercel\.app$/.test(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));

  // Garantiza la conexión antes de cualquier ruta (incluido el cold start de Vercel).
  app.use(async (_req, res, next) => {
    try {
      await dbConnect();
      next();
    } catch (error) {
      res.status(503).json({ message: "Base de datos no disponible" });
    }
  });

  app.get("/", (_req, res) => {
    res.send("Server is alive");
  });

  routerApi(app);

  app.use(globalErrorHandler);

  const server = http.createServer(app);

  return { app, server };
}
