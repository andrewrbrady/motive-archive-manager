"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import { CloudflareImage } from "@/components/ui/CloudflareImage";

export default function GalleriesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Add mounted ref for cleanup guard - initialize as false, set to true in useEffect
  const mounted = useRef(false);
  const debouncedSearchRef = useRef<any>(null);

  // Extract search params or use defaults
  const page = Number(searchParams?.get("page") || "1");
  const pageSize = Number(searchParams?.get("limit") || "20");
  const searchQuery = searchParams?.get("search") || "";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [duplicatingGalleryId, setDuplicatingGalleryId] = useState<
    string | null
  >(null);

  // Zoom control state with localStorage persistence
  const [zoomLevel, setZoomLevel] = useState(3); // Always start with default

  // Mounted ref cleanup - CRITICAL: Set mounted to true only after component mounts
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Cancel any pending debounced operations
      if (debouncedSearchRef.current?.cancel) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, []);

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

  // Debug logging - let's see what's actually happening
  useEffect(() => {
    console.log("🐛 GalleriesClient State:", {
      isLoading,
      error: error?.message,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : null,
      galleriesArray: data?.galleries,
      galleriesLength: data?.galleries?.length,
      galleriesType: typeof data?.galleries,
      firstGallery: data?.galleries?.[0],
      pagination: data?.pagination,
      renderCondition: data?.galleries && data.galleries.length > 0,
    });
  }, [data, isLoading, error]);

  const [newGallery, setNewGallery] = useState({
    name: "",
    description: "",
  });

  // Handle search with debounce - ENHANCED MOUNTED CHECK
  const [debouncedSetSearch, debouncedSetSearchState] = useDebounce(
    (value: string) => {
      // DOUBLE CHECK: Component must be mounted AND React must allow updates
      if (!mounted.current) {
        console.log(
          "🛡️ Preventing debounced search update - component unmounted"
        );
        return;
      }

      try {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("page", "1"); // Reset to first page on new search

        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }

        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      } catch (error) {
        console.warn(
          "🛡️ Router navigation failed (component may be unmounted):",
          error
        );
      }
    },
    500
  );

  // Store the debounced function reference for cleanup
  useEffect(() => {
    debouncedSearchRef.current = { cancel: debouncedSetSearchState.cancel };
  }, [debouncedSetSearchState]);

  // Handle search input - make it more defensive
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Check if component is still mounted before any state updates
      if (!mounted.current) {
        console.log("🛡️ Preventing search input update - component unmounted");
        return;
      }

      const value = e.target.value;
      setSearchInput(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
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
          <PageTitle title="Galleries" count={data?.pagination?.total} />

          <div className="space-y-4">
            {/* Search and Controls Row */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Left side: Search */}
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search galleries..."
                  value={searchInput}
                  onChange={handleSearchInput}
                  className="w-[250px]"
                />
              </div>

              {/* Right side: Controls */}
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
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="60">60</SelectItem>
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
                      Create Gallery
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
                            setNewGallery({
                              ...newGallery,
                              name: e.target.value,
                            })
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
                        onClick={() => setIsCreateDialogOpen(false)}
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
                          "Create Gallery"
                        )}
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
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load galleries</p>
                <Button onClick={() => mutate()} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : data?.galleries && data.galleries.length > 0 ? (
            <>
              <div className={getGridClasses()}>
                {data.galleries.map((gallery, index) => (
                  <div
                    key={gallery._id}
                    className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/galleries/${gallery._id}`)}
                  >
                    {/* Gallery Image */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {gallery.thumbnailImage?.url ? (
                        <CloudflareImage
                          src={gallery.thumbnailImage.url}
                          alt={gallery.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          priority={index < 8}
                          isAboveFold={index < 8}
                          showError={true}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) =>
                              handleDuplicateGallery(
                                gallery._id,
                                gallery.name,
                                e
                              )
                            }
                            disabled={duplicatingGalleryId === gallery._id}
                            title="Duplicate gallery"
                          >
                            {duplicatingGalleryId === gallery._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Image count badge */}
                      {gallery.imageIds && gallery.imageIds.length > 0 && (
                        <div className="absolute bottom-2 left-2">
                          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {gallery.imageIds.length} images
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gallery Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                        {gallery.name}
                      </h3>
                      {gallery.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {gallery.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>
                          Created{" "}
                          {new Date(gallery.createdAt).toLocaleDateString()}
                        </span>
                        {gallery.updatedAt &&
                          gallery.updatedAt !== gallery.createdAt && (
                            <span>
                              Updated{" "}
                              {new Date(gallery.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data?.pagination && data.pagination.pages > 1 && (
                <div className="mt-8 space-y-4">
                  {/* Pagination Info */}
                  <div className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {((data.pagination?.page ?? 1) - 1) *
                        (data.pagination?.limit ?? 20) +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        (data.pagination?.page ?? 1) *
                          (data.pagination?.limit ?? 20),
                        data.pagination?.total ?? 0
                      )}{" "}
                      of {data.pagination?.total ?? 0} galleries
                    </p>
                  </div>

                  {/* Pagination Controls */}
                  <Pagination
                    className="flex justify-center"
                    currentPage={data.pagination?.page ?? 1}
                    totalPages={data.pagination?.pages ?? 1}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No galleries found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No galleries match your search criteria"
                  : "Create your first gallery to get started"}
              </p>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Gallery
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
                          setNewGallery({
                            ...newGallery,
                            name: e.target.value,
                          })
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
                      onClick={() => setIsCreateDialogOpen(false)}
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
                        "Create Gallery"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
