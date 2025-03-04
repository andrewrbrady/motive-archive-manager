"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, Star, ThumbsUp, Video } from "lucide-react";

interface YoutubeVideo {
  _id: string;
  video_id: string;
  title: string;
  description: string;
  channel_id: string;
  channel_name: string;
  published_at: string;
  thumbnail_url: string;
  duration: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  has_transcript: boolean;
  tags: string[];
}

export default function YoutubeVideoList() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/youtube/videos");

        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.statusText}`);
        }

        const data = await response.json();
        setVideos(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const toggleFeatured = async (videoId: string) => {
    try {
      const response = await fetch("/api/youtube/videos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: videoId,
          action: "feature",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update video: ${response.statusText}`);
      }

      // Update the videos list
      setVideos((prevVideos) =>
        prevVideos.map((video) =>
          video.video_id === videoId
            ? { ...video, is_featured: !video.is_featured }
            : video
        )
      );
    } catch (err) {
      console.error("Error updating video:", err);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle>
                <Skeleton className="h-6 w-full" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-4" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (videos.length === 0) {
    return <p className="text-center py-8">No videos found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <Card key={video._id} className="overflow-hidden">
          <Link
            href={`/market/youtube/video/${video.video_id}`}
            className="block"
          >
            <div className="aspect-video relative">
              <img
                src={
                  video.thumbnail_url ||
                  `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`
                }
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </div>
              {video.is_featured && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-yellow-500">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}
              {video.has_transcript && (
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="outline"
                    className="bg-black bg-opacity-70 border-gray-500"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Transcript
                  </Badge>
                </div>
              )}
            </div>
          </Link>
          <CardHeader className="pb-2">
            <Link
              href={`/market/youtube/video/${video.video_id}`}
              className="block"
            >
              <CardTitle className="text-base line-clamp-2 hover:text-blue-500 transition-colors">
                {video.title}
              </CardTitle>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{video.channel_name}</Badge>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(video.published_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center">
                <ThumbsUp className="h-3 w-3 mr-1" />
                {video.like_count.toLocaleString()}
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFeatured(video.video_id);
                }}
              >
                {video.is_featured ? "Unfeature" : "Feature"}
              </Button>
              <Link
                href={`/market/youtube/video/${video.video_id}`}
                className="ml-2"
              >
                <Button variant="default" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  View
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
