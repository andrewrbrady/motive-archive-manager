import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

// AI File document interface
export interface IAIFileDocument extends mongoose.Document {
  _id: string;
  openaiFileId: string;
  filename: string;
  originalName: string;
  purpose:
    | "assistants:file_search"
    | "assistants:code_interpreter"
    | "fine-tune"
    | "batch";
  size: number;
  mimeType: string;
  uploadedBy: string;
  associatedWith: {
    type: "car" | "project" | "both";
    carIds: string[];
    projectIds: string[];
  };
  metadata: {
    description?: string;
    tags?: string[];
    category?: string;
  };
  status: "uploading" | "processed" | "error" | "deleted";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI File schema
const aiFileSchema = new mongoose.Schema<IAIFileDocument>(
  {
    openaiFileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        "assistants:file_search",
        "assistants:code_interpreter",
        "fine-tune",
        "batch",
      ],
      default: "assistants:file_search",
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      ref: "User",
    },
    associatedWith: {
      type: {
        type: String,
        enum: ["car", "project", "both"],
        required: true,
      },
      carIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Car",
        },
      ],
      projectIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
      ],
    },
    metadata: {
      description: String,
      tags: [String],
      category: String,
    },
    status: {
      type: String,
      enum: ["uploading", "processed", "error", "deleted"],
      default: "uploading",
    },
    errorMessage: String,
  },
  {
    collection: "ai_files",
    timestamps: true,
  }
);

// Indexes for performance
aiFileSchema.index({ openaiFileId: 1 });
aiFileSchema.index({ uploadedBy: 1 });
aiFileSchema.index({ "associatedWith.carIds": 1 });
aiFileSchema.index({ "associatedWith.projectIds": 1 });
aiFileSchema.index({ status: 1 });
aiFileSchema.index({ createdAt: -1 });

// Create and export the AIFile model
export const AIFile = (mongoose.models.AIFile ||
  mongoose.model<IAIFileDocument>(
    "AIFile",
    aiFileSchema
  )) as mongoose.Model<IAIFileDocument>;

export default AIFile;
