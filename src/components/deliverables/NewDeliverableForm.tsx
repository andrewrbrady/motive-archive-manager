import { useState } from "react";
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
import { PlusIcon } from "@radix-ui/react-icons";
import {
  Platform,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable";
import { toast } from "react-hot-toast";

interface NewDeliverableFormProps {
  carId: string;
  onDeliverableCreated: () => void;
}

export default function NewDeliverableForm({
  carId,
  onDeliverableCreated,
}: NewDeliverableFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    platform: "" as Platform,
    type: "" as DeliverableType,
    duration: 0,
    editor: "",
    aspect_ratio: "16:9",
    status: "not_started" as DeliverableStatus,
    edit_deadline: "",
    release_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cars/${carId}/deliverables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create deliverable");
      }

      toast.success("Deliverable created successfully");
      onDeliverableCreated();
      setOpen(false);
      setFormData({
        title: "",
        platform: "" as Platform,
        type: "" as DeliverableType,
        duration: 0,
        editor: "",
        aspect_ratio: "16:9",
        status: "not_started",
        edit_deadline: "",
        release_date: "",
      });
    } catch (error) {
      console.error("Error creating deliverable:", error);
      toast.error("Failed to create deliverable");
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
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Deliverable
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Deliverable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.edit_deadline}
              onChange={(e) => handleChange("edit_deadline", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="release_date">Release Date</Label>
            <Input
              id="release_date"
              type="date"
              value={formData.release_date}
              onChange={(e) => handleChange("release_date", e.target.value)}
              required
            />
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
              {isSubmitting ? "Creating..." : "Create Deliverable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
