"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useGalleries,
  createGallery,
  duplicateGallery,
} from "@/lib/hooks/query/useGalleries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  ImageIcon,
  Copy,
  ZoomIn,
  ZoomOut,
  List,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PageTitle } from "@/components/ui/PageTitle";
import LazyImage from "@/components/LazyImage";
import Pagination from "@/components/ui/pagination";
import { useDebounce } from "use-debounce";

export default function GalleriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract search params or use defaults
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("limit") || "20");
  const searchQuery = searchParams.get("search") || "";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [duplicatingGalleryId, setDuplicatingGalleryId] = useState<
    string | null
  >(null);

  // Zoom control state with localStorage persistence
  const [zoomLevel, setZoomLevel] = useState(3); // Always start with default

  // Load zoom level from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("galleries-zoom-level");
    if (saved) {
      const parsedZoom = parseInt(saved, 10);
      if (parsedZoom >= 1 && parsedZoom <= 5) {
        setZoomLevel(parsedZoom);
      }
    }
  }, []);

  // Zoom level configurations
  const zoomConfigs = {
    1: { cols: "lg:grid-cols-8", label: "8 cols" },
    2: { cols: "lg:grid-cols-6", label: "6 cols" },
    3: { cols: "lg:grid-cols-4", label: "4 cols" },
    4: { cols: "lg:grid-cols-3", label: "3 cols" },
    5: { cols: "lg:grid-cols-2", label: "2 cols" },
  };

  // Get grid classes based on zoom level
  const getGridClasses = () => {
    const baseClasses = "grid grid-cols-1 md:grid-cols-2";
    const zoomClass = zoomConfigs[zoomLevel as keyof typeof zoomConfigs].cols;
    return `${baseClasses} ${zoomClass} gap-6`;
  };

  const { data, isLoading, error, mutate } = useGalleries({
    search: searchQuery,
    page,
    limit: pageSize,
  });

  const [newGallery, setNewGallery] = useState({
    name: "",
    description: "",
  });

  // Handle search with debounce
  const [debouncedSetSearch] = useDebounce((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on new search

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, 500);

  // Handle search input
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page when changing page size
    params.set("limit", newPageSize);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Zoom control functions
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(5, zoomLevel + 1);
    setZoomLevel(newZoomLevel);
    localStorage.setItem("galleries-zoom-level", newZoomLevel.toString());
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(1, zoomLevel - 1);
    setZoomLevel(newZoomLevel);
    localStorage.setItem("galleries-zoom-level", newZoomLevel.toString());
  };

  const handleCreateGallery = async () => {
    try {
      setIsCreating(true);
      await createGallery(newGallery);
      setIsCreateDialogOpen(false);
      setNewGallery({ name: "", description: "" });
      mutate();
      toast({
        title: "Success",
        description: "Gallery created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create gallery",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicateGallery = async (
    galleryId: string,
    galleryName: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent navigation to gallery

    try {
      setDuplicatingGalleryId(galleryId);
      await duplicateGallery(galleryId);
      mutate();
      toast({
        title: "Success",
        description: `Gallery "${galleryName}" duplicated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate gallery",
        variant: "destructive",
      });
    } finally {
      setDuplicatingGalleryId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <PageTitle title="Galleries" count={data?.pagination.total} />

          <div className="space-y-4">
            {/* Search and Controls Row */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Left side: Search */}
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Search galleries..."
                  value={searchInput}
                  onChange={handleSearchInput}
                  className="w-[200px]"
                />
              </div>

              {/* Right side: Page Size, Zoom Controls and Create Button */}
              <div className="flex items-center gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Zoom Controls */}
                <div className="hidden lg:flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoomLevel === 1}
                    title="Zoom out (more columns)"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-3 min-w-[60px] text-center">
                    {zoomConfigs[zoomLevel as keyof typeof zoomConfigs].label}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoomLevel === 5}
                    title="Zoom in (fewer columns)"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Create Gallery Button */}
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Gallery
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Gallery</DialogTitle>
                      <DialogDescription>
                        Create a new gallery to organize your images
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={newGallery.name}
                          onChange={(e) =>
                            setNewGallery((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter gallery name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newGallery.description}
                          onChange={(e) =>
                            setNewGallery((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Enter gallery description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateGallery}
                        disabled={!newGallery.name || isCreating}
                      >
                        {isCreating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Gallery
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive">
              Error loading galleries
            </div>
          ) : data?.galleries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No galleries found
            </div>
          ) : (
            <>
              <div className={getGridClasses()}>
                {data?.galleries.map((gallery, index) => (
                  <div
                    key={gallery._id}
                    className="group relative bg-card rounded-lg border p-6 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/galleries/${gallery._id}`)}
                  >
                    <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-md bg-muted">
                      {/* Image count badge */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                          {gallery.imageIds.length}
                        </span>
                      </div>

                      {/* Duplicate button - appears on hover */}
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) =>
                            handleDuplicateGallery(gallery._id, gallery.name, e)
                          }
                          disabled={duplicatingGalleryId === gallery._id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm hover:bg-background transition-colors"
                          title="Duplicate gallery"
                        >
                          {duplicatingGalleryId === gallery._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span className="text-xs font-medium">
                            {duplicatingGalleryId === gallery._id
                              ? "Duplicating..."
                              : "Duplicate"}
                          </span>
                        </button>
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
                      <h2 className="text-xl font-semibold tracking-tight">
                        {gallery.name}
                      </h2>
                      {gallery.description && (
                        <p className="text-muted-foreground line-clamp-2">
                          {gallery.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data?.pagination && (
                <div className="mt-8 space-y-4">
                  {/* Pagination Info */}
                  <div className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
                      to{" "}
                      {Math.min(
                        data.pagination.page * data.pagination.limit,
                        data.pagination.total
                      )}{" "}
                      of {data.pagination.total} galleries
                    </p>
                  </div>

                  {/* Pagination Controls - only show if more than 1 page */}
                  {data.pagination.pages > 1 && (
                    <Pagination
                      className="flex justify-center"
                      currentPage={data.pagination.page}
                      totalPages={data.pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
