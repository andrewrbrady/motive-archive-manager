import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import {
  Deliverable,
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";
import { toast } from "react-hot-toast";

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
}

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
}: EditDeliverableFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Deliverable>>({
    title: deliverable.title,
    description: deliverable.description,
    platform: deliverable.platform,
    type: deliverable.type,
    duration: deliverable.duration,
    editor: deliverable.editor,
    aspect_ratio: deliverable.aspect_ratio,
    status: deliverable.status,
    edit_deadline: deliverable.edit_deadline,
    release_date: deliverable.release_date,
    target_audience: deliverable.target_audience,
    music_track: deliverable.music_track,
    priority_level: deliverable.priority_level,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            updated_at: new Date(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update deliverable");
      }

      toast.success("Deliverable updated successfully");
      onDeliverableUpdated();
      setOpen(false);
    } catch (error) {
      console.error("Error updating deliverable:", error);
      toast.error("Failed to update deliverable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Deliverable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => handleChange("platform", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                  required
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formData.duration}
                  onChange={(e) =>
                    handleChange("duration", parseInt(e.target.value))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editor">Editor</Label>
                <Input
                  id="editor"
                  value={formData.editor}
                  onChange={(e) => handleChange("editor", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aspect_ratio">Aspect Ratio</Label>
                <Select
                  value={formData.aspect_ratio}
                  onValueChange={(value) => handleChange("aspect_ratio", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_deadline">Edit Deadline</Label>
                <Input
                  id="edit_deadline"
                  type="date"
                  value={
                    formData.edit_deadline
                      ? new Date(formData.edit_deadline)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange("edit_deadline", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={
                    formData.release_date
                      ? new Date(formData.release_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleChange("release_date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audience</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) =>
                    handleChange("target_audience", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="music_track">Music Track</Label>
                <Input
                  id="music_track"
                  value={formData.music_track}
                  onChange={(e) => handleChange("music_track", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority Level (1-5)</Label>
                <Input
                  id="priority_level"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.priority_level}
                  onChange={(e) =>
                    handleChange("priority_level", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Deliverable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
