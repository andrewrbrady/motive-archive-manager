"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Unlink,
  Plus,
  Search,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import LazyImage from "@/components/LazyImage";
import { useAPI } from "@/hooks/useAPI";
import { GalleriesSkeleton } from "./GalleriesSkeleton";
import { Gallery, GalleriesProps } from "./index";

interface GalleriesEditorProps extends GalleriesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedGalleries: Gallery[];
  onGalleriesUpdated: () => void;
}

export function GalleriesEditor({
  carId,
  open,
  onOpenChange,
  attachedGalleries,
  onGalleriesUpdated,
}: GalleriesEditorProps) {
  const api = useAPI();
  const router = useRouter();
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<Set<string>>(
    new Set()
  );

  // Use refs to prevent unnecessary re-renders
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Navigate to gallery page
  const navigateToGallery = useCallback(
    (galleryId: string) => {
      router.push(`/galleries/${galleryId}`);
    },
    [router]
  );

  // Search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
    },
    []
  );

  // Fetch available galleries for management
  const fetchAvailableGalleries = useCallback(
    async (search = "") => {
      if (!api) return;

      // Only fetch if dialog is open
      if (!open && !search) {
        return;
      }

      console.time("GalleriesEditor-fetchAvailableGalleries");
      try {
        setIsLoading(true);
        const searchParams = search
          ? `?search=${encodeURIComponent(search)}`
          : "";
        const data = (await api.get(`galleries${searchParams}`)) as {
          galleries?: Gallery[];
        };
        // Limit to first 50 galleries for faster loading
        setAvailableGalleries((data.galleries || []).slice(0, 50));
      } catch (error: any) {
        console.error(
          "[GalleriesEditor] Error fetching available galleries:",
          error
        );
        toast.error("Failed to fetch available galleries");
        setAvailableGalleries([]);
      } finally {
        setIsLoading(false);
        console.timeEnd("GalleriesEditor-fetchAvailableGalleries");
      }
    },
    [api, open]
  );

  // Update gallery attachments with proper state management
  const updateGalleryAttachments = useCallback(
    async (
      newGalleryIds: string[],
      operation: "attach" | "detach",
      galleryId: string
    ) => {
      if (!api) return;

      console.time(`GalleriesEditor-updateGalleryAttachments-${operation}`);
      try {
        setIsUpdating(true);
        console.log(
          `[GalleriesEditor] ${operation} operation - Updating gallery attachments:`,
          {
            carId,
            currentGalleryIds: attachedGalleries.map((g) => g._id),
            newGalleryIds,
            operation,
            galleryId,
          }
        );

        const requestBody = { galleryIds: newGalleryIds };
        console.log(
          `[GalleriesEditor] Request body:`,
          JSON.stringify(requestBody, null, 2)
        );

        const result = (await api.patch(`cars/${carId}`, requestBody)) as {
          galleryIds?: string[];
        };

        console.log(
          `[GalleriesEditor] Response gallery count:`,
          result.galleryIds?.length || 0
        );

        // Add a small delay to ensure the database update is complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Notify parent component to refresh data
        onGalleriesUpdated();

        toast.success(
          `Gallery ${operation === "attach" ? "attached" : "detached"} successfully`
        );
      } catch (error) {
        console.error(
          `[GalleriesEditor] Error during ${operation} operation:`,
          error
        );
        toast.error(`Failed to ${operation} gallery`);
        throw error;
      } finally {
        setIsUpdating(false);
        console.timeEnd(
          `GalleriesEditor-updateGalleryAttachments-${operation}`
        );
      }
    },
    [carId, attachedGalleries, onGalleriesUpdated, api]
  );

  // Attach gallery with proper state management
  const attachGallery = useCallback(
    async (galleryId: string) => {
      // Prevent double-clicking using Set operations
      if (operationInProgress.has(galleryId) || isUpdating) {
        console.log(
          `[GalleriesEditor] Attach operation already in progress for gallery ${galleryId}`
        );
        return;
      }

      // Check if already attached
      if (attachedGalleries.some((g) => g._id === galleryId)) {
        toast.info("Gallery is already attached");
        return;
      }

      try {
        // Add to in-progress set
        setOperationInProgress((prev) => new Set([...prev, galleryId]));

        const currentGalleryIds = attachedGalleries.map((g) => g._id);
        const updatedGalleryIds = [...currentGalleryIds, galleryId];

        console.log(
          `[GalleriesEditor] Attaching gallery ${galleryId}. Current: [${currentGalleryIds.join(", ")}], New: [${updatedGalleryIds.join(", ")}]`
        );

        await updateGalleryAttachments(updatedGalleryIds, "attach", galleryId);
      } catch (error) {
        console.error(
          `[GalleriesEditor] Failed to attach gallery ${galleryId}:`,
          error
        );
      } finally {
        // Remove from in-progress set
        setOperationInProgress((prev) => {
          const newSet = new Set(prev);
          newSet.delete(galleryId);
          return newSet;
        });
      }
    },
    [
      operationInProgress,
      isUpdating,
      attachedGalleries,
      updateGalleryAttachments,
    ]
  );

  // Detach gallery with proper state management
  const detachGallery = useCallback(
    async (galleryId: string) => {
      // Prevent double-clicking using Set operations
      if (operationInProgress.has(galleryId) || isUpdating) {
        console.log(
          `[GalleriesEditor] Detach operation already in progress for gallery ${galleryId}`
        );
        return;
      }

      // Check if actually attached
      if (!attachedGalleries.some((g) => g._id === galleryId)) {
        toast.info("Gallery is not attached");
        return;
      }

      try {
        // Add to in-progress set
        setOperationInProgress((prev) => new Set([...prev, galleryId]));

        const currentGalleryIds = attachedGalleries.map((g) => g._id);
        const updatedGalleryIds = currentGalleryIds.filter(
          (id) => id !== galleryId
        );

        console.log(
          `[GalleriesEditor] Detaching gallery ${galleryId}. Current: [${currentGalleryIds.join(", ")}], New: [${updatedGalleryIds.join(", ")}]`
        );

        await updateGalleryAttachments(updatedGalleryIds, "detach", galleryId);
      } catch (error) {
        console.error(
          `[GalleriesEditor] Failed to detach gallery ${galleryId}:`,
          error
        );
      } finally {
        // Remove from in-progress set
        setOperationInProgress((prev) => {
          const newSet = new Set(prev);
          newSet.delete(galleryId);
          return newSet;
        });
      }
    },
    [
      operationInProgress,
      isUpdating,
      attachedGalleries,
      updateGalleryAttachments,
    ]
  );

  // Memoized unattached galleries to prevent unnecessary recalculations
  const unattachedGalleries = useMemo(() => {
    const attachedIds = new Set(attachedGalleries.map((g) => g._id));
    return availableGalleries.filter((g) => !attachedIds.has(g._id));
  }, [attachedGalleries, availableGalleries]);

  // Handle search with debouncing
  useEffect(() => {
    if (!api || !open) return;

    const timeoutId = setTimeout(() => {
      fetchAvailableGalleries(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, api, open, fetchAvailableGalleries]);

  // Fetch available galleries when dialog opens
  useEffect(() => {
    if (open && availableGalleries.length === 0) {
      fetchAvailableGalleries();
    }
  }, [open, availableGalleries.length, fetchAvailableGalleries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Gallery Attachments</DialogTitle>
          <DialogDescription>
            Attach or detach galleries from this car
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <GalleriesSkeleton variant="management" />
        ) : (
          <div className="space-y-6 py-4">
            {/* Currently Attached Galleries */}
            {attachedGalleries.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Currently Attached</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attachedGalleries.map((gallery) => (
                    <div
                      key={gallery._id}
                      className="group relative bg-card rounded-lg border p-4"
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div
                          className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToGallery(gallery._id);
                          }}
                          title="Click to view gallery"
                        >
                          {gallery.thumbnailImage ? (
                            <LazyImage
                              src={gallery.thumbnailImage.url}
                              alt={gallery.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              priority={false}
                              loadingVariant="none"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Small external link icon overlay */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {gallery.name}
                              </h4>
                              {gallery.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {gallery.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                <span>{gallery.imageIds.length} images</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                detachGallery(gallery._id);
                              }}
                              disabled={
                                isUpdating ||
                                operationInProgress.has(gallery._id)
                              }
                              className="text-destructive hover:text-destructive ml-2 flex-shrink-0"
                            >
                              {operationInProgress.has(gallery._id) ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Detaching...
                                </>
                              ) : (
                                <>
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Detach
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Galleries to Attach */}
            <div>
              <h3 className="text-lg font-medium mb-3">Available to Attach</h3>

              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search galleries..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>
              </div>

              {unattachedGalleries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm
                    ? "No galleries found matching your search."
                    : "All available galleries are already attached."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {unattachedGalleries.map((gallery) => (
                    <div
                      key={gallery._id}
                      className="group relative bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div
                          className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToGallery(gallery._id);
                          }}
                          title="Click to view gallery"
                        >
                          {gallery.thumbnailImage ? (
                            <LazyImage
                              src={gallery.thumbnailImage.url}
                              alt={gallery.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              priority={false}
                              loadingVariant="none"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Small external link icon overlay */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {gallery.name}
                              </h4>
                              {gallery.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {gallery.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                <span>{gallery.imageIds.length} images</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                attachGallery(gallery._id);
                              }}
                              disabled={
                                isUpdating ||
                                operationInProgress.has(gallery._id)
                              }
                              className="ml-2 flex-shrink-0"
                            >
                              {operationInProgress.has(gallery._id) ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Attaching...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Attach
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Done"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GalleriesEditor;
