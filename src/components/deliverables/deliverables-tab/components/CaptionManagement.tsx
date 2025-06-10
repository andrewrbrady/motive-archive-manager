import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, ExternalLink } from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import PlatformIcon from "./PlatformIcon";

interface CaptionManagementProps {
  deliverable: Deliverable;
  linkedCaptions: any[];
  loadingCaptions: boolean;
  onRefresh: () => void;
  api: any;
}

export default function CaptionManagement({
  deliverable,
  linkedCaptions,
  loadingCaptions,
  onRefresh,
  api,
}: CaptionManagementProps) {
  // Caption management state
  const [isEditingCaptions, setIsEditingCaptions] = useState(false);
  const [availableCaptions, setAvailableCaptions] = useState<any[]>([]);
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected IDs when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setSelectedCaptionIds((deliverable as any).caption_ids || []);
    }
  }, [deliverable]);

  // Fetch available captions when editing mode is enabled
  useEffect(() => {
    if (isEditingCaptions && api) {
      const fetchCaptions = async () => {
        setCaptionsLoading(true);
        try {
          const captions = await api.get("captions?limit=100");
          setAvailableCaptions(Array.isArray(captions) ? captions : []);
        } catch (error) {
          console.error("Error fetching captions:", error);
          setAvailableCaptions([]);
        } finally {
          setCaptionsLoading(false);
        }
      };
      fetchCaptions();
    }
  }, [isEditingCaptions, api]);

  // Function to save caption references
  const handleSaveCaptions = async () => {
    if (!deliverable || !api) return;

    setIsSaving(true);
    try {
      await api.put(`deliverables/${deliverable._id}`, {
        gallery_ids: (deliverable as any).gallery_ids || [],
        caption_ids: selectedCaptionIds,
      });

      // Update the deliverable object to trigger UI refresh
      Object.assign(deliverable, {
        ...deliverable,
        caption_ids: selectedCaptionIds,
      });

      // Refresh the parent data
      onRefresh();
      setIsEditingCaptions(false);

      toast.success("Captions updated successfully");
    } catch (error) {
      console.error("Error updating captions:", error);
      toast.error("Failed to update captions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelCaptions = () => {
    setSelectedCaptionIds((deliverable as any)?.caption_ids || []);
    setIsEditingCaptions(false);
  };

  return (
    <div className="space-y-4 p-4 bg-transparent border border-border/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Captions
          {linkedCaptions.length > 0 && ` (${linkedCaptions.length})`}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditingCaptions(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Manage
        </Button>
      </div>

      {isEditingCaptions && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Captions
            </label>
            <MultiSelect
              value={selectedCaptionIds.map((id) => {
                const caption = availableCaptions.find(
                  (c: any) => c._id === id
                );
                return caption
                  ? {
                      label: `${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                      value: caption._id,
                      icon: caption.platform,
                    }
                  : { label: id, value: id };
              })}
              onChange={(selected) =>
                setSelectedCaptionIds(selected.map((s) => s.value))
              }
              options={
                captionsLoading
                  ? []
                  : availableCaptions?.map((caption: any) => ({
                      label: `${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                      value: caption._id,
                      icon: caption.platform,
                    })) || []
              }
              placeholder={
                captionsLoading ? "Loading captions..." : "Select captions"
              }
              className="text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border/30">
            <Button onClick={handleSaveCaptions} disabled={isSaving} size="sm">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelCaptions}
              disabled={isSaving}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isEditingCaptions && (
        <>
          {loadingCaptions ? (
            <div className="text-sm text-muted-foreground">
              Loading captions...
            </div>
          ) : linkedCaptions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No captions linked
            </div>
          ) : (
            <div className="space-y-3">
              {linkedCaptions.map((caption, index) => (
                <div
                  key={caption._id || index}
                  className="p-4 bg-transparent border border-border/20 rounded-lg relative"
                >
                  <PlatformIcon platform={caption.platform} />
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-8">
                      {/* Fuller caption text with rich text support */}
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {caption.caption_text || "No caption text"}
                      </div>
                      {caption.hashtags && caption.hashtags.length > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {caption.hashtags
                            .map((tag: string) => `#${tag}`)
                            .join(" ")}
                        </p>
                      )}
                    </div>
                    {caption._id && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/captions/${caption._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
