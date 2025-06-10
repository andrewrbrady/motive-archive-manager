import React from "react";
import { Play } from "lucide-react";
import { extractYouTubeVideoId, isYouTubeUrl } from "../utils/youtube";

interface VideoPreviewProps {
  socialMediaLink: string;
  aspectRatio?: string;
  title?: string;
}

export default function VideoPreview({
  socialMediaLink,
  aspectRatio,
  title,
}: VideoPreviewProps) {
  // Only render if we have a valid YouTube URL
  if (!socialMediaLink || !isYouTubeUrl(socialMediaLink)) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Play className="h-4 w-4" />
        {aspectRatio === "9:16" ? "YouTube Shorts Preview" : "Video Preview"}
      </h3>
      <div
        className={`relative w-full bg-black rounded-lg overflow-hidden ${
          aspectRatio === "9:16"
            ? "aspect-[9/16] max-w-[300px] mx-auto"
            : "aspect-video"
        }`}
      >
        <iframe
          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(socialMediaLink)}${
            aspectRatio === "9:16" ? "?autoplay=0&mute=1" : ""
          }`}
          title={
            aspectRatio === "9:16"
              ? "YouTube Shorts player"
              : "YouTube video player"
          }
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        ></iframe>
      </div>
      {aspectRatio === "9:16" && (
        <p className="text-xs text-muted-foreground text-center">
          Optimized for YouTube Shorts (9:16 aspect ratio)
        </p>
      )}
    </div>
  );
}
