export type Platform =
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "stream_otv";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export interface ScriptRow {
  time: string;
  video: string;
  audio: string;
  gfx: string;
}

export interface ScriptTemplate {
  _id: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  rows: ScriptRow[];
  createdAt?: string;
  updatedAt?: string;
}
