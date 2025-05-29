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
} from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import Link from "next/link";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { LoadingSpinner } from "@/components/ui/loading";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { useAPI } from "@/lib/fetcher";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

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
            src={getFormattedImageUrl(gallery.thumbnailImage.url)}
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
}: ProjectGalleriesTabProps) {
  const api = useAPI();
  const { isAuthenticated, hasValidToken, user } = useFirebaseAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const fetchProjectGalleries = async () => {
    try {
      setIsLoading(true);
      const data = await api.get(`/api/projects/${project._id}/galleries`);
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
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch project galleries",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableGalleries = async () => {
    try {
      const data = await api.get(`/api/galleries?limit=100`);

      // Filter out galleries that are already linked to this project
      const linkedGalleryIds = new Set(galleries.map((g) => g._id));
      const unlinkedGalleries = data.galleries.filter(
        (gallery: Gallery) => !linkedGalleryIds.has(gallery._id)
      );

      setAvailableGalleries(unlinkedGalleries);
    } catch (error) {
      console.error("Error fetching available galleries:", error);

      // Check if it's an authentication error
      if (
        error instanceof Error &&
        error.message.includes("Not authenticated")
      ) {
        toast({
          title: "Authentication Error",
          description: "Please refresh the page to continue linking galleries.",
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch available galleries",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (project._id) {
      fetchProjectGalleries();
    }
  }, [project._id]);

  useEffect(() => {
    if (isLinkDialogOpen) {
      fetchAvailableGalleries();
    }
  }, [isLinkDialogOpen, galleries]);

  const handleLinkGallery = async (galleryId: string) => {
    try {
      setIsLinking(true);
      await api.post(`/api/projects/${project._id}/galleries`, { galleryId });

      toast({
        title: "Success",
        description: "Gallery linked to project successfully",
      });

      // Refresh the galleries list
      await fetchProjectGalleries();
      onProjectUpdate();
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error("Error linking gallery:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link gallery",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGallery = async (galleryId: string) => {
    try {
      await api.delete(
        `/api/projects/${project._id}/galleries?galleryId=${galleryId}`
      );

      toast({
        title: "Success",
        description: "Gallery unlinked from project successfully",
      });

      // Refresh the galleries list
      await fetchProjectGalleries();
      onProjectUpdate();
    } catch (error) {
      console.error("Error unlinking gallery:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to unlink gallery",
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
      {/* Debug Section - Development Only */}
      {process.env.NODE_ENV === "development" && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Debug: Authentication Status
          </h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>Authenticated: {isAuthenticated ? "✅ Yes" : "❌ No"}</div>
            <div>Valid Token: {hasValidToken ? "✅ Yes" : "❌ No"}</div>
            <div>User ID: {user?.uid || "None"}</div>
            <div>User Email: {user?.email || "None"}</div>
            {(!isAuthenticated || !hasValidToken) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Refresh Page
              </Button>
            )}
          </div>
        </div>
      )}

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
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Link Gallery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Link Gallery to Project</DialogTitle>
              <DialogDescription>
                Select a gallery to link to this project. Linked galleries will
                be associated with this project for organization and reference.
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
                              src={getFormattedImageUrl(
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

      {/* Galleries Grid */}
      {galleries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Images className="w-12 h-12 text-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Galleries Linked
            </h3>
            <p className="text-text-secondary text-center mb-4">
              This project doesn't have any galleries linked yet. Link galleries
              to organize and reference image collections for this project.
            </p>
            <Button onClick={() => setIsLinkDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Link Your First Gallery
            </Button>
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
