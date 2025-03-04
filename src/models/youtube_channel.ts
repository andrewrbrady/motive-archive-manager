import mongoose, { Schema, Document } from "mongoose";

export interface IYoutubeChannel {
  channel_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  subscriber_count?: number;
  video_count?: number;
  view_count?: number;
  is_curated: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export type YoutubeChannelDocument = IYoutubeChannel & Document;

const YoutubeChannelSchema = new Schema(
  {
    channel_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    thumbnail_url: { type: String },
    subscriber_count: { type: Number },
    video_count: { type: Number },
    view_count: { type: Number },
    is_curated: { type: Boolean, default: true },
    tags: [{ type: String }],
  },
  {
    collection: "youtube_channels",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export const YoutubeChannel =
  mongoose.models.YoutubeChannel ||
  mongoose.model<YoutubeChannelDocument>(
    "YoutubeChannel",
    YoutubeChannelSchema
  );
