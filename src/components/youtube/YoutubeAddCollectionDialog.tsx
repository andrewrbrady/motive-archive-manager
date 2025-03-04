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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X } from "lucide-react";

interface YoutubeVideo {
  _id: string;
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url?: string;
  duration?: string;
}

interface YoutubeAddCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function YoutubeAddCollectionDialog({
  open,
  onOpenChange,
}: YoutubeAddCollectionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchVideos();
    }
  }, [open]);

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch("/api/youtube/videos");
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast({
        title: "Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedVideos.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one video",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/youtube/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          video_ids: selectedVideos,
          is_featured: isFeatured,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create collection");
      }

      toast({
        title: "Success",
        description: "Collection created successfully",
      });

      // Reset form and close dialog
      setName("");
      setDescription("");
      setTags("");
      setIsFeatured(false);
      setSelectedVideos([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create collection",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const removeVideo = (videoId: string) => {
    setSelectedVideos((prev) => prev.filter((id) => id !== videoId));
  };

  const getVideoTitle = (videoId: string) => {
    const video = videos.find((v) => v.video_id === videoId);
    return video ? video.title : "Unknown Video";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create YouTube Collection</DialogTitle>
          <DialogDescription>
            Create a new collection of YouTube videos for easy organization and
            sharing.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <div className="grid gap-4 py-4 flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Collection"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g. tutorials, favorites, coding"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A collection of my favorite videos about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
                disabled={isSubmitting}
              />
              <Label htmlFor="featured" className="cursor-pointer">
                Feature this collection
              </Label>
            </div>
            <div className="grid gap-2 flex-1 overflow-hidden">
              <Label>Selected Videos ({selectedVideos.length})</Label>
              <div className="border rounded-md p-2 h-20 overflow-y-auto">
                {selectedVideos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No videos selected
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedVideos.map((videoId) => (
                      <Badge
                        key={videoId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {getVideoTitle(videoId).substring(0, 20)}
                        {getVideoTitle(videoId).length > 20 ? "..." : ""}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeVideo(videoId)}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Label>Available Videos</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {loadingVideos ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No videos available. Add videos first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {videos.map((video) => (
                      <div
                        key={video.video_id}
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => toggleVideoSelection(video.video_id)}
                      >
                        <Checkbox
                          checked={selectedVideos.includes(video.video_id)}
                          onCheckedChange={() =>
                            toggleVideoSelection(video.video_id)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {video.channel_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
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
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Create Collection"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
