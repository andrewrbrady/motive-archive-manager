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
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Trash2,
  User,
  Tag,
  Monitor,
  FileText,
  Link,
  Share2,
  Cloud,
  ImageIcon,
  MessageSquare,
  CheckCircle,
  Plus,
  X,
  Car,
  Database,
  Edit,
  Play,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions } from "../types";
import {
  safeFormat,
  formatDeliverableDuration,
  getStatusColor,
  getStatusText,
  getPillColor,
} from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";
import EditDeliverableForm from "../../EditDeliverableForm";
import { MultiSelect } from "@/components/ui/multi-select";
import { useGalleries } from "@/hooks/use-galleries";
import { toast } from "@/components/ui/use-toast";

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

  // Gallery and caption management state
  const [isEditingReferences, setIsEditingReferences] = useState(false);
  const [availableCaptions, setAvailableCaptions] = useState<any[]>([]);
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Use the galleries hook
  const { data: galleriesData, isLoading: galleriesLoading } = useGalleries({
    limit: 100,
  });

  // Fetch linked galleries and captions when deliverable changes
  useEffect(() => {
    if (!deliverable || !api) return;

    const fetchLinkedContent = async () => {
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
    };

    fetchLinkedContent();
  }, [deliverable, api]);

  // Initialize selected IDs when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setSelectedGalleryIds((deliverable as any).gallery_ids || []);
      setSelectedCaptionIds((deliverable as any).caption_ids || []);
    }
  }, [deliverable]);

  // Fetch available captions when editing mode is enabled
  useEffect(() => {
    if (isEditingReferences && api) {
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
  }, [isEditingReferences, api]);

  // Function to save content references
  const handleSaveReferences = async () => {
    if (!deliverable || !api) return;

    setIsSaving(true);
    try {
      await api.put(`deliverables/${deliverable._id}`, {
        gallery_ids: selectedGalleryIds,
        caption_ids: selectedCaptionIds,
      });

      // Update the deliverable data locally
      const updatedDeliverable = {
        ...deliverable,
        gallery_ids: selectedGalleryIds,
        caption_ids: selectedCaptionIds,
      };

      // Refresh the data
      actions.onRefresh();
      setIsEditingReferences(false);

      toast({
        title: "Success",
        description: "Content references updated successfully",
      });
    } catch (error) {
      console.error("Error updating content references:", error);
      toast({
        title: "Error",
        description: "Failed to update content references",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedGalleryIds((deliverable as any)?.gallery_ids || []);
    setSelectedCaptionIds((deliverable as any)?.caption_ids || []);
    setIsEditingReferences(false);
  };

  // YouTube utility functions
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const isYouTubeUrl = (url: string): boolean => {
    return extractYouTubeVideoId(url) !== null;
  };

  if (!deliverable) return null;

  // Updated table-like InfoRow component
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8 flex items-center gap-2">
            {deliverable.title}
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
                <EditDeliverableForm
                  deliverable={deliverable}
                  onDeliverableUpdated={actions.onRefresh}
                  onClose={() => {}}
                />
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
                      onClose();
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

            {/* Basic Information */}
            <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Details
              </h3>

              <div className="space-y-0">
                <InfoRow
                  icon={Monitor}
                  label="Platform"
                  value={deliverable.platform || "Not specified"}
                />

                <InfoRow icon={Tag} label="Type" value={deliverable.type} />

                {deliverable.duration > 0 &&
                  (deliverable.type as string) !== "Photo Gallery" && (
                    <InfoRow
                      icon={Clock}
                      label="Duration"
                      value={formatDeliverableDuration(deliverable)}
                    />
                  )}

                <InfoRow
                  icon={Monitor}
                  label="Aspect Ratio"
                  value={deliverable.aspect_ratio || "Not specified"}
                />

                {deliverable.editor && (
                  <InfoRow
                    icon={User}
                    label="Editor"
                    value={deliverable.editor}
                  />
                )}

                {deliverable.target_audience && (
                  <InfoRow
                    icon={User}
                    label="Target Audience"
                    value={deliverable.target_audience}
                  />
                )}

                {deliverable.music_track && (
                  <InfoRow
                    icon={Tag}
                    label="Music Track"
                    value={deliverable.music_track}
                  />
                )}

                {/* Metadata moved to details */}
                {deliverable._id && (
                  <InfoRow
                    icon={Database}
                    label="ID"
                    value={
                      <code className="text-xs bg-transparent border border-border/20 px-2 py-1 rounded">
                        {deliverable._id.toString()}
                      </code>
                    }
                  />
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </h3>

              <div className="space-y-0">
                <InfoRow
                  icon={Clock}
                  label="Edit Deadline"
                  value={
                    deliverable.edit_deadline
                      ? safeFormat(deliverable.edit_deadline, "MMMM d, yyyy")
                      : "Not set"
                  }
                />

                <InfoRow
                  icon={Calendar}
                  label="Release Date"
                  value={
                    deliverable.release_date
                      ? safeFormat(deliverable.release_date, "MMMM d, yyyy")
                      : "Not set"
                  }
                />

                <InfoRow
                  icon={Calendar}
                  label="Created"
                  value={
                    deliverable.created_at
                      ? safeFormat(
                          deliverable.created_at,
                          "MMMM d, yyyy 'at' h:mm a"
                        )
                      : "Unknown"
                  }
                />

                <InfoRow
                  icon={Calendar}
                  label="Last Updated"
                  value={
                    deliverable.updated_at
                      ? safeFormat(
                          deliverable.updated_at,
                          "MMMM d, yyyy 'at' h:mm a"
                        )
                      : "Unknown"
                  }
                />
              </div>
            </div>
          </div>

          {/* Center Column - Content References */}
          <div className="space-y-6">
            <div className="space-y-4 p-4 bg-transparent border border-border/30 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content References
                </h3>
                {!isEditingReferences && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReferences(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                )}
              </div>

              {isEditingReferences ? (
                // Edit mode with selectors
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Galleries
                      </label>
                      <MultiSelect
                        value={selectedGalleryIds.map((id) => {
                          const gallery = galleriesData?.galleries?.find(
                            (g: any) => g._id === id
                          );
                          return gallery
                            ? {
                                label: gallery.name || `Gallery ${gallery._id}`,
                                value: gallery._id,
                              }
                            : { label: id, value: id };
                        })}
                        onChange={(selected) =>
                          setSelectedGalleryIds(selected.map((s) => s.value))
                        }
                        options={
                          galleriesLoading
                            ? []
                            : galleriesData?.galleries?.map((gallery: any) => ({
                                label: gallery.name || `Gallery ${gallery._id}`,
                                value: gallery._id,
                              })) || []
                        }
                        placeholder={
                          galleriesLoading
                            ? "Loading galleries..."
                            : "Select galleries"
                        }
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Captions
                      </label>
                      <MultiSelect
                        value={selectedCaptionIds.map((id) => {
                          const caption = availableCaptions.find(
                            (c: any) => c._id === id
                          );
                          return caption
                            ? {
                                label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                value: caption._id,
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
                                label: `${caption.platform}: ${caption.caption_text?.substring(0, 50)}${caption.caption_text?.length > 50 ? "..." : ""}`,
                                value: caption._id,
                              })) || []
                        }
                        placeholder={
                          captionsLoading
                            ? "Loading captions..."
                            : "Select captions"
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                    <Button
                      onClick={handleSaveReferences}
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="space-y-4">
                  {/* Linked Galleries */}
                  {(linkedGalleries.length > 0 || loadingGalleries) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Galleries{" "}
                        {linkedGalleries.length > 0 &&
                          `(${linkedGalleries.length})`}
                      </h4>
                      {loadingGalleries ? (
                        <div className="text-sm text-muted-foreground">
                          Loading galleries...
                        </div>
                      ) : linkedGalleries.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No galleries linked
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {linkedGalleries.map((gallery, index) => (
                            <div
                              key={gallery._id || index}
                              className="p-3 bg-transparent border border-border/20 rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">
                                      {gallery.name || `Gallery ${index + 1}`}
                                    </p>
                                    {gallery._id && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <a
                                          href={`/galleries/${gallery._id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>

                                  {gallery.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {gallery.description}
                                    </p>
                                  )}

                                  {(gallery.images?.length ||
                                    gallery.imageIds?.length) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {gallery.images?.length ||
                                        gallery.imageIds?.length}{" "}
                                      image
                                      {(gallery.images?.length ||
                                        gallery.imageIds?.length) !== 1
                                        ? "s"
                                        : ""}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* 6x2 Image Thumbnails Grid */}
                              {gallery.images && gallery.images.length > 0 && (
                                <div className="grid grid-cols-6 gap-1">
                                  {gallery.images
                                    .slice(0, 12)
                                    .map((image: any, imageIndex: number) => (
                                      <div
                                        key={image._id || imageIndex}
                                        className="aspect-square relative group"
                                      >
                                        <img
                                          src={image.url}
                                          alt={`Gallery ${gallery.name} - Image ${imageIndex + 1}`}
                                          className="w-full h-full object-cover rounded border bg-muted/20"
                                          loading="lazy"
                                        />
                                        {/* Show +N indicator on the 12th image if there are more */}
                                        {imageIndex === 11 &&
                                          gallery.images.length > 12 && (
                                            <div className="absolute inset-0 bg-black/70 rounded flex items-center justify-center">
                                              <span className="text-white text-xs font-medium">
                                                +{gallery.images.length - 12}
                                              </span>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linked Captions */}
                  {(linkedCaptions.length > 0 || loadingCaptions) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Captions{" "}
                        {linkedCaptions.length > 0 &&
                          `(${linkedCaptions.length})`}
                      </h4>
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
                              className="p-4 bg-transparent border border-border/20 rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-transparent"
                                    >
                                      {caption.platform || "Unknown Platform"}
                                    </Badge>
                                  </div>
                                  {/* Fuller caption text with rich text support */}
                                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                    {caption.caption_text || "No caption text"}
                                  </div>
                                  {caption.hashtags &&
                                    caption.hashtags.length > 0 && (
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
                    </div>
                  )}

                  {/* Show message when no content references exist */}
                  {!loadingGalleries &&
                    !loadingCaptions &&
                    linkedGalleries.length === 0 &&
                    linkedCaptions.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No content references linked
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Links and Description */}
          <div className="space-y-6">
            {/* YouTube Video Embed */}
            {deliverable.social_media_link &&
              isYouTubeUrl(deliverable.social_media_link) && (
                <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    {deliverable.aspect_ratio === "9:16"
                      ? "YouTube Shorts Preview"
                      : "Video Preview"}
                  </h3>
                  <div
                    className={`relative w-full bg-black rounded-lg overflow-hidden ${
                      deliverable.aspect_ratio === "9:16"
                        ? "aspect-[9/16] max-w-[300px] mx-auto"
                        : "aspect-video"
                    }`}
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeVideoId(deliverable.social_media_link)}${
                        deliverable.aspect_ratio === "9:16"
                          ? "?autoplay=0&mute=1"
                          : ""
                      }`}
                      title={
                        deliverable.aspect_ratio === "9:16"
                          ? "YouTube Shorts player"
                          : "YouTube video player"
                      }
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    ></iframe>
                  </div>
                  {deliverable.aspect_ratio === "9:16" && (
                    <p className="text-xs text-muted-foreground text-center">
                      Optimized for YouTube Shorts (9:16 aspect ratio)
                    </p>
                  )}
                </div>
              )}

            {/* Links */}
            {(deliverable.dropbox_link ||
              deliverable.social_media_link ||
              deliverable.publishing_url) && (
              <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Links
                </h3>

                <div className="space-y-0">
                  {deliverable.dropbox_link && (
                    <InfoRow
                      icon={Cloud}
                      label="Dropbox"
                      value="View in Dropbox"
                      href={deliverable.dropbox_link}
                    />
                  )}

                  {deliverable.social_media_link && (
                    <InfoRow
                      icon={Share2}
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
              </div>
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
