import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Trash2,
  CheckCircle,
  Car,
  FileText,
  Youtube,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions } from "../types";
import { getStatusColor, getStatusText, getPillColor } from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";

import PlatformDisplay from "./PlatformDisplay";
import PlatformIcon from "./PlatformIcon";
import GalleryManagement from "./GalleryManagement";
import CaptionManagement from "./CaptionManagement";
import VideoPreview from "./VideoPreview";
import DetailsTimeline from "./DetailsTimeline";
import LinksSection from "./LinksSection";
import ThumbnailSelector from "./ThumbnailSelector";

interface DeliverableModalProps {
  deliverable: Deliverable | null;
  isOpen: boolean;
  onClose: () => void;
  actions: DeliverableActions;
  showCarInfo?: boolean;
  carInfo?: {
    make: string;
    model: string;
    year: number;
  };
}

export default function DeliverableModal({
  deliverable,
  isOpen,
  onClose,
  actions,
  showCarInfo = false,
  carInfo,
}: DeliverableModalProps) {
  const api = useAPI();
  const [linkedGalleries, setLinkedGalleries] = useState<any[]>([]);
  const [linkedCaptions, setLinkedCaptions] = useState<any[]>([]);
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [loadingCaptions, setLoadingCaptions] = useState(false);

  // Extract fetchLinkedContent function so it can be called after saving
  const fetchLinkedContent = React.useCallback(async () => {
    if (!deliverable || !api) return;

    // Fetch galleries
    if (
      (deliverable as any).gallery_ids &&
      (deliverable as any).gallery_ids.length > 0
    ) {
      setLoadingGalleries(true);
      try {
        const galleryPromises = (deliverable as any).gallery_ids.map(
          async (galleryId: string) => {
            try {
              const gallery = await api.get(`galleries/${galleryId}`);
              return gallery;
            } catch (error) {
              console.warn(`Failed to fetch gallery ${galleryId}:`, error);
              return null;
            }
          }
        );
        const galleries = await Promise.all(galleryPromises);
        setLinkedGalleries(galleries.filter(Boolean));
      } catch (error) {
        console.error("Error fetching galleries:", error);
      } finally {
        setLoadingGalleries(false);
      }
    } else {
      setLinkedGalleries([]);
    }

    // Fetch captions
    if (
      (deliverable as any).caption_ids &&
      (deliverable as any).caption_ids.length > 0
    ) {
      setLoadingCaptions(true);
      try {
        const captionPromises = (deliverable as any).caption_ids.map(
          async (captionId: string) => {
            try {
              const caption = await api.get(`captions/${captionId}`);
              return caption;
            } catch (error) {
              console.warn(`Failed to fetch caption ${captionId}:`, error);
              return null;
            }
          }
        );
        const captions = await Promise.all(captionPromises);
        setLinkedCaptions(captions.filter(Boolean));
      } catch (error) {
        console.error("Error fetching captions:", error);
      } finally {
        setLoadingCaptions(false);
      }
    } else {
      setLinkedCaptions([]);
    }
  }, [deliverable, api]);

  // Local refresh function that only updates modal content without closing
  const handleLocalRefresh = React.useCallback(() => {
    // Re-fetch the linked content to update the UI
    fetchLinkedContent();
  }, [fetchLinkedContent]);

  // Handle modal close and trigger parent refresh
  const handleModalClose = React.useCallback(() => {
    // Trigger parent refresh when modal closes to ensure calendar is updated
    actions.onRefresh();
    onClose();
  }, [actions, onClose]);

  // Fetch linked galleries and captions when deliverable changes
  useEffect(() => {
    fetchLinkedContent();
  }, [fetchLinkedContent]);

  if (!deliverable) return null;

  // Handle deliverable updates
  const handleDeliverableUpdate = async (updates: Partial<Deliverable>) => {
    if (!api || !deliverable._id) return;

    try {
      const response = await api.put(
        `deliverables/${deliverable._id}`,
        updates
      );

      // Update the local deliverable object with the response data for immediate UI update
      if (response && (response as any).deliverable) {
        Object.assign(deliverable, (response as any).deliverable);
      }

      // Use local refresh to avoid closing the modal
      // Parent will be refreshed when modal closes
      handleLocalRefresh();
    } catch (error) {
      console.error("Failed to update deliverable:", error);
      throw error;
    }
  };

  // Determine what to show based on media type
  const getMediaTypeDisplayName = () => {
    if (deliverable.mediaTypeId) {
      // TODO: You might want to fetch media type names here
      return deliverable.type; // Fallback to legacy type for now
    }
    return deliverable.type;
  };

  const shouldShowYouTubePreview = () => {
    const mediaType = getMediaTypeDisplayName()?.toLowerCase();
    return mediaType === "video" || mediaType === "mixed gallery";
  };

  const shouldShowGalleries = () => {
    const mediaType = getMediaTypeDisplayName()?.toLowerCase();
    return mediaType === "photo gallery" || mediaType === "mixed gallery";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8 flex items-center gap-2">
            Deliverable Details
            {deliverable.scheduled && (
              <div title="Scheduled">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Information & Timeline */}
          <div className="space-y-6">
            {/* Status and Quick Actions */}
            <div className="space-y-4 p-4 bg-transparent border border-border/30 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">
                  Status & Actions
                </h3>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusSelector
                  deliverableId={deliverable._id?.toString() || ""}
                  initialStatus={deliverable.status}
                  size="sm"
                  onStatusChange={(newStatus) =>
                    actions.onStatusChange(
                      deliverable._id?.toString() || "",
                      newStatus
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <YouTubeUploadHelper deliverable={deliverable} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actions.onDuplicate(deliverable)}
                    className="text-muted-foreground hover:text-foreground flex-1"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      actions.onDelete(deliverable._id?.toString() || "");
                      handleModalClose();
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Car Information */}
            {showCarInfo && carInfo && (
              <div className="p-4 bg-transparent border border-border/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </h3>
                <div className="pl-7">
                  <p className="text-sm text-muted-foreground">
                    {carInfo.year} {carInfo.make} {carInfo.model}
                  </p>
                </div>
              </div>
            )}

            {/* Details & Timeline */}
            <DetailsTimeline
              deliverable={deliverable}
              onUpdate={handleDeliverableUpdate}
            />

            {/* Links */}
            <LinksSection
              deliverable={deliverable}
              onUpdate={handleDeliverableUpdate}
            />
          </div>

          {/* Center Column - Thumbnail & Captions */}
          <div className="space-y-6">
            <ThumbnailSelector
              deliverable={deliverable}
              linkedGalleries={linkedGalleries}
              onUpdate={handleDeliverableUpdate}
            />

            <CaptionManagement
              deliverable={deliverable}
              linkedCaptions={linkedCaptions}
              loadingCaptions={loadingCaptions}
              onRefresh={handleLocalRefresh}
              api={api}
            />
          </div>

          {/* Right Column - Conditional content based on media type */}
          <div className="space-y-6">
            {/* Galleries Section - only show for photo gallery or mixed gallery */}
            {shouldShowGalleries() && (
              <GalleryManagement
                deliverable={deliverable}
                linkedGalleries={linkedGalleries}
                loadingGalleries={loadingGalleries}
                onRefresh={handleLocalRefresh}
                api={api}
              />
            )}

            {/* YouTube Video Embed - only show for video or mixed gallery */}
            {shouldShowYouTubePreview() && (
              <VideoPreview
                socialMediaLink={deliverable.social_media_link || ""}
                aspectRatio={deliverable.aspect_ratio}
                title={deliverable.title}
              />
            )}

            {/* Description */}
            {deliverable.description && (
              <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <div className="p-3 bg-transparent border border-border/20 rounded-lg">
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {deliverable.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
