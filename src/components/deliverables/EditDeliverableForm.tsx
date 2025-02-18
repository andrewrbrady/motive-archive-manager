import { useState, useEffect } from "react";
import { Deliverable } from "@/types/deliverable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Pencil, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
}

const ASPECT_RATIOS = ["16:9", "9:16", "4:3", "1:1"] as const;

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
}: EditDeliverableFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Deliverable>>({
    title: deliverable.title,
    description: deliverable.description,
    platform: deliverable.platform,
    type: deliverable.type,
    duration: deliverable.duration,
    actual_duration: deliverable.actual_duration,
    editor: deliverable.editor,
    aspect_ratio: deliverable.aspect_ratio,
    status: deliverable.status,
    edit_deadline: deliverable.edit_deadline,
    release_date: deliverable.release_date,
    target_audience: deliverable.target_audience,
    music_track: deliverable.music_track,
    thumbnail_url: deliverable.thumbnail_url,
    tags: deliverable.tags || [],
    publishing_url: deliverable.publishing_url,
    assets_location: deliverable.assets_location,
    priority_level: deliverable.priority_level,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
        // Initially filter based on current type
        const relevantUsers = data.filter(
          (user: User) =>
            ((formData.type === "photo_gallery" &&
              user.creativeRoles.includes("photographer")) ||
              (formData.type !== "photo_gallery" &&
                user.creativeRoles.includes("video_editor"))) &&
            user.status !== "inactive"
        );
        setFilteredUsers(relevantUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, [formData.type]);

  // Update filtered users when type changes
  useEffect(() => {
    if (formData.type === "photo_gallery") {
      const photographers = users.filter(
        (user) =>
          user.creativeRoles.includes("photographer") &&
          user.status !== "inactive"
      );
      setFilteredUsers(photographers);
    } else {
      const editors = users.filter(
        (user) =>
          user.creativeRoles.includes("video_editor") &&
          user.status !== "inactive"
      );
      setFilteredUsers(editors);
    }
  }, [formData.type, users]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.platform) {
      newErrors.platform = "Platform is required";
    }

    if (!formData.type) {
      newErrors.type = "Type is required";
    }

    if (!formData.duration || formData.duration < 0) {
      newErrors.duration = "Valid duration is required";
    }

    if (!formData.editor) {
      newErrors.editor = "Editor is required";
    }

    if (!formData.aspect_ratio) {
      newErrors.aspect_ratio = "Aspect ratio is required";
    }

    if (!formData.edit_deadline) {
      newErrors.edit_deadline = "Edit deadline is required";
    }

    if (!formData.release_date) {
      newErrors.release_date = "Release date is required";
    }

    if (
      formData.priority_level &&
      (formData.priority_level < 1 || formData.priority_level > 5)
    ) {
      newErrors.priority_level = "Priority must be between 1 and 5";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

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

  const handleChange = (field: string, value: string | number | string[]) => {
    if (field === "type" && value === "photo_gallery") {
      setFormData((prev) => ({ ...prev, [field]: value, duration: 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTagsChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (newTag && !formData.tags?.includes(newTag)) {
        handleChange("tags", [...(formData.tags || []), newTag]);
      }
      e.currentTarget.value = "";
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange(
      "tags",
      (formData.tags || []).filter((tag) => tag !== tagToRemove)
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deliverable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title
                  {errors.title && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">
                  Platform
                  {errors.platform && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => handleChange("platform", value)}
                >
                  <SelectTrigger
                    className={`w-[180px] ${
                      errors.platform ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram Reels">
                      Instagram Reels
                    </SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="YouTube Shorts">
                      YouTube Shorts
                    </SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Bring a Trailer">
                      Bring a Trailer
                    </SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.platform && (
                  <p className="text-red-500 text-sm">{errors.platform}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Type
                  {errors.type && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger
                    className={errors.type ? "border-red-500" : ""}
                  >
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
                {errors.type && (
                  <p className="text-red-500 text-sm">{errors.type}</p>
                )}
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Technical Details</h3>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              {formData.type !== "photo_gallery" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration (seconds)
                    {errors.duration && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) =>
                      handleChange("duration", parseInt(e.target.value))
                    }
                    className={errors.duration ? "border-red-500" : ""}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm">{errors.duration}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="actual_duration">
                  Actual Duration (seconds)
                </Label>
                <Input
                  id="actual_duration"
                  type="number"
                  min="0"
                  value={formData.actual_duration}
                  onChange={(e) =>
                    handleChange("actual_duration", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aspect_ratio">
                  Aspect Ratio
                  {errors.aspect_ratio && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Select
                  value={formData.aspect_ratio}
                  onValueChange={(value) => handleChange("aspect_ratio", value)}
                >
                  <SelectTrigger
                    className={errors.aspect_ratio ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.aspect_ratio && (
                  <p className="text-red-500 text-sm">{errors.aspect_ratio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Production Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Production Details</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editor">
                  Editor
                  {errors.editor && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Select
                  value={formData.editor}
                  onValueChange={(value) => handleChange("editor", value)}
                >
                  <SelectTrigger
                    className={errors.editor ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select editor" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.map((user) => (
                      <SelectItem key={user._id} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.editor && (
                  <p className="text-red-500 text-sm">{errors.editor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
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
                <Label htmlFor="edit_deadline">
                  Edit Deadline
                  {errors.edit_deadline && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
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
                  className={errors.edit_deadline ? "border-red-500" : ""}
                />
                {errors.edit_deadline && (
                  <p className="text-red-500 text-sm">{errors.edit_deadline}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">
                  Release Date
                  {errors.release_date && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
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
                  className={errors.release_date ? "border-red-500" : ""}
                />
                {errors.release_date && (
                  <p className="text-red-500 text-sm">{errors.release_date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content Details</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="tags">
                  Tags
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 ml-1 inline" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Press Enter to add a tag</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  onKeyDown={handleTagsChange}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={(e) =>
                    handleChange("thumbnail_url", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority_level">
                  Priority Level (1-5)
                  {errors.priority_level && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Input
                  id="priority_level"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.priority_level}
                  onChange={(e) =>
                    handleChange("priority_level", parseInt(e.target.value))
                  }
                  className={errors.priority_level ? "border-red-500" : ""}
                />
                {errors.priority_level && (
                  <p className="text-red-500 text-sm">
                    {errors.priority_level}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishing_url">Publishing URL</Label>
                <Input
                  id="publishing_url"
                  value={formData.publishing_url}
                  onChange={(e) =>
                    handleChange("publishing_url", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assets_location">Assets Location</Label>
                <Input
                  id="assets_location"
                  value={formData.assets_location}
                  onChange={(e) =>
                    handleChange("assets_location", e.target.value)
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
