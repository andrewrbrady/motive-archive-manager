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
import { useUsers } from "@/hooks/useUsers";

interface EditDeliverableFormProps {
  deliverable: Deliverable;
  onDeliverableUpdated: () => void;
}

export default function EditDeliverableForm({
  deliverable,
  onDeliverableUpdated,
}: EditDeliverableFormProps) {
  const { data: users = [] } = useUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(deliverable.title);
  const [platform, setPlatform] = useState<Platform>(deliverable.platform);
  const [type, setType] = useState<DeliverableType>(deliverable.type);
  const [duration, setDuration] = useState(deliverable.duration);
  const [aspectRatio, setAspectRatio] = useState(deliverable.aspect_ratio);

  // Helper function to find user UID from name (for legacy data)
  const findUserUidFromName = (editorName: string): string | null => {
    if (!editorName || !users.length) return null;
    const user = users.find((u) => u.name === editorName);
    return user ? user.uid : null;
  };

  // Initialize editor data - try firebase_uid first, then try to find UID from name
  const getInitialEditorId = (): string | null => {
    if (deliverable.firebase_uid) {
      return deliverable.firebase_uid;
    }
    if (deliverable.editor) {
      return findUserUidFromName(deliverable.editor);
    }
    return null;
  };

  const [editorId, setEditorId] = useState<string | null>(getInitialEditorId());
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
  const [dropboxLink, setDropboxLink] = useState(
    deliverable.dropbox_link || ""
  );
  const [socialMediaLink, setSocialMediaLink] = useState(
    deliverable.social_media_link || ""
  );

  // Reset form data when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setTitle(deliverable.title);
      setPlatform(deliverable.platform);
      setType(deliverable.type);
      setDuration(deliverable.duration);
      setAspectRatio(deliverable.aspect_ratio);
      setEditorId(getInitialEditorId());
      setEditorName(deliverable.editor || "");
      setEditDeadline(safeFormatDate(deliverable.edit_deadline));
      setReleaseDate(safeFormatDate(deliverable.release_date));
      setDropboxLink(deliverable.dropbox_link || "");
      setSocialMediaLink(deliverable.social_media_link || "");
    }
  }, [deliverable, users]);

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
            dropbox_link: dropboxLink,
            social_media_link: socialMediaLink,
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Edit Deliverable
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information Section */}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="platform"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Platform
                    </label>
                    <Select
                      value={platform}
                      onValueChange={(value: Platform) => setPlatform(value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram Reels">
                          Instagram Reels
                        </SelectItem>
                        <SelectItem value="Instagram Post">
                          Instagram Post
                        </SelectItem>
                        <SelectItem value="Instagram Story">
                          Instagram Story
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
                      onValueChange={(value: DeliverableType) => setType(value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
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
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      required={type !== "Photo Gallery"}
                      disabled={type === "Photo Gallery"}
                      placeholder={type === "Photo Gallery" ? "N/A" : undefined}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="aspectRatio"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Aspect Ratio
                    </label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="text-sm">
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
                    <Input
                      id="editDeadline"
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      required
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
                    <Input
                      id="releaseDate"
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      required
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
