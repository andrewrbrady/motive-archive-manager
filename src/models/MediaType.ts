import mongoose, { Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Ensure database connection is established
dbConnect().catch(console.error);

// Delete the existing model if it exists to ensure schema changes are picked up
if (mongoose.models.MediaType) {
  delete mongoose.models.MediaType;
}

export interface IMediaType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const mediaTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    collection: "media_types",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add compound index for efficient querying
mediaTypeSchema.index({ isActive: 1, sortOrder: 1 });

export const MediaType =
  mongoose.models.MediaType ||
  mongoose.model<IMediaType>("MediaType", mediaTypeSchema);
