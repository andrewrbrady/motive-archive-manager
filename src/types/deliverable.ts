import { ObjectId } from "mongodb";

export type Platform =
  | "Instagram Reels"
  | "Instagram Post"
  | "Instagram Story"
  | "YouTube"
  | "YouTube Shorts"
  | "TikTok"
  | "Facebook"
  | "Bring a Trailer"
  | "Other";

export type DeliverableType =
  | "Photo Gallery"
  | "Video"
  | "Mixed Gallery"
  | "Video Gallery"
  | "Still"
  | "Graphic"
  | "feature"
  | "promo"
  | "review"
  | "walkthrough"
  | "highlights"
  | "Marketing Email"
  | "Blog"
  | "other";

export type DeliverableStatus = "not_started" | "in_progress" | "done";

export interface FeedbackNote {
  date: Date;
  author: string;
  note: string;
  resolved: boolean;
}

export interface Metrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  averageWatchTime?: number;
  updateDate: Date;
}

export interface Deliverable {
  _id?: ObjectId;
  car_id: ObjectId;

  // Basic Information
  title: string;
  description?: string;
  platform: Platform;
  type: DeliverableType;

  // Technical Details
  duration: number;
  actual_duration?: number;
  aspect_ratio: string;

  // Production Details
  editor: string;
  firebase_uid?: string; // Firebase User ID for assignment
  status: DeliverableStatus;
  edit_dates: Date[];
  edit_deadline: Date;
  release_date?: Date;

  // Content Details
  target_audience?: string;
  music_track?: string;
  thumbnail_url?: string;
  tags: string[];
  publishing_url?: string;
  metrics?: Metrics;
  assets_location?: string;
  priority_level?: number;

  // Metadata
  created_at?: Date;
  updated_at?: Date;
}

export interface DeliverableTemplate {
  title: string;
  platform: Platform;
  type: DeliverableType;
  duration?: number;
  aspect_ratio: string;
  daysFromStart: number;
  daysUntilDeadline: number;
  daysUntilRelease?: number;
}

export interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

// Predefined batch templates
export const PREDEFINED_BATCHES: Record<string, BatchTemplate> = {
  "Standard Car Package": {
    name: "Standard Car Package",
    templates: [
      {
        title: "White Room",
        platform: "Instagram Reels",
        type: "Video",
        duration: 15,
        aspect_ratio: "9:16",
        daysFromStart: 0,
        daysUntilDeadline: 7,
        daysUntilRelease: 9,
      },
      {
        title: "White Room",
        platform: "YouTube Shorts",
        type: "Video",
        duration: 15,
        aspect_ratio: "9:16",
        daysFromStart: 0,
        daysUntilDeadline: 7,
        daysUntilRelease: 9,
      },
      {
        title: "BaT Gallery",
        platform: "Bring a Trailer",
        type: "Photo Gallery",
        aspect_ratio: "16:9",
        daysFromStart: 2,
        daysUntilDeadline: 5,
        daysUntilRelease: 7,
      },
      {
        title: "Highlights",
        platform: "Instagram Post",
        type: "Photo Gallery",
        aspect_ratio: "1:1",
        daysFromStart: 2,
        daysUntilDeadline: 5,
        daysUntilRelease: 7,
      },
    ],
  },
};
