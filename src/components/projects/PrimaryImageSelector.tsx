import React, { useCallback, useEffect, useState } from "react";
import { useImages } from "@/hooks/use-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  X,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageData } from "@/app/images/columns";
import { useDebounce } from "use-debounce";
import { useCars } from "@/lib/hooks/query/useCars";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const IMAGES_PER_PAGE = 20; // 5 columns x 4 rows

interface PrimaryImageSelectorProps {
  selectedImageId?: string;
  onImageSelect: (imageId: string | null) => void;
  className?: string;
}

// Pagination component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {currentPage > 3 && totalPages > 5 && (
        <>
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
          <span className="text-muted-foreground">...</span>
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}

      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          <span className="text-muted-foreground">...</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PrimaryImageSelector({
  selectedImageId,
  onImageSelect,
  className,
}: PrimaryImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAngle, setSelectedAngle] = useState<string>("all");
  const [selectedView, setSelectedView] = useState<string>("all");
  const [selectedMovement, setSelectedMovement] = useState<string>("all");
  const [selectedTod, setSelectedTod] = useState<string>("all");
  const [selectedCarId, setSelectedCarId] = useState<string>("all");
  const [carSearchOpen, setCarSearchOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState("");

  // Fetch all cars by setting a high limit
  const { data: carsData } = useCars({ limit: 1000, sortDirection: "desc" });

  // Filter cars based on search query
  const filteredCars = React.useMemo(() => {
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
  const sortedCars = React.useMemo(() => {
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
  const currentCarName = React.useMemo(() => {
    if (selectedCarId === "all") return "All Cars";
    if (!carsData?.cars) return "Loading...";
    const car = carsData.cars.find((c) => c._id === selectedCarId);
    return car ? `${car.year} ${car.make} ${car.model}` : "All Cars";
  }, [selectedCarId, carsData?.cars]);

  const { data, isLoading, error } = useImages({
    limit: IMAGES_PER_PAGE,
    carId: selectedCarId === "all" ? undefined : selectedCarId,
    angle: selectedAngle === "all" ? undefined : selectedAngle,
    movement: selectedMovement === "all" ? undefined : selectedMovement,
    tod: selectedTod === "all" ? undefined : selectedTod,
    view: selectedView === "all" ? undefined : selectedView,
    page: currentPage,
    search: searchQuery || undefined,
  });

  // Handle search with debounce
  const [debouncedSetSearch] = useDebounce((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  }, 500);

  // Handle search input
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearch(e.target.value);
    },
    [debouncedSetSearch]
  );

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setCurrentPage(1); // Reset to first page when changing filters

    switch (key) {
      case "angle":
        setSelectedAngle(value);
        break;
      case "view":
        setSelectedView(value);
        break;
      case "movement":
        setSelectedMovement(value);
        break;
      case "tod":
        setSelectedTod(value);
        break;
      case "carId":
        setSelectedCarId(value);
        break;
    }
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle image selection
  const handleImageSelection = useCallback(
    (imageId: string) => {
      onImageSelect(imageId);
      setIsOpen(false);
    },
    [onImageSelect]
  );

  // Reset filters when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCurrentPage(1);
      setSearchQuery("");
      setSelectedAngle("all");
      setSelectedView("all");
      setSelectedMovement("all");
      setSelectedTod("all");
      setSelectedCarId("all");
      setCarSearchQuery("");
    }
  }, []);

  // Get selected image info for display
  const selectedImageInfo = React.useMemo(() => {
    if (!selectedImageId || !data?.images) return null;
    return data.images.find((img: any) => {
      const imageId = img.id || img._id;
      return imageId === selectedImageId;
    });
  }, [selectedImageId, data?.images]);

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <ImageIcon className="h-4 w-4 mr-2" />
            {selectedImageId ? "Change Primary Image" : "Select Primary Image"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Primary Image</DialogTitle>
            <DialogDescription>
              Choose an image to use as the primary image for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Car Filter */}
                <div className="flex items-center gap-2">
                  <Popover open={carSearchOpen} onOpenChange={setCarSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={carSearchOpen}
                        className="w-[250px] justify-between"
                      >
                        {currentCarName}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search cars..."
                          value={carSearchQuery}
                          onValueChange={setCarSearchQuery}
                        />
                        <CommandEmpty>No cars found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          <CommandItem
                            key="all"
                            value="all"
                            onSelect={() => {
                              handleFilterChange("carId", "all");
                              setCarSearchOpen(false);
                              setCarSearchQuery("");
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 flex-shrink-0",
                                selectedCarId === "all"
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span>All Cars</span>
                          </CommandItem>
                          {sortedCars.map((car) => (
                            <CommandItem
                              key={car._id}
                              value={car._id}
                              onSelect={() => {
                                handleFilterChange("carId", car._id);
                                setCarSearchOpen(false);
                                setCarSearchQuery("");
                              }}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 flex-shrink-0",
                                  selectedCarId === car._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span>
                                {car.year} {car.make} {car.model}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Input
                  placeholder="Search images..."
                  onChange={handleSearchInput}
                  className="w-full md:w-[250px]"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select
                  value={selectedAngle}
                  onValueChange={(value) => handleFilterChange("angle", value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Angle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Angles</SelectItem>
                    <SelectItem value="front">Front</SelectItem>
                    <SelectItem value="front 3/4">Front 3/4</SelectItem>
                    <SelectItem value="side">Side</SelectItem>
                    <SelectItem value="rear 3/4">Rear 3/4</SelectItem>
                    <SelectItem value="rear">Rear</SelectItem>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="under">Under</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedView}
                  onValueChange={(value) => handleFilterChange("view", value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Views</SelectItem>
                    <SelectItem value="exterior">Exterior</SelectItem>
                    <SelectItem value="interior">Interior</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedMovement}
                  onValueChange={(value) =>
                    handleFilterChange("movement", value)
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Movement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Movement</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="rolling">Rolling</SelectItem>
                    <SelectItem value="tracking">Tracking</SelectItem>
                    <SelectItem value="panning">Panning</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTod}
                  onValueChange={(value) => handleFilterChange("tod", value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Time of Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Times</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="golden">Golden Hour</SelectItem>
                    <SelectItem value="blue">Blue Hour</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center text-destructive">
                  Error loading images
                </div>
              ) : !data?.images.length ? (
                <div className="text-center text-muted-foreground">
                  No images found
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {data.images.map((image: any) => {
                      const imageId = image.id || image._id;
                      const isSelected = selectedImageId === imageId;

                      return (
                        <div
                          key={imageId}
                          className={cn(
                            "group relative rounded-md overflow-hidden bg-muted cursor-pointer min-h-[200px] flex flex-col",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={() => handleImageSelection(imageId)}
                        >
                          <div className="relative flex-1 flex items-center justify-center bg-background">
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="max-w-full max-h-[300px] w-auto h-auto object-contain"
                              loading="lazy"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-8 w-8 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="w-full p-2 bg-muted/80 backdrop-blur-sm text-xs border-t border-border">
                            <div className="truncate text-muted-foreground">
                              {image.metadata?.angle && (
                                <span className="mr-2">
                                  {image.metadata.angle}
                                </span>
                              )}
                              {image.metadata?.view && (
                                <span>{image.metadata.view}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {data.pagination.pages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={data.pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Image Display */}
      {selectedImageId && (
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedImageInfo && (
                <img
                  src={selectedImageInfo.url}
                  alt={selectedImageInfo.filename}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div>
                <p className="text-sm font-medium">Primary Image Selected</p>
                <p className="text-xs text-muted-foreground">
                  ID: {selectedImageId}
                </p>
                {selectedImageInfo && (
                  <p className="text-xs text-muted-foreground">
                    {selectedImageInfo.filename}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImageSelect(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
