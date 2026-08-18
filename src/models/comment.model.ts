import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  request: Types.ObjectId;
  user: Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    request: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

commentSchema.index({ request: 1, createdAt: -1 });

export const CommentModel = model<IComment>("Comment", commentSchema);
