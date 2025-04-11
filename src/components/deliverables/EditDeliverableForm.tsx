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
import UserSelector from "@/components/users/UserSelector";

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
}

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
}: EditDeliverableFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(deliverable.title);
  const [platform, setPlatform] = useState<Platform>(deliverable.platform);
  const [type, setType] = useState<DeliverableType>(deliverable.type);
  const [duration, setDuration] = useState(deliverable.duration);
  const [aspectRatio, setAspectRatio] = useState(deliverable.aspect_ratio);
  const [editorId, setEditorId] = useState<string | null>(
    deliverable.firebase_uid || null
  );
  const [editorName, setEditorName] = useState(deliverable.editor || "");

  // Helper function to safely format dates
  const safeFormatDate = (date: any): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return format(d, "yyyy-MM-dd");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const [editDeadline, setEditDeadline] = useState(
    safeFormatDate(deliverable.edit_deadline)
  );
  const [releaseDate, setReleaseDate] = useState(
    safeFormatDate(deliverable.release_date)
  );

  // Reset form data when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setTitle(deliverable.title);
      setPlatform(deliverable.platform);
      setType(deliverable.type);
      setDuration(deliverable.duration);
      setAspectRatio(deliverable.aspect_ratio);
      setEditorId(deliverable.firebase_uid || null);
      setEditorName(deliverable.editor || "");
      setEditDeadline(safeFormatDate(deliverable.edit_deadline));
      setReleaseDate(safeFormatDate(deliverable.release_date));
    }
  }, [deliverable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !platform || !type || !editDeadline || !releaseDate) {
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
            editor: editorName,
            firebase_uid: editorId,
            edit_deadline: new Date(editDeadline).toISOString(),
            release_date: new Date(releaseDate).toISOString(),
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
                <SelectItem value="Still">Still</SelectItem>
                <SelectItem value="Graphic">Graphic</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="walkthrough">Walkthrough</SelectItem>
                <SelectItem value="highlights">Highlights</SelectItem>
                <SelectItem value="Marketing Email">Marketing Email</SelectItem>
                <SelectItem value="Blog">Blog</SelectItem>
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
            <UserSelector
              value={editorId}
              onChange={setEditorId}
              onUserInfoRetrieved={(username) => {
                if (username !== null) {
                  setEditorName(username);
                } else {
                  setEditorName("");
                }
              }}
              label={undefined} // Already have a label above
              placeholder="Select creative"
              disabled={isLoading}
              editorName={editorName}
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
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
