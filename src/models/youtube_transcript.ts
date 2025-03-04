import mongoose, { Schema, Document } from "mongoose";

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
}

interface TranscriptSpeaker {
  id: string;
  segments: number[]; // Indices of segments spoken by this speaker
}

interface TranscriptEntity {
  type: string;
  text: string;
  mentions: number;
}

interface TranscriptMetadata {
  keywords: string[];
  entities: TranscriptEntity[];
  sentiment?: {
    overall: string;
    score: number;
  };
  topics?: string[];
}

export interface IYoutubeTranscript {
  video_id: string;
  language: string;
  is_auto_generated: boolean;
  full_text: string;
  segments: TranscriptSegment[];
  summary?: string;
  metadata?: TranscriptMetadata;
  speakers?: TranscriptSpeaker[];
  created_at: Date;
  updated_at: Date;
}

export type YoutubeTranscriptDocument = IYoutubeTranscript & Document;

const TranscriptSegmentSchema = new Schema({
  start_time: { type: Number, required: true },
  end_time: { type: Number, required: true },
  text: { type: String, required: true },
  confidence: { type: Number },
});

const TranscriptSpeakerSchema = new Schema({
  id: { type: String, required: true },
  segments: [{ type: Number }],
});

const TranscriptEntitySchema = new Schema({
  type: { type: String, required: true },
  text: { type: String, required: true },
  mentions: { type: Number, required: true },
});

const TranscriptMetadataSchema = new Schema({
  keywords: [{ type: String }],
  entities: [TranscriptEntitySchema],
  sentiment: {
    overall: { type: String },
    score: { type: Number },
  },
  topics: [{ type: String }],
});

const YoutubeTranscriptSchema = new Schema(
  {
    video_id: { type: String, required: true, unique: true },
    language: { type: String, required: true, default: "en" },
    is_auto_generated: { type: Boolean, default: true },
    full_text: { type: String, required: true },
    segments: [TranscriptSegmentSchema],
    summary: { type: String },
    metadata: TranscriptMetadataSchema,
    speakers: [TranscriptSpeakerSchema],
  },
  {
    collection: "youtube_transcripts",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create indexes for better query performance
YoutubeTranscriptSchema.index({ video_id: 1 });
YoutubeTranscriptSchema.index({ "metadata.keywords": 1 });
YoutubeTranscriptSchema.index({ full_text: "text" });

export const YoutubeTranscript =
  mongoose.models.YoutubeTranscript ||
  mongoose.model<YoutubeTranscriptDocument>(
    "YoutubeTranscript",
    YoutubeTranscriptSchema
  );
