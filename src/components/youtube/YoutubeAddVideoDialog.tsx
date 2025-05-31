"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { IYoutubeChannel } from "@/models/youtube_channel";
import { useAPI } from "@/hooks/useAPI";

interface YoutubeAddVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function YoutubeAddVideoDialog({
  open,
  onOpenChange,
}: YoutubeAddVideoDialogProps) {
  const [videoId, setVideoId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tags, setTags] = useState("");
  const [transcribe, setTranscribe] = useState(false);
  const [channels, setChannels] = useState<IYoutubeChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

  useEffect(() => {
    if (open) {
      fetchChannels();
    }
  }, [open, api]);

  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const data = (await api.get("youtube/channels")) as IYoutubeChannel[];
      setChannels(data);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoId) {
      toast({
        title: "Error",
        description: "Video ID is required",
        variant: "destructive",
      });
      return;
    }

    if (!channelId) {
      toast({
        title: "Error",
        description: "Please select a channel",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("youtube/videos", {
        video_id: videoId,
        channel_id: channelId,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        transcribe,
      });

      toast({
        title: "Success",
        description: "Video added successfully",
      });

      // Reset form and close dialog
      setVideoId("");
      setChannelId("");
      setTags("");
      setTranscribe(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add video",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add YouTube Video</DialogTitle>
          <DialogDescription>
            Enter the video ID to add a new YouTube video to your curated list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="video-id">Video ID</Label>
              <Input
                id="video-id"
                placeholder="e.g. dQw4w9WgXcQ"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                You can find the video ID in the URL of the YouTube video (e.g.,
                youtube.com/watch?v=VIDEO_ID).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={channelId}
                onValueChange={setChannelId}
                disabled={isSubmitting || loadingChannels}
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {loadingChannels ? (
                    <div className="flex items-center justify-center p-2">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No channels available. Add a channel first.
                    </div>
                  ) : (
                    channels.map((channel) => (
                      <SelectItem
                        key={channel.channel_id}
                        value={channel.channel_id}
                      >
                        {channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="e.g. tutorial, coding, javascript"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="transcribe"
                checked={transcribe}
                onCheckedChange={(checked) => setTranscribe(checked as boolean)}
                disabled={isSubmitting}
              />
              <Label htmlFor="transcribe" className="cursor-pointer">
                Request transcription
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : "Add Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
