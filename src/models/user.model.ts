import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "admin" | "client" | "developer";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  position?: string;
  hourlyRate?: number;
  color: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "client", "developer"], default: "developer" },
    position: { type: String, default: "" },
    hourlyRate: { type: Number, default: 0 },
    color: { type: String, default: "#21bcfb" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ role: 1, isActive: 1 });

export const UserModel = model<IUser>("User", userSchema);
