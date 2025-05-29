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
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageData } from "@/app/images/columns";
import { useDebounce } from "use-debounce";
import { useCars } from "@/lib/hooks/query/useCars";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

// Update images per page to match 5x4 grid
const IMAGES_PER_PAGE = 20; // 5 columns x 4 rows

interface GalleryImageSelectorProps {
  selectedImageIds: string[];
  onImageSelect: (image: ImageData) => void;
  className?: string;
}

// Add this new component for pagination
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

export function GalleryImageSelector({
  selectedImageIds,
  onImageSelect,
  className,
}: GalleryImageSelectorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Fetch all cars by setting a high limit
  const { data: carsData } = useCars({ limit: 1000, sortDirection: "desc" });
  const [carSearchOpen, setCarSearchOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState("");

  // Get current filter values from URL
  const currentSearch = searchParams?.get("search") || undefined;
  const currentAngle = searchParams?.get("angle") || undefined;
  const currentMovement = searchParams?.get("movement") || undefined;
  const currentTod = searchParams?.get("tod") || undefined;
  const currentView = searchParams?.get("view") || undefined;
  const currentCarId = searchParams?.get("carId") || undefined;
  const currentPage = parseInt(searchParams?.get("page") || "1");

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
      if (a.year !== b.year) return b.year - a.year;
      if (a.make !== b.make) return a.make.localeCompare(b.make);
      return a.model.localeCompare(b.model);
    });
  }, [filteredCars]);

  // Get current car name
  const currentCarName = React.useMemo(() => {
    if (currentCarId === "all") return "All Cars";
    if (!carsData?.cars) return "Loading...";
    const car = carsData.cars.find((c) => c._id === currentCarId);
    return car ? `${car.year} ${car.make} ${car.model}` : "All Cars";
  }, [currentCarId, carsData?.cars]);

  const { data, isLoading, error, setFilter, mutate } = useImages({
    limit: IMAGES_PER_PAGE,
    carId: currentCarId || "all",
    angle: currentAngle,
    movement: currentMovement,
    tod: currentTod,
    view: currentView,
    page: currentPage,
    search: currentSearch,
  });

  // Handle search with debounce
  const [debouncedSetSearch] = useDebounce((value: string) => {
    handleFilterChange("search", value || null);
  }, 500);

  // Handle search input
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearch(e.target.value);
    },
    [debouncedSetSearch]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      const newSearchParams = new URLSearchParams(
        searchParams?.toString() || ""
      );

      if (value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }

      if (key !== "page") {
        newSearchParams.set("page", "1");
      }

      router.replace(`${pathname}?${newSearchParams.toString()}`, {
        scroll: false,
      });
    },
    [searchParams, router, pathname]
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (page: number) => {
      handleFilterChange("page", page.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [handleFilterChange]
  );

  // Get cars safely
  const cars = carsData?.cars ?? [];

  // Effect to handle selection state changes
  useEffect(() => {
    mutate();
  }, [selectedImageIds, mutate]);

  // Effect to refresh data when filters change
  useEffect(() => {
    mutate();
  }, [
    currentSearch,
    currentAngle,
    currentMovement,
    currentTod,
    currentView,
    currentCarId,
    currentPage,
    mutate,
  ]);

  // Handle image selection with optimistic update
  const handleImageSelection = useCallback(
    (image: ImageData) => {
      onImageSelect(image);
      mutate();
    },
    [onImageSelect, mutate]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="w-full md:w-[250px]">
            <Popover
              open={carSearchOpen}
              onOpenChange={(open) => {
                setCarSearchOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={carSearchOpen}
                  className="w-full justify-between"
                  onClick={() => {}}
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
                onInteractOutside={(e) => {}}
                onEscapeKeyDown={() => {}}
              >
                <Command
                  className="w-full rounded-lg bg-background"
                  shouldFilter={false}
                  onKeyDown={(e) => {}}
                >
                  <CommandInput
                    placeholder="Search cars..."
                    value={carSearchQuery}
                    onValueChange={(value) => {
                      setCarSearchQuery(value);
                    }}
                    className="h-9 border-none focus:ring-0"
                  />
                  <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                    No cars found.
                  </CommandEmpty>
                  <CommandGroup
                    className="max-h-[300px] overflow-y-auto p-1"
                    onClick={(e) => {}}
                  >
                    <CommandItem
                      onSelect={() => {
                        setCarSearchQuery("");
                        setCarSearchOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center">
                        <Car className="mr-2 h-4 w-4" />
                        All Cars
                      </div>
                    </CommandItem>
                    {filteredCars.map((car) => (
                      <CommandItem
                        key={car._id}
                        onSelect={() => {
                          setCarSearchQuery(
                            `${car.year} ${car.make} ${car.model}`
                          );
                          setCarSearchOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center">
                          <Car className="mr-2 h-4 w-4" />
                          {car.year} {car.make} {car.model}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Input
            placeholder="Search images..."
            value={currentSearch || ""}
            onChange={handleSearchInput}
            className="w-full md:w-[250px]"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={currentAngle || "all"}
            onValueChange={(value) =>
              handleFilterChange("angle", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Angle" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
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
            value={currentView || "all"}
            onValueChange={(value) =>
              handleFilterChange("view", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Views</SelectItem>
              <SelectItem value="exterior">Exterior</SelectItem>
              <SelectItem value="interior">Interior</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentMovement || "all"}
            onValueChange={(value) =>
              handleFilterChange("movement", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Movement" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Movement</SelectItem>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="rolling">Rolling</SelectItem>
              <SelectItem value="tracking">Tracking</SelectItem>
              <SelectItem value="panning">Panning</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentTod || "all"}
            onValueChange={(value) =>
              handleFilterChange("tod", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time of Day" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="golden">Golden Hour</SelectItem>
              <SelectItem value="blue">Blue Hour</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive">Error loading images</div>
      ) : !data?.images.length ? (
        <div className="text-center text-muted-foreground">No images found</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.images.map((image) => {
              // Convert Image type to ImageData if needed
              const imageData =
                "id" in image
                  ? {
                      _id: image.id,
                      cloudflareId: image.id,
                      url: image.url,
                      filename: image.filename,
                      width: 0,
                      height: 0,
                      metadata: image.metadata || {},
                      carId: "",
                      createdAt: image.createdAt,
                      updatedAt: image.updatedAt,
                    }
                  : image;

              const isSelected = selectedImageIds.includes(imageData._id);
              return (
                <div
                  key={imageData._id}
                  className={cn(
                    "group relative rounded-md overflow-hidden bg-muted cursor-pointer min-h-[200px] flex flex-col",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => handleImageSelection(imageData)}
                >
                  <div className="relative flex-1 flex items-center justify-center bg-background">
                    <img
                      src={imageData.url}
                      alt={imageData.filename}
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
                      {imageData.metadata?.angle && (
                        <span className="mr-2">{imageData.metadata.angle}</span>
                      )}
                      {imageData.metadata?.view && (
                        <span>{imageData.metadata.view}</span>
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
  );
}
