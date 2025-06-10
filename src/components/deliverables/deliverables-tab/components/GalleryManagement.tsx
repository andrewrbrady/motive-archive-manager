import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, ImageIcon } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useGalleries } from "@/hooks/use-galleries";
import { toast } from "@/components/ui/use-toast";
import { Deliverable } from "@/types/deliverable";

interface GalleryManagementProps {
  deliverable: Deliverable;
  linkedGalleries: any[];
  loadingGalleries: boolean;
  onRefresh: () => void;
  api: any;
}

export default function GalleryManagement({
  deliverable,
  linkedGalleries,
  loadingGalleries,
  onRefresh,
  api,
}: GalleryManagementProps) {
  // Gallery management state
  const [isEditingGalleries, setIsEditingGalleries] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Use the galleries hook
  const { data: galleriesData, isLoading: galleriesLoading } = useGalleries({
    limit: 100,
  });

  // Initialize selected IDs when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setSelectedGalleryIds((deliverable as any).gallery_ids || []);
    }
  }, [deliverable]);

  // Function to save gallery references
  const handleSaveGalleries = async () => {
    if (!deliverable || !api) return;

    setIsSaving(true);
    try {
      await api.put(`deliverables/${deliverable._id}`, {
        gallery_ids: selectedGalleryIds,
        caption_ids: (deliverable as any).caption_ids || [],
      });

      // Update the deliverable object to trigger UI refresh
      Object.assign(deliverable, {
        ...deliverable,
        gallery_ids: selectedGalleryIds,
      });

      // Refresh the parent data
      onRefresh();
      setIsEditingGalleries(false);

      toast({
        title: "Success",
        description: "Galleries updated successfully",
      });
    } catch (error) {
      console.error("Error updating galleries:", error);
      toast({
        title: "Error",
        description: "Failed to update galleries",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelGalleries = () => {
    setSelectedGalleryIds((deliverable as any)?.gallery_ids || []);
    setIsEditingGalleries(false);
  };

  return (
    <div className="space-y-4 p-4 bg-transparent border border-border/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Galleries
          {linkedGalleries.length > 0 && ` (${linkedGalleries.length})`}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditingGalleries(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Manage
        </Button>
      </div>

      {isEditingGalleries && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Galleries
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
                galleriesLoading ? "Loading galleries..." : "Select galleries"
              }
              className="text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border/30">
            <Button onClick={handleSaveGalleries} disabled={isSaving} size="sm">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelGalleries}
              disabled={isSaving}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isEditingGalleries && (
        <>
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
                          <Button variant="outline" size="sm" asChild>
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

                      {(gallery.images?.length || gallery.imageIds?.length) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {gallery.images?.length || gallery.imageIds?.length}{" "}
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
        </>
      )}
    </div>
  );
}
