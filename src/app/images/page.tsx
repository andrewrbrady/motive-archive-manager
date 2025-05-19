"use client";

import { useState, useMemo, useEffect } from "react";
import { SimpleImageGallery } from "@/components/cars/SimpleImageGallery";
import { useImages } from "@/hooks/use-images";
import { ImageData } from "@/app/images/columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUploadWithProgress from "@/components/ui/ImageUploadWithProgress";
import Pagination from "@/components/ui/pagination";
import { Plus, Filter, Search, Loader2, FilterX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function ImagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract search params or use defaults
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("limit") || "20");
  const searchQuery = searchParams.get("search") || "";

  // Get filter values from URL
  const angleFilter = searchParams.get("angle") || "";
  const movementFilter = searchParams.get("movement") || "";
  const todFilter = searchParams.get("tod") || "";
  const viewFilter = searchParams.get("view") || "";

  // State for filters and UI
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [angle, setAngle] = useState(angleFilter || "all");
  const [movement, setMovement] = useState(movementFilter || "all");
  const [tod, setTod] = useState(todFilter || "all");
  const [view, setView] = useState(viewFilter || "all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch images with filters
  const { data, isLoading, error, mutate } = useImages({
    page,
    limit: pageSize,
    search: searchQuery,
    angle: angleFilter || undefined,
    movement: movementFilter || undefined,
    tod: todFilter || undefined,
    view: viewFilter || undefined,
    carId: "all",
  });

  // Extract unique metadata values from images
  const metadataOptions = useMemo(() => {
    if (!data?.images)
      return {
        angles: [],
        movements: [],
        tods: [],
        views: [],
      };

    const angles = new Set<string>();
    const movements = new Set<string>();
    const tods = new Set<string>();
    const views = new Set<string>();

    data.images.forEach((image) => {
      if (image.metadata?.angle) angles.add(image.metadata.angle);
      if (image.metadata?.movement) movements.add(image.metadata.movement);
      if (image.metadata?.tod) tods.add(image.metadata.tod);
      if (image.metadata?.view) views.add(image.metadata.view);
    });

    return {
      angles: Array.from(angles),
      movements: Array.from(movements),
      tods: Array.from(tods),
      views: Array.from(views),
    };
  }, [data?.images]);

  // Map Image type to ImageData type
  const mappedImages = useMemo(() => {
    if (!data?.images) return undefined;

    return data.images.map((image, index) => ({
      _id: image.id || `temp-${index}`, // Ensure unique IDs
      cloudflareId: image.id,
      url: image.url,
      filename: image.filename,
      width: 0, // Default values since these aren't in the Image type
      height: 0,
      metadata: image.metadata || {},
      carId: "",
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));
  }, [data?.images]);

  // Update search when input changes (matching galleries page behavior)
  useEffect(() => {
    // Create a timeout to avoid too many API calls while typing
    const timeoutId = setTimeout(() => {
      if (searchInput !== searchQuery) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1"); // Reset to first page on new search

        if (searchInput) {
          params.set("search", searchInput);
        } else {
          params.delete("search");
        }

        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchQuery, searchParams, pathname, router]);

  // Helper function to update filter in URL
  const updateFilter = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Handle filter changes
  const handleAngleChange = (value: string) => {
    setAngle(value);
    updateFilter("angle", value);
  };

  const handleMovementChange = (value: string) => {
    setMovement(value);
    updateFilter("movement", value);
  };

  const handleTodChange = (value: string) => {
    setTod(value);
    updateFilter("tod", value);
  };

  const handleViewChange = (value: string) => {
    setView(value);
    updateFilter("view", value);
  };

  // Check if any filters are active
  const hasActiveFilters =
    angleFilter || movementFilter || todFilter || viewFilter || searchQuery;

  // Reset all filters
  const resetAllFilters = () => {
    setAngle("all");
    setMovement("all");
    setTod("all");
    setView("all");
    setSearchInput("");

    // Remove all filter params from URL
    const params = new URLSearchParams();
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Handle image upload
  const handleUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }

      // Update the image list
      mutate();
      setIsUploadDialogOpen(false);

      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Image Gallery
            </h1>
            <p className="text-muted-foreground">
              Browse and manage your car images
            </p>
          </div>

          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Images
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
                <DialogDescription>
                  Select images to upload to your gallery
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <ImageUploadWithProgress
                  multiple={true}
                  onComplete={() => {
                    mutate();
                    setIsUploadDialogOpen(false);
                    toast({
                      title: "Success",
                      description: "Images uploaded successfully",
                    });
                  }}
                  onError={() => {
                    toast({
                      title: "Error",
                      description: "Failed to upload images",
                      variant: "destructive",
                    });
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2 max-w-sm">
            <Input
              placeholder="Search images..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Angle filter */}
            <Select value={angle} onValueChange={handleAngleChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Angle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All angles</SelectItem>
                {metadataOptions.angles.map((angleOption) => (
                  <SelectItem key={angleOption} value={angleOption}>
                    {angleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Movement filter */}
            <Select value={movement} onValueChange={handleMovementChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Movement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All movements</SelectItem>
                {metadataOptions.movements.map((movementOption) => (
                  <SelectItem key={movementOption} value={movementOption}>
                    {movementOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time of Day filter */}
            <Select value={tod} onValueChange={handleTodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time of Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All times</SelectItem>
                {metadataOptions.tods.map((todOption) => (
                  <SelectItem key={todOption} value={todOption}>
                    {todOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View filter */}
            <Select value={view} onValueChange={handleViewChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All views</SelectItem>
                {metadataOptions.views.map((viewOption) => (
                  <SelectItem key={viewOption} value={viewOption}>
                    {viewOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset filters button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={resetAllFilters}
                title="Reset filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SimpleImageGallery
              data={mappedImages}
              isLoading={isLoading}
              error={error || undefined}
            />

            {data?.pagination && data.pagination.pages > 1 && (
              <Pagination
                className="mt-8 flex justify-center"
                currentPage={data.pagination.page}
                totalPages={data.pagination.pages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
