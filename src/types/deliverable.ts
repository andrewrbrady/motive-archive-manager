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
  | "feature"
  | "promo"
  | "review"
  | "walkthrough"
  | "highlights"
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
  status: DeliverableStatus;
  edit_dates: Date[];
  edit_deadline: Date;
  release_date: Date;

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
      },
      {
        title: "White Room",
        platform: "YouTube Shorts",
        type: "Video",
        duration: 15,
        aspect_ratio: "9:16",
      },
      {
        title: "BaT Gallery",
        platform: "Bring a Trailer",
        type: "Photo Gallery",
        aspect_ratio: "16:9",
      },
      {
        title: "Highlights",
        platform: "Instagram Post",
        type: "Photo Gallery",
        aspect_ratio: "1:1",
      },
    ],
  },
};
