"use client";

import React, { useState, useEffect } from "react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { Pencil } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Deliverable,
  Platform,
  DeliverableType,
  DeliverablePlatform,
} from "@/types/deliverable";
import { format } from "date-fns";
import UserSelector from "@/components/users/UserSelector";
import { useEditors } from "@/hooks/useEditors";
import { useAPI } from "@/hooks/useAPI";
import { FirestoreUser } from "@/types/firebase";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { usePlatforms } from "@/contexts/PlatformContext";

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
  onClose: () => void;
}

interface UpdateDeliverableData {
  title: string;
  platform?: Platform; // Keep for backward compatibility
  platforms?: string[]; // New field for multiple platform IDs
  type: DeliverableType;
  duration: number;
  aspect_ratio: string;
  editor: string;
  firebase_uid: string | null;
  edit_deadline: string;
  release_date: string;
  dropbox_link: string;
  social_media_link: string;
}

interface UpdateDeliverableResponse {
  success: boolean;
  error?: string;
}

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
  onClose,
}: EditDeliverableFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(deliverable.title);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    { label: string; value: string }[]
  >([]);
  const [type, setType] = useState<DeliverableType>(deliverable.type);
  const [duration, setDuration] = useState(deliverable.duration);
  const [aspectRatio, setAspectRatio] = useState(deliverable.aspect_ratio);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [dropboxLink, setDropboxLink] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");

  const { platforms: availablePlatforms, isLoading: platformsLoading } =
    usePlatforms();

  const api = useAPI();
  const { data: editors = [] } = useEditors();

  const [openSelects, setOpenSelects] = useState<{ [key: string]: boolean }>(
    {}
  );

  const safeFormatDate = (date: any): string => {
    if (!date) return "";

    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";

      // Format as YYYY-MM-DD for date input
      return d.toISOString().split("T")[0];
    } catch (error) {
      console.warn("Invalid date format:", date);
      return "";
    }
  };

  const findUserUidFromName = (editorName: string): string | null => {
    const user = editors.find((u: any) => u.name === editorName);
    return user ? user.uid : null;
  };

  useEffect(() => {
    setTitle(deliverable.title);
    setType(deliverable.type);
    setDuration(deliverable.duration);
    setAspectRatio(deliverable.aspect_ratio);

    let initialEditorId: string | null = null;
    if (deliverable.firebase_uid) {
      initialEditorId = deliverable.firebase_uid;
    } else if (deliverable.editor && editors.length) {
      const user = editors.find((u: any) => u.name === deliverable.editor);
      initialEditorId = user ? user.uid : null;
    }
    setEditorId(initialEditorId);

    setEditorName(deliverable.editor || "");
    setEditDeadline(safeFormatDate(deliverable.edit_deadline));
    setReleaseDate(safeFormatDate(deliverable.release_date));
    setDropboxLink(deliverable.dropbox_link || "");
    setSocialMediaLink(deliverable.social_media_link || "");
  }, [deliverable, editors]);

  // Separate useEffect for platform handling to avoid infinite loops
  useEffect(() => {
    if (availablePlatforms.length > 0) {
      if (deliverable.platforms && deliverable.platforms.length > 0) {
        const selectedPlatformOptions = deliverable.platforms
          .map((platformId) => {
            const platform = availablePlatforms.find(
              (p) => p._id === platformId
            );
            return platform
              ? { label: platform.name, value: platform._id }
              : null;
          })
          .filter(Boolean) as { label: string; value: string }[];
        setSelectedPlatforms(selectedPlatformOptions);
      } else if (deliverable.platform) {
        const platform = availablePlatforms.find(
          (p) => p.name === deliverable.platform
        );
        if (platform) {
          setSelectedPlatforms([{ label: platform.name, value: platform._id }]);
        }
      }
    }
  }, [availablePlatforms.length, deliverable.platforms, deliverable.platform]);

  if (!api) {
    return null;
  }

  const handleSelectOpenChange = (selectId: string, open: boolean) => {
    setOpenSelects((prev) => ({ ...prev, [selectId]: open }));
  };

  const isAnySelectOpen = Object.values(openSelects).some(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || title.trim() === "") {
      toast.error("Please enter a title");
      return;
    }

    setIsLoading(true);
    try {
      const updateData: UpdateDeliverableData = {
        title: title.trim(),
        platforms: selectedPlatforms.map((p) => p.value),
        type: type,
        duration: type === "Photo Gallery" ? 0 : duration || 0,
        aspect_ratio: aspectRatio || "",
        editor: editorName || "",
        firebase_uid: editorId,
        edit_deadline: editDeadline ? new Date(editDeadline).toISOString() : "",
        release_date: releaseDate ? new Date(releaseDate).toISOString() : "",
        dropbox_link: dropboxLink || "",
        social_media_link: socialMediaLink || "",
      };

      const response = await api.put<UpdateDeliverableResponse>(
        `cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        updateData
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to update deliverable");
      }

      toast.success("Deliverable updated successfully");
      onDeliverableUpdated();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error updating deliverable:", error);
      toast.error(error.message || "Failed to update deliverable");
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
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full"
        onEscapeKeyDown={(e) => isAnySelectOpen && e.preventDefault()}
        onPointerDownOutside={(e) => isAnySelectOpen && e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Edit Deliverable
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Basic Information
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="title"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Title
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title"
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="platforms"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Platforms
                  </label>
                  <MultiSelect
                    value={selectedPlatforms}
                    onChange={setSelectedPlatforms}
                    options={availablePlatforms.map((p) => ({
                      label: p.name,
                      value: p._id,
                    }))}
                    placeholder="Select platforms"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="type"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Type
                  </label>
                  <Select
                    value={type}
                    onValueChange={(value) => setType(value as DeliverableType)}
                    open={openSelects["type"]}
                    onOpenChange={(open) =>
                      handleSelectOpenChange("type", open)
                    }
                  >
                    <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Photo Gallery">
                        Photo Gallery
                      </SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="Mixed Gallery">
                        Mixed Gallery
                      </SelectItem>
                      <SelectItem value="Video Gallery">
                        Video Gallery
                      </SelectItem>
                      <SelectItem value="Still">Still</SelectItem>
                      <SelectItem value="Graphic">Graphic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="promo">Promo</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="walkthrough">Walkthrough</SelectItem>
                      <SelectItem value="highlights">Highlights</SelectItem>
                      <SelectItem value="Marketing Email">
                        Marketing Email
                      </SelectItem>
                      <SelectItem value="Blog">Blog</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="aspectRatio"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Aspect Ratio
                    </label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select aspect ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "16:9",
                          "9:16",
                          "1:1",
                          "4:5",
                          "5:4",
                          "3:2",
                          "2:3",
                          "custom",
                        ].map((ratio) => (
                          <SelectItem key={ratio} value={ratio}>
                            {ratio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="duration"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Duration (seconds)
                    </label>
                    <Input
                      id="duration"
                      type="number"
                      value={type === "Photo Gallery" ? "N/A" : duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      min={0}
                      disabled={type === "Photo Gallery"}
                      placeholder={type === "Photo Gallery" ? "N/A" : undefined}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment & Dates Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Assignment & Dates
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="editor"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
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
                    label={undefined}
                    placeholder="Select creative"
                    disabled={isLoading}
                    editorName={editorName}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="editDeadline"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Edit Deadline
                    </label>
                    <DateTimePicker
                      value={editDeadline}
                      onChange={(value) => setEditDeadline(value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="releaseDate"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Release Date
                    </label>
                    <DateTimePicker
                      value={releaseDate}
                      onChange={(value) => setReleaseDate(value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Links
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="dropboxLink"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Dropbox Link
                  </label>
                  <Input
                    id="dropboxLink"
                    value={dropboxLink}
                    onChange={(e) => setDropboxLink(e.target.value)}
                    placeholder="Enter Dropbox link"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="socialMediaLink"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Social Media Link
                  </label>
                  <Input
                    id="socialMediaLink"
                    value={socialMediaLink}
                    onChange={(e) => setSocialMediaLink(e.target.value)}
                    placeholder="Enter Social Media link"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Actions Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            size="sm"
            onClick={handleSubmit}
          >
            {isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
