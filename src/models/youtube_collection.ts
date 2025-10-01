import mongoose, { Schema, Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

export interface IYoutubeCollection {
  name: string;
  description?: string;
  thumbnail_url?: string;
  video_ids: string[];
  is_featured: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export type YoutubeCollectionDocument = IYoutubeCollection & Document;

const YoutubeCollectionSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    thumbnail_url: { type: String },
    video_ids: [{ type: String, required: true }],
    is_featured: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  {
    collection: "youtube_collections",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export const YoutubeCollection =
  mongoose.models.YoutubeCollection ||
  mongoose.model<YoutubeCollectionDocument>(
    "YoutubeCollection",
    YoutubeCollectionSchema
  );
