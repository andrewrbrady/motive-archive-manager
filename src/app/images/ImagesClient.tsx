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

// Define the allowed values for each field used in image metadata filtering
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

export default function ImagesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract search params or use defaults
  const page = Number(searchParams?.get("page") || "1");
  const pageSize = Number(searchParams?.get("limit") || "20");
  const searchQuery = searchParams?.get("search") || "";

  // Get filter values from URL
  const angleFilter = searchParams?.get("angle") || "";
  const movementFilter = searchParams?.get("movement") || "";
  const todFilter = searchParams?.get("tod") || "";
  const viewFilter = searchParams?.get("view") || "";
  const carFilter = searchParams?.get("carId") || "";

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
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", "1"); // Reset to first page on new search
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  }, 500);

  // Handle search input change
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetSearch(value);
  };

  // Update URL with new filter value
  const updateUrlWithFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", "1"); // Reset to first page on filter change

    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Filter change handlers
  const handleAngleChange = (value: string) => {
    setAngle(value);
    updateUrlWithFilter("angle", value);
  };

  const handleMovementChange = (value: string) => {
    setMovement(value);
    updateUrlWithFilter("movement", value);
  };

  const handleTodChange = (value: string) => {
    setTod(value);
    updateUrlWithFilter("tod", value);
  };

  const handleViewChange = (value: string) => {
    setView(value);
    updateUrlWithFilter("view", value);
  };

  const handleCarChange = (value: string) => {
    setCarId(value);
    updateUrlWithFilter("carId", value);
    setCarSearchOpen(false);
  };

  // Reset all filters
  const resetAllFilters = () => {
    setAngle("all");
    setMovement("all");
    setTod("all");
    setView("all");
    setCarId("all");
    setSearchInput("");

    // Clear URL params except page
    const params = new URLSearchParams();
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("limit", newPageSize);
    params.set("page", "1"); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  // Modal handlers
  const handleCanvasExtension = (image: ImageData) => {
    setSelectedImageForCanvas(image);
    setIsCanvasModalOpen(true);
  };

  const handleImageMatte = (image: ImageData) => {
    setSelectedImageForMatte(image);
    setIsMatteModalOpen(true);
  };

  const handleImageCrop = (image: ImageData) => {
    setSelectedImageForCrop(image);
    setIsCropModalOpen(true);
  };

  const handleImageView = (image: ImageData) => {
    setSelectedImageForView(image);
    setIsImageViewModalOpen(true);
  };

  const handleImageNavigate = (image: ImageData) => {
    router.push(`/cars/${image.carId}?tab=gallery`);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (zoomLevel < 5) {
      const newZoom = zoomLevel + 1;
      setZoomLevel(newZoom);
      localStorage.setItem("images-zoom-level", newZoom.toString());
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 1) {
      const newZoom = zoomLevel - 1;
      setZoomLevel(newZoom);
      localStorage.setItem("images-zoom-level", newZoom.toString());
    }
  };

  // Calculate active filters count
  const activeFiltersCount =
    [angle, movement, tod, view, carId].filter(
      (filter) => filter !== "all" && filter !== ""
    ).length + (searchQuery ? 1 : 0);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-2">Failed to load images</p>
              <Button onClick={() => mutate()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <PageTitle title="Images" count={data?.pagination?.total || 0}>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2 text-muted-foreground">
                  {zoomConfigs[zoomLevel as keyof typeof zoomConfigs].label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Dialog */}
              <Dialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Images</DialogTitle>
                    <DialogDescription>
                      Select images to upload to the gallery.
                    </DialogDescription>
                  </DialogHeader>
                  <ImageUploadWithProgress
                    onComplete={() => {
                      toast({
                        title: "Upload successful",
                        description: "Images uploaded successfully",
                      });
                      // Refresh the images list
                      mutate();
                      setIsUploadDialogOpen(false);
                    }}
                    onError={(error) => {
                      toast({
                        title: "Upload failed",
                        description:
                          error || "Failed to upload images. Please try again.",
                        variant: "destructive",
                      });
                    }}
                    multiple
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </PageTitle>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search images..."
                value={searchInput}
                onChange={handleSearchInput}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Car Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Car</label>
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
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search cars..."
                        value={carSearchQuery}
                        onValueChange={setCarSearchQuery}
                      />
                      <CommandEmpty>No cars found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        <CommandItem
                          value="all"
                          onSelect={() => handleCarChange("all")}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 pointer-events-none",
                              carId === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="pointer-events-none">All Cars</span>
                        </CommandItem>
                        {sortedCars.map((car) => (
                          <CommandItem
                            key={car._id}
                            value={`${car.year} ${car.make} ${car.model}`}
                            onSelect={() => handleCarChange(car._id)}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 pointer-events-none",
                                carId === car._id ? "opacity-100" : "opacity-0"
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
              </div>

              {/* Angle Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Angle</label>
                <Select value={angle} onValueChange={handleAngleChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Angles</SelectItem>
                    {allowedValues.angle.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">View</label>
                <Select value={view} onValueChange={handleViewChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Views</SelectItem>
                    {allowedValues.view.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Movement Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Movement</label>
                <Select value={movement} onValueChange={handleMovementChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Movement</SelectItem>
                    {allowedValues.movement.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time of Day Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Time of Day</label>
                <Select value={tod} onValueChange={handleTodChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Times</SelectItem>
                    {allowedValues.tod.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAllFilters}
                  className="mt-6"
                >
                  <FilterX className="h-4 w-4 mr-2" />
                  Clear Filters ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Images Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <SimpleImageGallery
                data={(data?.images || []) as unknown as ImageData[]}
                onCanvasExtension={handleCanvasExtension}
                onImageMatte={handleImageMatte}
                onImageCrop={handleImageCrop}
                onImageView={handleImageView}
                zoomLevel={zoomLevel}
                mutate={mutate}
              />

              {/* Pagination */}
              {data && data.pagination.total > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, data.pagination.total)} of{" "}
                      {data.pagination.total} images
                    </span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(data.pagination.total / pageSize)}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Modals */}
          {selectedImageForCanvas && (
            <CanvasExtensionModal
              isOpen={isCanvasModalOpen}
              onClose={() => {
                setIsCanvasModalOpen(false);
                setSelectedImageForCanvas(null);
                mutate();
              }}
              image={selectedImageForCanvas}
            />
          )}

          {selectedImageForMatte && (
            <ImageMatteModal
              isOpen={isMatteModalOpen}
              onClose={() => {
                setIsMatteModalOpen(false);
                setSelectedImageForMatte(null);
                mutate();
              }}
              image={selectedImageForMatte}
            />
          )}

          {selectedImageForCrop && (
            <ImageCropModal
              isOpen={isCropModalOpen}
              onClose={() => {
                setIsCropModalOpen(false);
                setSelectedImageForCrop(null);
                mutate();
              }}
              image={selectedImageForCrop}
            />
          )}

          {selectedImageForView && (
            <ImageViewModal
              isOpen={isImageViewModalOpen}
              onClose={() => {
                setIsImageViewModalOpen(false);
                setSelectedImageForView(null);
              }}
              image={selectedImageForView}
              images={(data?.images || []) as unknown as ImageData[]}
              onNavigate={handleImageNavigate}
            />
          )}
        </div>
      </main>
    </div>
  );
}
