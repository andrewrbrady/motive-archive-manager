"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Images,
  MoreHorizontal,
  Search,
  Eye,
  ExternalLink,
  Unlink,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import Link from "next/link";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { LoadingSpinner } from "@/components/ui/loading";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { useAPI } from "@/hooks/useAPI";

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  orderedImages?: Array<{
    id: string;
    order: number;
  }>;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectGalleriesTabProps {
  project: Project;
  onProjectUpdate: () => void;
  initialGalleries?: Gallery[]; // Optional pre-fetched galleries data for SSR optimization
}

// Gallery Card Component for Project Galleries
function ProjectGalleryCard({
  gallery,
  onUnlink,
}: {
  gallery: Gallery;
  onUnlink: (galleryId: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-background rounded-lg border border-border-primary overflow-hidden hover:border-border-secondary transition-colors relative group">
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {gallery.thumbnailImage ? (
          <Image
            src={fixCloudflareImageUrl(gallery.thumbnailImage.url)}
            alt={gallery.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        ) : (
          <div className="w-full h-full bg-black/10 dark:bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              <MotiveLogo className="w-12 h-12 text-text-primary fill-current" />
              <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                No Images
              </span>
            </div>
          </div>
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <Link href={`/galleries/${gallery._id}`}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate">
              {gallery.name}
            </h3>
            {gallery.description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                {gallery.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/galleries/${gallery._id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Gallery
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUnlink(gallery._id)}
                className="text-red-600 hover:text-red-700"
              >
                Unlink from Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4" />
            <span>{gallery.imageCount} images</span>
          </div>
          <span>{format(new Date(gallery.updatedAt), "MMM d, yyyy")}</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectGalleriesTab({
  project,
  onProjectUpdate,
  initialGalleries,
}: ProjectGalleriesTabProps) {
  const api = useAPI();
  const [galleries, setGalleries] = useState<Gallery[]>(initialGalleries || []);
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(!initialGalleries); // Don't show loading if we have initial data
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGallery, setNewGallery] = useState({
    name: "",
    description: "",
  });

  const fetchProjectGalleries = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(
        `/api/projects/${project._id}/galleries`
      )) as { galleries: Gallery[] };
      setGalleries(data.galleries || []);
    } catch (error) {
      console.error("Error fetching project galleries:", error);

      // Check if it's an authentication error
      if (
        error instanceof Error &&
        error.message.includes("Not authenticated")
      ) {
        toast({
          title: "Authentication Error",
          description:
            "Please refresh the page and try again. You may need to sign in again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load project galleries",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableGalleries = async () => {
    if (!api) return;

    try {
      const response = (await api.get("/api/galleries")) as
        | { galleries: Gallery[]; pagination?: any }
        | Gallery[];

      // Handle both response formats - object with galleries property or plain array
      const allGalleries = Array.isArray(response)
        ? response
        : response.galleries || [];

      // Filter out galleries that are already linked to this project
      const unlinkedGalleries = allGalleries.filter(
        (gallery) =>
          !galleries.some((linkedGallery) => linkedGallery._id === gallery._id)
      );
      setAvailableGalleries(unlinkedGalleries);
    } catch (error) {
      console.error("Error fetching available galleries:", error);
      toast({
        title: "Error",
        description: "Failed to load available galleries",
        variant: "destructive",
      });
    }
  };

  // Load project galleries when component mounts or project changes
  // Only fetch if we don't have initial data and API is available
  useEffect(() => {
    if (api && project._id && !initialGalleries) {
      fetchProjectGalleries();
    }
  }, [api, project._id, initialGalleries]);

  // Load available galleries when link dialog opens
  useEffect(() => {
    if (isLinkDialogOpen && api) {
      fetchAvailableGalleries();
    }
  }, [isLinkDialogOpen, galleries, api]);

  const handleCreateGallery = async () => {
    if (!api) return;

    try {
      setIsCreating(true);

      // Create the gallery
      const galleryResponse = (await api.post("/api/galleries", {
        name: newGallery.name,
        description: newGallery.description,
        imageIds: [],
      })) as Gallery;

      // Automatically link the new gallery to the project
      await api.post(`/api/projects/${project._id}/galleries`, {
        galleryId: galleryResponse._id,
      });

      toast({
        title: "Success",
        description: "Gallery created and linked to project successfully",
      });

      // Reset form and close dialog
      setNewGallery({ name: "", description: "" });
      setIsCreateDialogOpen(false);

      // Refresh the galleries list
      await fetchProjectGalleries();
      onProjectUpdate(); // Refresh parent data if needed
    } catch (error) {
      console.error("Error creating gallery:", error);
      toast({
        title: "Error",
        description: "Failed to create gallery",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkGallery = async (galleryId: string) => {
    if (!api) return;

    try {
      setIsLinking(true);
      await api.post(`/api/projects/${project._id}/galleries`, {
        galleryId,
      });

      toast({
        title: "Success",
        description: "Gallery linked to project successfully",
      });

      // Refresh the galleries list
      await fetchProjectGalleries();
      setIsLinkDialogOpen(false);
      onProjectUpdate(); // Refresh parent data if needed
    } catch (error) {
      console.error("Error linking gallery:", error);
      toast({
        title: "Error",
        description: "Failed to link gallery to project",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGallery = async (galleryId: string) => {
    if (!api) return;

    try {
      await api.delete(`/api/projects/${project._id}/galleries/${galleryId}`);

      toast({
        title: "Success",
        description: "Gallery unlinked from project",
      });

      // Remove from local state
      setGalleries((prev) => prev.filter((g) => g._id !== galleryId));
      onProjectUpdate(); // Refresh parent data if needed
    } catch (error) {
      console.error("Error unlinking gallery:", error);
      toast({
        title: "Error",
        description: "Failed to unlink gallery from project",
        variant: "destructive",
      });
    }
  };

  const formatGalleryName = (gallery: Gallery) => {
    return gallery.name || "Untitled Gallery";
  };

  const filteredAvailableGalleries = availableGalleries.filter(
    (gallery) =>
      formatGalleryName(gallery)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (gallery.description &&
        gallery.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Project Galleries
          </h2>
          <p className="text-text-secondary">
            Manage galleries linked to this project
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Create New Gallery Dialog */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Gallery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Gallery</DialogTitle>
                <DialogDescription>
                  Create a new gallery that will be automatically linked to this
                  project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="gallery-name">Name</Label>
                  <Input
                    id="gallery-name"
                    value={newGallery.name}
                    onChange={(e) =>
                      setNewGallery({ ...newGallery, name: e.target.value })
                    }
                    placeholder="Enter gallery name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gallery-description">Description</Label>
                  <Textarea
                    id="gallery-description"
                    value={newGallery.description}
                    onChange={(e) =>
                      setNewGallery({
                        ...newGallery,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter gallery description (optional)"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewGallery({ name: "", description: "" });
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGallery}
                  disabled={!newGallery.name.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create & Link Gallery"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Link Existing Gallery Dialog */}
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Link Existing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Link Existing Gallery</DialogTitle>
                <DialogDescription>
                  Select a gallery to link to this project. Linked galleries
                  will be associated with this project for organization and
                  reference.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search Galleries</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredAvailableGalleries.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                      {searchTerm
                        ? "No galleries found matching your search."
                        : "No available galleries to link."}
                    </div>
                  ) : (
                    filteredAvailableGalleries.map((gallery) => (
                      <div
                        key={gallery._id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 relative rounded overflow-hidden bg-background-primary">
                            {gallery.thumbnailImage ? (
                              <Image
                                src={fixCloudflareImageUrl(
                                  gallery.thumbnailImage.url
                                )}
                                alt={gallery.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Images className="w-6 h-6 text-text-secondary" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">
                              {formatGalleryName(gallery)}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {gallery.imageCount} images
                            </div>
                            {gallery.description && (
                              <div className="text-sm text-text-secondary line-clamp-1">
                                {gallery.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkGallery(gallery._id)}
                          disabled={isLinking}
                        >
                          {isLinking ? "Linking..." : "Link"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsLinkDialogOpen(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Galleries Grid */}
      {galleries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Images className="w-12 h-12 text-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Galleries Linked
            </h3>
            <p className="text-text-secondary text-center mb-4">
              This project doesn't have any galleries linked yet. Create a new
              gallery or link existing galleries to organize and reference image
              collections for this project.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Gallery
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsLinkDialogOpen(true)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Link Existing
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => (
            <ProjectGalleryCard
              key={gallery._id}
              gallery={gallery}
              onUnlink={handleUnlinkGallery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
