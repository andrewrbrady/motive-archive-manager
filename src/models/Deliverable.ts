import mongoose, { Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import {
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";

// Ensure database connection is established
dbConnect().catch(console.error);

export interface IDeliverable extends Document {
  car_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  platform: Platform;
  type: DeliverableType;
  duration: number;
  actual_duration?: number;
  aspect_ratio: string;
  editor: string;
  status: DeliverableStatus;
  edit_dates: Date[];
  edit_deadline: Date;
  release_date: Date;
  target_audience?: string;
  music_track?: string;
  thumbnail_url?: string;
  tags: string[];
  publishing_url?: string;
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
}

const deliverableSchema = new mongoose.Schema(
  {
    car_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
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
      enum: [
        "Instagram Reels",
        "YouTube",
        "YouTube Shorts",
        "TikTok",
        "Facebook",
        "Bring a Trailer",
        "Other",
      ],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "feature",
        "promo",
        "review",
        "walkthrough",
        "highlights",
        "other",
      ],
      required: true,
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
    editor: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "done"],
      default: "not_started",
      required: true,
    },
    edit_dates: [
      {
        type: Date,
      },
    ],
    edit_deadline: {
      type: Date,
      required: true,
    },
    release_date: {
      type: Date,
      required: true,
    },
    target_audience: String,
    music_track: String,
    thumbnail_url: String,
    tags: [String],
    publishing_url: String,
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
deliverableSchema.index({ editor: 1 });
deliverableSchema.index({ edit_deadline: 1 });
deliverableSchema.index({ release_date: 1 });
deliverableSchema.index({ created_at: 1 });
deliverableSchema.index({ car_id: 1, status: 1 });
deliverableSchema.index({ car_id: 1, platform: 1 });

// Add instance methods
deliverableSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

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

// Export the model using the singleton pattern
const Deliverable =
  mongoose.models.Deliverable ||
  mongoose.model<IDeliverable>("Deliverable", deliverableSchema);

export { Deliverable };
