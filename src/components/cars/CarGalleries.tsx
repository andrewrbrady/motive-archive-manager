"use client";

import React, { useState, useEffect } from "react";
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
  const [attachedGalleries, setAttachedGalleries] = useState<Gallery[]>([]);
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  // Navigate to gallery page
  const navigateToGallery = (galleryId: string) => {
    router.push(`/galleries/${galleryId}`);
  };

  // Handle card click (navigate to gallery but prevent if clicking buttons)
  const handleCardClick = (e: React.MouseEvent, galleryId: string) => {
    // Don't navigate if clicking on buttons or other interactive elements
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    navigateToGallery(galleryId);
  };

  // Fetch car data with attached galleries
  const fetchCarGalleries = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}?includeGalleries=true`);
      if (!response.ok) throw new Error("Failed to fetch car galleries");
      const car = await response.json();
      setAttachedGalleries(car.galleries || []);
    } catch (error) {
      console.error("Error fetching car galleries:", error);
      toast.error("Failed to load attached galleries");
    }
  };

  // Fetch all available galleries with their thumbnail images
  const fetchAvailableGalleries = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "50"); // Get more galleries for selection

      const response = await fetch(`/api/galleries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch galleries");
      const data = await response.json();
      setAvailableGalleries(data.galleries || []);
    } catch (error) {
      console.error("Error fetching galleries:", error);
      toast.error("Failed to load available galleries");
    }
  };

  // Update gallery attachments for the car
  const updateGalleryAttachments = async (newGalleryIds: string[]) => {
    try {
      setIsUpdating(true);

      const response = await fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryIds: newGalleryIds }),
      });

      if (!response.ok) throw new Error("Failed to update gallery attachments");

      await fetchCarGalleries(); // Refresh attached galleries
      toast.success("Gallery attachments updated successfully");
    } catch (error) {
      console.error("Error updating gallery attachments:", error);
      toast.error("Failed to update gallery attachments");
    } finally {
      setIsUpdating(false);
    }
  };

  // Attach gallery to car
  const attachGallery = async (galleryId: string) => {
    const currentGalleryIds = attachedGalleries.map((g) => g._id);
    const updatedGalleryIds = [...currentGalleryIds, galleryId];
    await updateGalleryAttachments(updatedGalleryIds);
  };

  // Remove gallery from car
  const detachGallery = async (galleryId: string) => {
    const currentGalleryIds = attachedGalleries.map((g) => g._id);
    const updatedGalleryIds = currentGalleryIds.filter(
      (id) => id !== galleryId
    );
    await updateGalleryAttachments(updatedGalleryIds);
  };

  // Get galleries that are not already attached
  const getUnattachedGalleries = () => {
    const attachedIds = new Set(attachedGalleries.map((g) => g._id));
    return availableGalleries.filter((g) => !attachedIds.has(g._id));
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCarGalleries(), fetchAvailableGalleries()]);
      setIsLoading(false);
    };
    loadData();
  }, [carId]);

  useEffect(() => {
    fetchAvailableGalleries();
  }, [searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unattachedGalleries = getUnattachedGalleries();

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
                            onClick={() => navigateToGallery(gallery._id)}
                            title="Click to view gallery"
                          >
                            {gallery.thumbnailImage ? (
                              <LazyImage
                                src={gallery.thumbnailImage.url}
                                alt={gallery.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
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
                                onClick={() => detachGallery(gallery._id)}
                                disabled={isUpdating}
                                className="text-destructive hover:text-destructive ml-2 flex-shrink-0"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Detach
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
                      placeholder="Search galleries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
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
                            onClick={() => navigateToGallery(gallery._id)}
                            title="Click to view gallery"
                          >
                            {gallery.thumbnailImage ? (
                              <LazyImage
                                src={gallery.thumbnailImage.url}
                                alt={gallery.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
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
                                onClick={(e) => attachGallery(gallery._id)}
                                disabled={isUpdating}
                                className="ml-2 flex-shrink-0"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Attach
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    width={1600}
                    height={900}
                    className="w-full h-full"
                    priority={index < 3}
                    objectFit="cover"
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
