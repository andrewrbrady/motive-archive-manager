import { useState, useCallback, useMemo, MouseEvent } from "react";
import { useDebounce } from "use-debounce";
import { useImages } from "@/hooks/use-images";
import { Image } from "@/types/upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ImageIcon,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { ImageGallery } from "@/components/ImageGallery";
import { cn } from "@/lib/utils";
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

// Define images per page (20 images on a 5x4 grid)
const IMAGES_PER_PAGE = 20;

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
    <div className="flex items-center justify-center gap-2 mt-4">
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

interface MediaSelectorProps {
  onSelect: (mdxCode: string) => void;
}

export function MediaSelector({ onSelect }: MediaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [carSearchQuery, setCarSearchQuery] = useState("");
  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [currentCarId, setCurrentCarId] = useState<string | null>(null);
  const [currentAngle, setCurrentAngle] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [currentMovement, setCurrentMovement] = useState<string | null>(null);
  const [currentTod, setCurrentTod] = useState<string | null>(null);

  // Fetch all cars by setting a high limit
  const { data: carsData } = useCars({ limit: 1000, sortDirection: "desc" });

  // Get current car name
  const currentCarName = (() => {
    if (!currentCarId) return "All Cars";
    if (!carsData?.cars) return "Loading...";
    const car = carsData.cars.find((c) => c._id === currentCarId);
    return car ? `${car.year} ${car.make} ${car.model}` : "All Cars";
  })();

  // Filter cars based on search query
  const filteredCars = useMemo(() => {
    return (
      carsData?.cars.filter((car) => {
        if (!carSearchQuery) return true;
        const searchStr = `${car.year} ${car.make} ${car.model}`.toLowerCase();
        const searchTerms = carSearchQuery.toLowerCase().split(" ");
        return searchTerms.every((term) => searchStr.includes(term));
      }) || []
    );
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

  // Build query parameters
  const queryParams: Record<string, any> = {
    search: debouncedSearch || undefined,
    limit: IMAGES_PER_PAGE,
    page: currentPage,
  };

  if (currentCarId) queryParams.carId = currentCarId;
  if (currentAngle) queryParams.angle = currentAngle;
  if (currentView) queryParams.view = currentView;
  if (currentMovement) queryParams.movement = currentMovement;
  if (currentTod) queryParams.tod = currentTod;

  const { data, isLoading, mutate } = useImages(queryParams);

  const images = (data?.images ?? []).map((img) => ({
    ...img,
    metadata: img.metadata ?? {},
  })) as Image[];

  const handleSelect = (image: Image) => {
    // Handle both Image and ImageData formats
    const imgId = "id" in image ? image.id : (image as any)._id;
    const htmlCode = `<div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg">
  <img src="${image.url}" alt="${image.metadata?.description || image.filename}" className="w-full h-full object-cover rounded-lg" />
</div>`;
    onSelect(htmlCode);
    setOpen(false);

    // Reset filters and search when closing
    setSearch("");
    setCurrentPage(1);
  };

  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      switch (key) {
        case "carId":
          setCurrentCarId(value);
          break;
        case "angle":
          setCurrentAngle(value);
          break;
        case "view":
          setCurrentView(value);
          break;
        case "movement":
          setCurrentMovement(value);
          break;
        case "tod":
          setCurrentTod(value);
          break;
        default:
          break;
      }
      // Reset to page 1 when changing filters
      setCurrentPage(1);
    },
    []
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Only allow closing if not interacting with popover
        if (!carDropdownOpen) {
          setOpen(newOpen);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageIcon className="w-4 h-4 mr-2" />
          Insert Image
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-6xl"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on popover elements
          if ((e.target as HTMLElement).closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with popover
          if (carDropdownOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="w-full md:w-[250px] space-y-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Select Car
                  </div>

                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarDropdownOpen(!carDropdownOpen);
                      }}
                    >
                      {currentCarName}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>

                    {carDropdownOpen && (
                      <div
                        className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-border shadow-md bg-background"
                        style={{
                          position: "absolute",
                          zIndex: 1000,
                        }}
                      >
                        <div className="p-2 border-b border-border">
                          <Input
                            placeholder="Search cars..."
                            value={carSearchQuery}
                            onChange={(e) => setCarSearchQuery(e.target.value)}
                            className="w-full"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-[220px] overflow-y-auto">
                          {sortedCars.length === 0 && carSearchQuery ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No cars match your search.
                            </div>
                          ) : (
                            <div className="py-1">
                              <div
                                className={cn(
                                  "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                  !currentCarId &&
                                    "bg-accent text-accent-foreground"
                                )}
                                onClick={() => {
                                  handleFilterChange("carId", null);
                                  setCarSearchQuery("");
                                  setCarDropdownOpen(false);
                                }}
                              >
                                All Cars
                              </div>
                              {sortedCars.map((car) => (
                                <div
                                  key={car._id}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    currentCarId === car._id &&
                                      "bg-accent text-accent-foreground"
                                  )}
                                  onClick={() => {
                                    handleFilterChange("carId", car._id);
                                    setCarSearchQuery("");
                                    setCarDropdownOpen(false);
                                  }}
                                >
                                  {car.year} {car.make} {car.model}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative w-full md:w-[250px]">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Search Images
                </div>
                <div className="flex items-center gap-1">
                  <div className="relative flex-grow">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search images..."
                      className="pl-8 w-full"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {search && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearch("");
                      }}
                      className="px-2 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <div className="w-full space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Filters
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={currentAngle || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "angle",
                        value === "all" ? null : value
                      )
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Angle" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-md">
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
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-md">
                      <SelectItem value="all">All Views</SelectItem>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="interior">Interior</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={currentMovement || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "movement",
                        value === "all" ? null : value
                      )
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Movement" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-md">
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
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Time of Day" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-md">
                      <SelectItem value="all">All Times</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="golden">Golden Hour</SelectItem>
                      <SelectItem value="blue">Blue Hour</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ScrollArea className="h-[500px] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !images.length ? (
            <div className="text-center text-muted-foreground py-10">
              No images found
            </div>
          ) : (
            <div className="space-y-6 px-1 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id || (image as any)._id}
                    className="group relative rounded-md overflow-hidden bg-muted cursor-pointer min-h-[200px] flex flex-col"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      handleSelect(image);
                    }}
                  >
                    <div className="relative flex-1 flex items-center justify-center bg-background">
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="max-w-full max-h-[300px] w-auto h-auto object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-primary/0 hover:bg-primary/20 flex items-center justify-center transition-all duration-200">
                        <Check className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                    <div className="w-full p-2 bg-muted/80 backdrop-blur-sm text-xs border-t border-border">
                      <div className="truncate text-muted-foreground">
                        {image.metadata?.angle && (
                          <span className="mr-2">{image.metadata.angle}</span>
                        )}
                        {image.metadata?.view && (
                          <span>{image.metadata.view}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {data && data.pagination && data.pagination.pages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={data.pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
