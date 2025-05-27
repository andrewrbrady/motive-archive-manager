"use client";

import { useState, useMemo, useEffect } from "react";
import { SimpleImageGallery } from "@/components/cars/SimpleImageGallery";
import { CanvasExtensionModal } from "@/components/cars/CanvasExtensionModal";
import { ImageMatteModal } from "@/components/cars/ImageMatteModal";
import { ImageCropModal } from "@/components/cars/ImageCropModal";
import { ImageViewModal } from "@/components/cars/ImageViewModal";
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
import {
  Plus,
  Filter,
  Search,
  Loader2,
  FilterX,
  ChevronsUpDown,
  Check,
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
import { toast } from "@/components/ui/use-toast";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCars } from "@/lib/hooks/query/useCars";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { PageTitle } from "@/components/ui/PageTitle";

// Define the allowed values for each field (from CarImageGalleryV2)
const allowedValues = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
} as const;

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
  const carFilter = searchParams.get("carId") || "";

  // State for filters and UI
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [angle, setAngle] = useState(angleFilter || "all");
  const [movement, setMovement] = useState(movementFilter || "all");
  const [tod, setTod] = useState(todFilter || "all");
  const [view, setView] = useState(viewFilter || "all");
  const [carId, setCarId] = useState(carFilter || "all");
  const [carSearchOpen, setCarSearchOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Canvas extension modal state
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [selectedImageForCanvas, setSelectedImageForCanvas] =
    useState<ImageData | null>(null);

  // Image matte modal state
  const [isMatteModalOpen, setIsMatteModalOpen] = useState(false);
  const [selectedImageForMatte, setSelectedImageForMatte] =
    useState<ImageData | null>(null);

  // Image crop modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] =
    useState<ImageData | null>(null);

  // Image view modal state
  const [isImageViewModalOpen, setIsImageViewModalOpen] = useState(false);
  const [selectedImageForView, setSelectedImageForView] =
    useState<ImageData | null>(null);

  // Zoom control state (1 = smallest, 5 = largest)
  const [zoomLevel, setZoomLevel] = useState(3); // Always start with default

  // Load zoom level from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("images-zoom-level");
    if (saved) {
      const parsedZoom = parseInt(saved, 10);
      if (parsedZoom >= 1 && parsedZoom <= 5) {
        setZoomLevel(parsedZoom);
      }
    }
  }, []);

  // Zoom level configurations
  const zoomConfigs = {
    1: { cols: "xl:grid-cols-8", label: "8 cols" },
    2: { cols: "xl:grid-cols-6", label: "6 cols" },
    3: { cols: "xl:grid-cols-4", label: "4 cols" },
    4: { cols: "xl:grid-cols-3", label: "3 cols" },
    5: { cols: "xl:grid-cols-2", label: "2 cols" },
  };

  // Fetch cars for car filter
  const { data: carsData } = useCars({ limit: 1000, sortDirection: "desc" });

  // Filter cars based on search query
  const filteredCars = useMemo(() => {
    if (!carsData?.cars) return [];
    const filtered = carsData.cars.filter((car) => {
      if (!carSearchQuery) return true;
      const searchStr = `${car.year} ${car.make} ${car.model}`.toLowerCase();
      const searchTerms = carSearchQuery.toLowerCase().split(" ");
      return searchTerms.every((term) => searchStr.includes(term));
    });
    return filtered;
  }, [carsData?.cars, carSearchQuery]);

  // Sort cars by year (newest first), then make, then model
  const sortedCars = useMemo(() => {
    return [...filteredCars].sort((a, b) => {
      // Sort by year descending
      if (a.year !== b.year) return b.year - a.year;
      // Then by make
      if (a.make !== b.make) return a.make.localeCompare(b.make);
      // Then by model
      return a.model.localeCompare(b.model);
    });
  }, [filteredCars]);

  // Get current car name
  const currentCarName = useMemo(() => {
    if (carFilter === "all" || !carFilter) return "All Cars";
    if (!carsData?.cars) return "Loading...";
    const car = carsData.cars.find((c) => c._id === carFilter);
    return car ? `${car.year} ${car.make} ${car.model}` : "All Cars";
  }, [carFilter, carsData?.cars]);

  // Fetch images with filters
  const { data, isLoading, error, mutate } = useImages({
    page,
    limit: pageSize,
    search: searchQuery,
    angle: angleFilter || undefined,
    movement: movementFilter || undefined,
    tod: todFilter || undefined,
    view: viewFilter || undefined,
    carId: carFilter && carFilter !== "all" ? carFilter : "all",
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

  // Extract unique metadata values from images and combine with allowed values
  const metadataOptions = useMemo(() => {
    const extractedOptions = {
      angles: new Set<string>(),
      movements: new Set<string>(),
      tods: new Set<string>(),
      views: new Set<string>(),
    };

    // Add allowed values first
    allowedValues.angle.forEach((angle) => extractedOptions.angles.add(angle));
    allowedValues.movement.forEach((movement) =>
      extractedOptions.movements.add(movement)
    );
    allowedValues.tod.forEach((tod) => extractedOptions.tods.add(tod));
    allowedValues.view.forEach((view) => extractedOptions.views.add(view));

    // Add "unknown" option for each filter
    extractedOptions.angles.add("unknown");
    extractedOptions.movements.add("unknown");
    extractedOptions.tods.add("unknown");
    extractedOptions.views.add("unknown");

    // Add any additional values found in the actual images
    if (data?.images) {
      data.images.forEach((image) => {
        if (image.metadata?.angle)
          extractedOptions.angles.add(image.metadata.angle);
        if (image.metadata?.movement)
          extractedOptions.movements.add(image.metadata.movement);
        if (image.metadata?.tod) extractedOptions.tods.add(image.metadata.tod);
        if (image.metadata?.view)
          extractedOptions.views.add(image.metadata.view);
      });
    }

    return {
      angles: Array.from(extractedOptions.angles).sort(),
      movements: Array.from(extractedOptions.movements).sort(),
      tods: Array.from(extractedOptions.tods).sort(),
      views: Array.from(extractedOptions.views).sort(),
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
      carId: (image as any).carId || "", // Cast to any since API returns carId but type doesn't include it
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));
  }, [data?.images]);

  // Handle filter changes
  const handleAngleChange = (value: string) => {
    setAngle(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set("angle", value);
    } else {
      params.delete("angle");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleMovementChange = (value: string) => {
    setMovement(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set("movement", value);
    } else {
      params.delete("movement");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTodChange = (value: string) => {
    setTod(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set("tod", value);
    } else {
      params.delete("tod");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleViewChange = (value: string) => {
    setView(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set("view", value);
    } else {
      params.delete("view");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCarChange = (value: string) => {
    setCarId(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page on filter change
    if (value && value !== "all") {
      params.set("carId", value);
    } else {
      params.delete("carId");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Check if any filters are active
  const hasActiveFilters =
    angleFilter ||
    movementFilter ||
    todFilter ||
    viewFilter ||
    carFilter ||
    searchQuery;

  // Reset all filters
  const resetAllFilters = () => {
    setAngle("all");
    setMovement("all");
    setTod("all");
    setView("all");
    setCarId("all");
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

  // Handle page size change
  const handlePageSizeChange = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset to first page when changing page size
    params.set("limit", newPageSize);
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

  // Handle canvas extension
  const handleCanvasExtension = (image: ImageData) => {
    setSelectedImageForCanvas(image);
    setIsCanvasModalOpen(true);
  };

  // Handle image matte
  const handleImageMatte = (image: ImageData) => {
    setSelectedImageForMatte(image);
    setIsMatteModalOpen(true);
  };

  // Handle image crop
  const handleImageCrop = (image: ImageData) => {
    setSelectedImageForCrop(image);
    setIsCropModalOpen(true);
  };

  // Handle image view
  const handleImageView = (image: ImageData) => {
    setSelectedImageForView(image);
    setIsImageViewModalOpen(true);
  };

  // Handle image navigation in modal
  const handleImageNavigate = (image: ImageData) => {
    setSelectedImageForView(image);
  };

  // Zoom control functions
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(5, zoomLevel + 1);
    setZoomLevel(newZoomLevel);
    localStorage.setItem("images-zoom-level", newZoomLevel.toString());
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(1, zoomLevel - 1);
    setZoomLevel(newZoomLevel);
    localStorage.setItem("images-zoom-level", newZoomLevel.toString());
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <PageTitle title="Image Gallery" count={data?.pagination.total} />

          <div className="space-y-4">
            {/* Search, Filters, and Controls Row */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Left side: Search and Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <Input
                  placeholder="Search images..."
                  value={searchInput}
                  onChange={handleSearchInput}
                  className="w-[200px]"
                />

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

                {/* Car filter */}
                <Popover open={carSearchOpen} onOpenChange={setCarSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={carSearchOpen}
                      className="w-[200px] justify-between"
                    >
                      {currentCarName}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[250px] p-0 bg-background border shadow-md"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                  >
                    <Command
                      className="w-full rounded-lg bg-background"
                      shouldFilter={false}
                    >
                      <CommandInput
                        placeholder="Search cars..."
                        value={carSearchQuery}
                        onValueChange={setCarSearchQuery}
                        className="h-9 border-none focus:ring-0"
                      />
                      <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                        No cars found.
                      </CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            handleCarChange("all");
                            setCarSearchOpen(false);
                            setCarSearchQuery("");
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0 pointer-events-none",
                              carFilter === "all" || !carFilter
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="pointer-events-none">All Cars</span>
                        </CommandItem>
                        {sortedCars.map((car) => (
                          <CommandItem
                            key={car._id}
                            value={car._id}
                            onSelect={() => {
                              handleCarChange(car._id);
                              setCarSearchOpen(false);
                              setCarSearchQuery("");
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 flex-shrink-0 pointer-events-none",
                                carFilter === car._id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="pointer-events-none">
                              {car.year} {car.make} {car.model}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

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

              {/* Right side: Zoom Controls and Upload Button */}
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
                      <SelectItem value="200">200</SelectItem>
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

                {/* Upload Button */}
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
                onCanvasExtension={handleCanvasExtension}
                onImageMatte={handleImageMatte}
                onImageCrop={handleImageCrop}
                onImageView={handleImageView}
                zoomLevel={zoomLevel}
                mutate={mutate}
              />

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
                      of {data.pagination.total} images
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

          {/* Canvas Extension Modal */}
          <CanvasExtensionModal
            isOpen={isCanvasModalOpen}
            onClose={() => {
              setIsCanvasModalOpen(false);
              setSelectedImageForCanvas(null);
            }}
            image={selectedImageForCanvas}
          />

          {/* Image Matte Modal */}
          <ImageMatteModal
            isOpen={isMatteModalOpen}
            onClose={() => {
              setIsMatteModalOpen(false);
              setSelectedImageForMatte(null);
            }}
            image={selectedImageForMatte}
          />

          {/* Image Crop Modal */}
          <ImageCropModal
            isOpen={isCropModalOpen}
            onClose={() => {
              setIsCropModalOpen(false);
              setSelectedImageForCrop(null);
            }}
            image={selectedImageForCrop}
          />

          {/* Image View Modal */}
          <ImageViewModal
            isOpen={isImageViewModalOpen}
            onClose={() => {
              setIsImageViewModalOpen(false);
              setSelectedImageForView(null);
            }}
            image={selectedImageForView}
            images={mappedImages}
            onCanvasExtension={handleCanvasExtension}
            onImageMatte={handleImageMatte}
            onImageCrop={handleImageCrop}
            onNavigate={handleImageNavigate}
          />
        </div>
      </main>
    </div>
  );
}
