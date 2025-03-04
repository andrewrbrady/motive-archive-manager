"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import YoutubeTranscriptPanel from "@/components/youtube/YoutubeTranscriptPanel";
import {
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  ThumbsUp,
  Video,
} from "lucide-react";

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
  transcript_id?: string;
  tags: string[];
}

interface YoutubeVideoDetailProps {
  videoId: string;
}

export default function YoutubeVideoDetail({
  videoId,
}: YoutubeVideoDetailProps) {
  const [video, setVideo] = useState<YoutubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch the video from your API
        // For now, we'll create a placeholder video
        const response = await fetch(`/api/youtube/videos?video_id=${videoId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }

        const data = await response.json();
        setVideo(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Error fetching video:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-3/4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-64 w-full mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-8 w-1/2 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !video) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error || "Failed to load video details"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {video.title}
          </div>
          <div className="flex items-center gap-2">
            {video.is_featured && <Badge>Featured</Badge>}
            {video.has_transcript && (
              <Badge variant="outline">Has Transcript</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="info"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="info">Video Info</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="aspect-video mb-4 overflow-hidden rounded-md">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${video.video_id}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {video.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {formatNumber(video.view_count)} views
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    {formatNumber(video.like_count)} likes
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {formatNumber(video.comment_count)} comments
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {video.duration}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">{video.channel_name}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(video.published_at).toLocaleDateString()}
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap">
                  {video.description}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="justify-start">
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {video.is_featured
                      ? "Remove from Featured"
                      : "Add to Featured"}
                  </Button>

                  {!video.has_transcript && (
                    <Button variant="outline" className="justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Request Transcript
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transcript">
            <YoutubeTranscriptPanel
              videoId={video.video_id}
              videoTitle={video.title}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
