import mongoose from "mongoose";

/**
 * En serverless cada invocación puede reutilizar el proceso: se cachea la
 * promesa para no abrir una conexión nueva por request.
 */
let connection: Promise<typeof mongoose> | null = null;

export function dbConnect() {
  if (connection) return connection;

  const DB_URI = process.env.DB_URI;

  if (!DB_URI) {
    return Promise.reject(new Error("DB_URI is not defined in environment variables"));
  }

  connection = mongoose
    .connect(DB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })
    .then((instance) => {
      console.log("Connected to MongoDB");
      return instance;
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error);
      connection = null;
      throw error;
    });

  return connection;
}
