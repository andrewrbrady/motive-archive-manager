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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Unlink,
  Plus,
  Search,
  Image as ImageIcon,
  Edit3,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import LazyImage from "@/components/LazyImage";
import { useAPI } from "@/hooks/useAPI";

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
}

interface CarGalleriesProps {
  carId: string;
}

export default function CarGalleries({ carId }: CarGalleriesProps) {
  const api = useAPI();
  const [attachedGalleries, setAttachedGalleries] = useState<Gallery[]>([]);
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();

  // Use refs to prevent unnecessary re-renders
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Navigate to gallery page
  const navigateToGallery = useCallback(
    (galleryId: string) => {
      router.push(`/galleries/${galleryId}`);
    },
    [router]
  );

  // Handle card click (navigate to gallery but prevent if clicking buttons)
  const handleCardClick = useCallback(
    (e: React.MouseEvent, galleryId: string) => {
      // Don't navigate if clicking on buttons or interactive elements
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      navigateToGallery(galleryId);
    },
    [navigateToGallery]
  );

  // Search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
    },
    []
  );

  // Individual fetch functions for specific use cases
  const fetchCarGalleries = useCallback(async () => {
    if (!carId || !api) return;

    console.time("CarGalleries-fetchCarGalleries");
    try {
      const car = (await api.get(`cars/${carId}?includeGalleries=true`)) as {
        galleries?: Gallery[];
      };
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarGalleries] Car galleries from API:", car.galleries);
      setAttachedGalleries(car.galleries || []);
    } catch (error: any) {
      console.error("[CarGalleries] Error fetching car galleries:", error);
      toast.error("Failed to fetch attached galleries");
      setAttachedGalleries([]);
    } finally {
      console.timeEnd("CarGalleries-fetchCarGalleries");
    }
  }, [carId, api]);

  const fetchAvailableGalleries = useCallback(
    async (search = "") => {
      if (!api) return;

      // PERFORMANCE: Don't fetch if dialog isn't open
      if (!isEditDialogOpen && !search) {
        return;
      }

      console.time("CarGalleries-fetchAvailableGalleries");
      try {
        const searchParams = search
          ? `?search=${encodeURIComponent(search)}`
          : "";
        const data = (await api.get(`galleries${searchParams}`)) as {
          galleries?: Gallery[];
        };
        // PERFORMANCE: Limit to first 50 galleries for faster loading
        setAvailableGalleries((data.galleries || []).slice(0, 50));
      } catch (error: any) {
        console.error(
          "[CarGalleries] Error fetching available galleries:",
          error
        );
        toast.error("Failed to fetch available galleries");
        setAvailableGalleries([]);
      } finally {
        console.timeEnd("CarGalleries-fetchAvailableGalleries");
      }
    },
    [api, isEditDialogOpen]
  );

  // Update gallery attachments - improved with better state management
  const updateGalleryAttachments = useCallback(
    async (
      newGalleryIds: string[],
      operation: "attach" | "detach",
      galleryId: string
    ) => {
      if (!api) return;

      console.time(`CarGalleries-updateGalleryAttachments-${operation}`);
      try {
        setIsUpdating(true);
        console.log(
          `[CarGalleries] ${operation} operation - Updating gallery attachments:`,
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
          `[CarGalleries] Request body:`,
          JSON.stringify(requestBody, null, 2)
        );

        const result = (await api.patch(`cars/${carId}`, requestBody)) as {
          galleryIds?: string[];
        };

        console.log(
          `[CarGalleries] Response gallery count:`,
          result.galleryIds?.length || 0
        );

        // Add a small delay to ensure the database update is complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refresh attached galleries to get the latest state
        await fetchCarGalleries();

        toast.success(
          `Gallery ${operation === "attach" ? "attached" : "detached"} successfully`
        );
      } catch (error) {
        console.error(
          `[CarGalleries] Error during ${operation} operation:`,
          error
        );
        toast.error(`Failed to ${operation} gallery`);
        throw error;
      } finally {
        setIsUpdating(false);
        console.timeEnd(`CarGalleries-updateGalleryAttachments-${operation}`);
      }
    },
    [carId, attachedGalleries, fetchCarGalleries, api]
  );

  // Attach gallery with proper state management
  const attachGallery = useCallback(
    async (galleryId: string) => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[CarGalleries] Attempting to attach gallery ${galleryId}`);

      // Prevent double-clicking using Set operations
      if (operationInProgress.has(galleryId) || isUpdating) {
        console.log(
          `[CarGalleries] Attach operation already in progress for gallery ${galleryId}`
        );
        return;
      }

      // Check if already attached
      if (attachedGalleries.some((g) => g._id === galleryId)) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[CarGalleries] Gallery ${galleryId} is already attached`);
        toast.info("Gallery is already attached");
        return;
      }

      try {
        // Add to in-progress set
        setOperationInProgress((prev) => new Set([...prev, galleryId]));

        const currentGalleryIds = attachedGalleries.map((g) => g._id);
        const updatedGalleryIds = [...currentGalleryIds, galleryId];

        console.log(
          `[CarGalleries] Attaching gallery ${galleryId}. Current: [${currentGalleryIds.join(", ")}], New: [${updatedGalleryIds.join(", ")}]`
        );

        await updateGalleryAttachments(updatedGalleryIds, "attach", galleryId);
      } catch (error) {
        console.error(
          `[CarGalleries] Failed to attach gallery ${galleryId}:`,
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[CarGalleries] Attempting to detach gallery ${galleryId}`);

      // Prevent double-clicking using Set operations
      if (operationInProgress.has(galleryId) || isUpdating) {
        console.log(
          `[CarGalleries] Detach operation already in progress for gallery ${galleryId}`
        );
        return;
      }

      // Check if actually attached
      if (!attachedGalleries.some((g) => g._id === galleryId)) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[CarGalleries] Gallery ${galleryId} is not attached`);
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
          `[CarGalleries] Detaching gallery ${galleryId}. Current: [${currentGalleryIds.join(", ")}], New: [${updatedGalleryIds.join(", ")}]`
        );

        await updateGalleryAttachments(updatedGalleryIds, "detach", galleryId);
      } catch (error) {
        console.error(
          `[CarGalleries] Failed to detach gallery ${galleryId}:`,
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

  // Initial load effect with TRULY parallel fetching
  useEffect(() => {
    if (!carId || !api) return;

    const loadData = async () => {
      setIsLoading(true);
      console.time("CarGalleries-fetchCarGalleries");
      try {
        // PERFORMANCE: Only fetch car galleries initially, not available galleries
        const carData = (await api.get(
          `cars/${carId}?includeGalleries=true`
        )) as {
          galleries?: Gallery[];
        };

        console.log(
          "[CarGalleries] Car galleries from API:",
          carData.galleries
        );
        setAttachedGalleries(carData.galleries || []);
        // Don't fetch available galleries until dialog is opened
      } catch (error: any) {
        console.error("[CarGalleries] Error fetching data:", error);
        toast.error("Failed to fetch gallery data");
        setAttachedGalleries([]);
        setAvailableGalleries([]);
      } finally {
        console.timeEnd("CarGalleries-fetchCarGalleries");
        setIsLoading(false);
      }
    };

    loadData();
  }, [carId, api]);

  // Handle search with debouncing
  useEffect(() => {
    if (!api) return;

    const timeoutId = setTimeout(() => {
      fetchAvailableGalleries(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, api, fetchAvailableGalleries]);

  // Fetch available galleries when dialog opens
  useEffect(() => {
    if (isEditDialogOpen && availableGalleries.length === 0) {
      fetchAvailableGalleries();
    }
  }, [isEditDialogOpen, availableGalleries.length, fetchAvailableGalleries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state when API is not ready or during data loading
  if (!api || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading galleries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Attached Galleries</h2>
          <p className="text-muted-foreground">
            {attachedGalleries.length}{" "}
            {attachedGalleries.length === 1 ? "gallery" : "galleries"} attached
            to this car
          </p>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit3 className="h-4 w-4 mr-2" />
              Manage Galleries
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Gallery Attachments</DialogTitle>
              <DialogDescription>
                Attach or detach galleries from this car
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Currently Attached Galleries */}
              {attachedGalleries.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">
                    Currently Attached
                  </h3>
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
                <h3 className="text-lg font-medium mb-3">
                  Available to Attach
                </h3>

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

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
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
      </div>

      {/* Attached Galleries Display */}
      {attachedGalleries.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No galleries attached to this car</p>
          <p className="text-sm">
            Click "Manage Galleries" to attach galleries
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {attachedGalleries.map((gallery, index) => (
            <div
              key={gallery._id}
              className="group relative bg-card rounded-lg border p-6 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={(e) => handleCardClick(e, gallery._id)}
            >
              <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-md bg-muted">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {gallery.imageIds.length}
                  </span>
                </div>

                {/* External link indicator */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground shadow-sm">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">View Gallery</span>
                  </div>
                </div>

                {gallery.thumbnailImage ? (
                  <LazyImage
                    src={gallery.thumbnailImage.url}
                    alt={gallery.name}
                    width={400}
                    height={225}
                    className="w-full h-full"
                    priority={index < 2}
                    objectFit="cover"
                    loadingVariant="none"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-muted-foreground">No images</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  {gallery.name}
                </h3>
                {gallery.description && (
                  <p className="text-muted-foreground line-clamp-2">
                    {gallery.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {new Date(gallery.updatedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
