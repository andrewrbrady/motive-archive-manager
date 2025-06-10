import React, { useState, useEffect } from "react";
import {
  Link,
  Share2,
  Cloud,
  Play,
  Download,
  Edit,
  Plus,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Deliverable } from "@/types/deliverable";
import { isYouTubeUrl } from "../utils/youtube";
import { toast } from "sonner";

interface LinksSectionProps {
  deliverable: Deliverable;
  onUpdate?: (updates: Partial<Deliverable>) => Promise<void>;
}

export default function LinksSection({
  deliverable,
  onUpdate,
}: LinksSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dropboxLink, setDropboxLink] = useState(
    deliverable.dropbox_link || ""
  );
  const [socialMediaLink, setSocialMediaLink] = useState(
    deliverable.social_media_link || ""
  );
  const [publishingUrl, setPublishingUrl] = useState(
    deliverable.publishing_url || ""
  );

  // Reset state when deliverable changes
  useEffect(() => {
    setDropboxLink(deliverable.dropbox_link || "");
    setSocialMediaLink(deliverable.social_media_link || "");
    setPublishingUrl(deliverable.publishing_url || "");
    setIsEditing(false);
  }, [
    deliverable._id,
    deliverable.dropbox_link,
    deliverable.social_media_link,
    deliverable.publishing_url,
  ]);

  // Check if any links exist
  const hasLinks =
    deliverable.dropbox_link ||
    deliverable.social_media_link ||
    deliverable.publishing_url;

  const handleSave = async () => {
    if (!onUpdate) return;

    setIsSaving(true);
    try {
      await onUpdate({
        dropbox_link: dropboxLink.trim() || undefined,
        social_media_link: socialMediaLink.trim() || undefined,
        publishing_url: publishingUrl.trim() || undefined,
      });

      setIsEditing(false);
      toast.success("Links updated successfully");
    } catch (error) {
      console.error("Error updating links:", error);
      toast.error("Failed to update links");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDropboxLink(deliverable.dropbox_link || "");
    setSocialMediaLink(deliverable.social_media_link || "");
    setPublishingUrl(deliverable.publishing_url || "");
    setIsEditing(false);
  };

  // InfoRow component for consistent display
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    href,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | React.ReactNode;
    href?: string;
  }) => (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 w-6" />
      <div className="text-sm font-medium text-foreground min-w-[120px] flex-shrink-0">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-primary/80 break-all flex-1"
        >
          {value}
        </a>
      ) : (
        <div className="text-sm text-muted-foreground break-words flex-1">
          {value}
        </div>
      )}
    </div>
  );

  // InputRow component for editing
  const InputRow = ({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 w-6" />
      <div className="text-sm font-medium text-foreground min-w-[120px] flex-shrink-0">
        {label}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm flex-1"
        disabled={isSaving}
      />
    </div>
  );

  return (
    <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Link className="h-4 w-4" />
          Links
        </h3>

        {onUpdate && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  variant="default"
                >
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  size="sm"
                  variant="outline"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                {hasLinks ? (
                  <>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Links
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {!hasLinks && !isEditing && (
        <div className="text-sm text-muted-foreground py-2">
          No links added yet.
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <InputRow
            icon={Download}
            label="Dropbox"
            value={dropboxLink}
            onChange={setDropboxLink}
            placeholder="Enter Dropbox link"
          />
          <InputRow
            icon={Share2}
            label="Social Media"
            value={socialMediaLink}
            onChange={setSocialMediaLink}
            placeholder="Enter social media link"
          />
          <InputRow
            icon={Link}
            label="Publishing URL"
            value={publishingUrl}
            onChange={setPublishingUrl}
            placeholder="Enter publishing URL"
          />
        </div>
      ) : hasLinks ? (
        <div className="space-y-0">
          {deliverable.dropbox_link && (
            <InfoRow
              icon={Download}
              label="Dropbox"
              value="View in Dropbox"
              href={deliverable.dropbox_link}
            />
          )}

          {deliverable.social_media_link && (
            <InfoRow
              icon={isYouTubeUrl(deliverable.social_media_link) ? Play : Share2}
              label={
                isYouTubeUrl(deliverable.social_media_link)
                  ? "YouTube"
                  : "Social Media"
              }
              value={
                isYouTubeUrl(deliverable.social_media_link)
                  ? "Watch on YouTube"
                  : "View Post"
              }
              href={deliverable.social_media_link}
            />
          )}

          {deliverable.publishing_url && (
            <InfoRow
              icon={Link}
              label="Publishing URL"
              value="View Published Content"
              href={deliverable.publishing_url}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
