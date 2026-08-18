import { Schema, model, Document, Types } from "mongoose";

export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "in_progress",
  "blocked",
  "review",
  "done",
  "cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestPriority = "low" | "medium" | "high" | "urgent";

export interface IStatusChange {
  from: RequestStatus | null;
  to: RequestStatus;
  by: Types.ObjectId;
  note?: string;
  at: Date;
}

export interface IRequest extends Document {
  _id: Types.ObjectId;
  code: string;
  title: string;
  description: string;
  category: string;
  status: RequestStatus;
  priority: RequestPriority;
  requestedBy: Types.ObjectId;
  assignees: Types.ObjectId[];
  estimatedHours: number;
  loggedHours: number;
  tools: string[];
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  history: IStatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

const requestSchema = new Schema<IRequest>(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "desarrollo" },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    tools: [{ type: String, trim: true }],
    dueDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    history: [
      {
        from: { type: String, default: null },
        to: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

requestSchema.index({ status: 1, priority: 1 });
requestSchema.index({ assignees: 1 });
requestSchema.index({ createdAt: -1 });

export const RequestModel = model<IRequest>("Request", requestSchema);
