import { ObjectId } from "mongodb";

export type Platform =
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "stream_otv";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export interface Script {
  _id: ObjectId;
  carId: ObjectId;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  content: string;
  brief: string;
  duration: string;
  rows?: Array<{
    id: string;
    time: string;
    video: string;
    audio: string;
    gfx: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StandardizedScript {
  _id: string;
  carId: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  content: string;
  brief: string;
  duration: string;
  rows?: Array<{
    id: string;
    time: string;
    video: string;
    audio: string;
    gfx: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
