import mongoose, { Schema, Document } from "mongoose";

export interface IYoutubeVideo {
  video_id: string;
  title: string;
  description?: string;
  channel_id: string;
  channel_name: string;
  published_at: Date;
  thumbnail_url?: string;
  duration?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  tags: string[];
  is_featured: boolean;
  transcript_id?: mongoose.Types.ObjectId;
  has_transcript: boolean;
  transcript_summary?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type YoutubeVideoDocument = IYoutubeVideo & Document;

const YoutubeVideoSchema = new Schema(
  {
    video_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    channel_id: { type: String, required: true },
    channel_name: { type: String, required: true },
    published_at: { type: Date, required: true },
    thumbnail_url: { type: String },
    duration: { type: String },
    view_count: { type: Number },
    like_count: { type: Number },
    comment_count: { type: Number },
    tags: [{ type: String }],
    is_featured: { type: Boolean, default: false },
    transcript_id: { type: Schema.Types.ObjectId, ref: "YoutubeTranscript" },
    has_transcript: { type: Boolean, default: false },
    transcript_summary: { type: String },
    notes: { type: String },
  },
  {
    collection: "youtube_videos",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create indexes for better query performance
YoutubeVideoSchema.index({ channel_id: 1 });
YoutubeVideoSchema.index({ published_at: -1 });
YoutubeVideoSchema.index({ is_featured: 1 });
YoutubeVideoSchema.index({ tags: 1 });
YoutubeVideoSchema.index({ has_transcript: 1 });
YoutubeVideoSchema.index({ transcript_id: 1 });

export const YoutubeVideo =
  mongoose.models.YoutubeVideo ||
  mongoose.model<YoutubeVideoDocument>("YoutubeVideo", YoutubeVideoSchema);
