import mongoose, { Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import {
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";

// Ensure database connection is established
dbConnect().catch(console.error);

// Delete the existing model if it exists to ensure schema changes are picked up
if (mongoose.models.Deliverable) {
  delete mongoose.models.Deliverable;
}

export interface IDeliverable extends Document {
  car_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  platform: Platform;
  type: DeliverableType;
  duration: number;
  actual_duration?: number;
  aspect_ratio: string;
  firebase_uid: string; // Required field for user association
  editor: string; // Editor name
  status: DeliverableStatus;
  edit_dates: Date[];
  edit_deadline: Date;
  release_date: Date;
  target_audience?: string;
  music_track?: string;
  thumbnail_url?: string;
  tags: string[];
  publishing_url?: string;
  dropbox_link?: string; // Link to Dropbox files/folder
  social_media_link?: string; // Link to published social media post
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    averageWatchTime?: number;
    updateDate: Date;
  };
  assets_location?: string;
  priority_level?: number;
  created_at: Date;
  updated_at: Date;
  toPublicJSON(): Record<string, any>;
}

const deliverableSchema = new mongoose.Schema(
  {
    car_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      enum: [
        "Instagram Reels",
        "Instagram Post",
        "Instagram Story",
        "YouTube",
        "YouTube Shorts",
        "TikTok",
        "Facebook",
        "Bring a Trailer",
        "Other",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: ["Photo Gallery", "Video", "Mixed Gallery", "Video Gallery"],
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    actual_duration: {
      type: Number,
      min: 0,
    },
    aspect_ratio: {
      type: String,
      required: true,
    },
    firebase_uid: {
      type: String,
      required: true,
      index: true,
    },
    editor: {
      type: String,
      required: true,
      default: "Unassigned",
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "done"],
      default: "not_started",
      required: true,
      index: true,
    },
    edit_dates: [
      {
        type: Date,
      },
    ],
    edit_deadline: {
      type: Date,
      required: true,
      index: true,
    },
    release_date: {
      type: Date,
      required: true,
      index: true,
    },
    target_audience: String,
    music_track: String,
    thumbnail_url: String,
    tags: [String],
    publishing_url: String,
    dropbox_link: String,
    social_media_link: String,
    metrics: {
      views: Number,
      likes: Number,
      comments: Number,
      shares: Number,
      averageWatchTime: Number,
      updateDate: Date,
    },
    assets_location: String,
    priority_level: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for common queries
deliverableSchema.index({ status: 1 });
deliverableSchema.index({ platform: 1 });
deliverableSchema.index({ type: 1 });
deliverableSchema.index({ firebase_uid: 1, status: 1 });
deliverableSchema.index({ car_id: 1, status: 1 });
deliverableSchema.index({ release_date: 1 });
deliverableSchema.index({ created_at: 1 });

// Add virtual properties
deliverableSchema.virtual("isOverdue").get(function () {
  return this.edit_deadline < new Date() && this.status !== "done";
});

deliverableSchema.virtual("daysUntilDeadline").get(function () {
  const now = new Date();
  const deadline = new Date(this.edit_deadline);
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to create a public deliverable object (without sensitive data)
deliverableSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Create and export the model
const Deliverable = mongoose.model<IDeliverable>(
  "Deliverable",
  deliverableSchema
);

export { Deliverable };
