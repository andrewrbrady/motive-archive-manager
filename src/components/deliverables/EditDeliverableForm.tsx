"use client";

import { useState, useEffect } from "react";
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
import { Pencil } from "lucide-react";
import { toast } from "react-hot-toast";
import { Deliverable, Platform, DeliverableType } from "@/types/deliverable";
import { format } from "date-fns";

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
}

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
}: EditDeliverableFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatives, setCreatives] = useState<User[]>([]);
  const [title, setTitle] = useState(deliverable.title);
  const [platform, setPlatform] = useState<Platform>(deliverable.platform);
  const [type, setType] = useState<DeliverableType>(deliverable.type);
  const [duration, setDuration] = useState(deliverable.duration);
  const [aspectRatio, setAspectRatio] = useState(deliverable.aspect_ratio);
  const [editor, setEditor] = useState(deliverable.editor);
  const [editDeadline, setEditDeadline] = useState(
    format(new Date(deliverable.edit_deadline), "yyyy-MM-dd")
  );
  const [releaseDate, setReleaseDate] = useState(
    format(new Date(deliverable.release_date), "yyyy-MM-dd")
  );

  useEffect(() => {
    const fetchCreatives = async () => {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setCreatives(
            data.filter(
              (user: User) =>
                user.status === "active" && user.creativeRoles.length > 0
            )
          );
        }
      } catch (error) {
        console.error("Error fetching creatives:", error);
      }
    };

    if (isOpen) {
      fetchCreatives();
    }
  }, [isOpen]);

  const getRelevantCreatives = (deliverableType: DeliverableType) => {
    return creatives.filter((user) => {
      if (deliverableType === "Photo Gallery") {
        return user.creativeRoles.includes("photographer");
      }
      return user.creativeRoles.includes("video_editor");
    });
  };

  const relevantCreatives = getRelevantCreatives(type);

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
      const response = await fetch(
        `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            platform,
            type,
            duration: type === "Photo Gallery" ? 0 : duration,
            aspect_ratio: aspectRatio,
            editor,
            edit_deadline: format(
              new Date(editDeadline),
              "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
            ),
            release_date: format(
              new Date(releaseDate),
              "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
            ),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update deliverable");
      }

      toast.success("Deliverable updated successfully");
      onDeliverableUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating deliverable:", error);
      toast.error("Failed to update deliverable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Deliverable</DialogTitle>
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
                <SelectItem value="Instagram Post">Instagram Post</SelectItem>
                <SelectItem value="Instagram Story">Instagram Story</SelectItem>
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
              onValueChange={(value: DeliverableType) => {
                setType(value);
                setEditor(""); // Reset editor when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
                <SelectItem value="Video Gallery">Video Gallery</SelectItem>
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
              value={type === "Photo Gallery" ? "N/A" : duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min={0}
              required={type !== "Photo Gallery"}
              disabled={type === "Photo Gallery"}
              placeholder={type === "Photo Gallery" ? "N/A" : undefined}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="aspectRatio" className="text-sm font-medium">
              Aspect Ratio
            </label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="4:5">4:5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="editor" className="text-sm font-medium">
              Creative
            </label>
            <Select
              value={editor}
              onValueChange={(value) => setEditor(value)}
              disabled={!type}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={type ? "Select creative" : "Select type first"}
                />
              </SelectTrigger>
              <SelectContent>
                {relevantCreatives.map((creative) => (
                  <SelectItem key={creative._id} value={creative.name}>
                    {creative.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
