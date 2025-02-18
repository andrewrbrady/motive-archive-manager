"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { Platform, DeliverableType } from "@/types/deliverable";

interface NewDeliverableFormProps {
  carId?: string;
  onDeliverableCreated: () => void;
}

export default function NewDeliverableForm({
  carId,
  onDeliverableCreated,
}: NewDeliverableFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>();
  const [type, setType] = useState<DeliverableType>();
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("");
  const [editor, setEditor] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const resetForm = () => {
    setTitle("");
    setPlatform(undefined);
    setType(undefined);
    setDuration(0);
    setAspectRatio("");
    setEditor("");
    setEditDeadline("");
    setReleaseDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title ||
      !platform ||
      !type ||
      !editor ||
      !editDeadline ||
      !releaseDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}/deliverables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          platform,
          type,
          duration,
          aspect_ratio: aspectRatio,
          editor,
          edit_deadline: new Date(editDeadline),
          release_date: new Date(releaseDate),
          car_id: carId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create deliverable");
      }

      toast.success("Deliverable created successfully");
      onDeliverableCreated();
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating deliverable:", error);
      toast.error("Failed to create deliverable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Deliverable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deliverable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Platform
            </label>
            <Select
              value={platform}
              onValueChange={(value: Platform) => setPlatform(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Bring a Trailer">Bring a Trailer</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value: DeliverableType) => setType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="walkthrough">Walkthrough</SelectItem>
                <SelectItem value="highlights">Highlights</SelectItem>
                <SelectItem value="photo_gallery">Photo Gallery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duration (seconds)
            </label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min={0}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="aspectRatio" className="text-sm font-medium">
              Aspect Ratio
            </label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue placeholder="Select aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="editor" className="text-sm font-medium">
              Editor
            </label>
            <Input
              id="editor"
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              placeholder="Enter editor name"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="editDeadline" className="text-sm font-medium">
              Edit Deadline
            </label>
            <Input
              id="editDeadline"
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="releaseDate" className="text-sm font-medium">
              Release Date
            </label>
            <Input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
