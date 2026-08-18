import { Schema, model, Document, Types } from "mongoose";

export interface ITimeLog extends Document {
  _id: Types.ObjectId;
  request: Types.ObjectId;
  user: Types.ObjectId;
  date: Date;
  hours: number;
  action: string;
  tools: string[];
  phase?: string;
  createdAt: Date;
  updatedAt: Date;
}

const timeLogSchema = new Schema<ITimeLog>(
  {
    request: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, default: Date.now },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    action: { type: String, required: true, trim: true },
    tools: [{ type: String, trim: true }],
    phase: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

timeLogSchema.index({ user: 1, date: -1 });
timeLogSchema.index({ request: 1, date: -1 });

export const TimeLogModel = model<ITimeLog>("TimeLog", timeLogSchema);
