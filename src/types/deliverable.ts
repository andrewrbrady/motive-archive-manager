import { ObjectId } from "mongodb";

// New interface for media type data from API
export interface MediaType {
  _id: ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// New interface for platform data from API
export interface DeliverablePlatform {
  _id: string;
  name: string;
  category: string;
  isActive: boolean;
}

// Keep the old Platform type for backward compatibility with existing data
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
  car_id?: ObjectId;

  // Basic Information
  title: string;
  description?: string;
  platform_id?: ObjectId; // New single platform reference
  platform?: Platform; // Keep for backward compatibility during migration
  platforms?: string[]; // Keep for backward compatibility during migration
  type: DeliverableType; // Keep for backward compatibility - will be migrated to mediaTypeId
  mediaTypeId?: ObjectId; // New field for MediaType reference
  mediaType?: MediaType; // Optional populated MediaType for UI display

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
  scheduled?: boolean; // Calendar scheduled status

  // Content Details
  target_audience?: string;
  music_track?: string;
  thumbnail_url?: string;
  primaryImageId?: string; // Cloudflare Images ID for primary/thumbnail image
  thumbnailUrl?: string; // Computed/cached thumbnail URL from Cloudflare
  tags: string[];
  publishing_url?: string;
  dropbox_link?: string; // Link to Dropbox files/folder
  social_media_link?: string; // Link to published social media post
  metrics?: Metrics;
  assets_location?: string;
  priority_level?: number;

  // Content References
  gallery_ids?: string[];
  caption_ids?: string[];

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
