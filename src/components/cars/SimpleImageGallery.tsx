import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useImages } from "@/hooks/use-images";
import { useCars } from "@/lib/hooks/query/useCars";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import InfiniteScroll from "react-infinite-scroll-component";
import { ImageLightbox } from "./ImageLightbox";
import { ImageData } from "@/app/images/columns";

interface Car {
  _id: string;
  year: string;
  make: string;
  model: string;
}

interface ImageFilters {
  angle?: string;
  movement?: string;
  timeOfDay?: string;
  view?: string;
  carId?: string;
  page?: number;
  search?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UseImagesResponse {
  data: {
    images: ImageData[];
    pagination: PaginationData;
  } | null;
  isLoading: boolean;
  error: Error | null;
}

export function SimpleImageGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Internal state for immediate UI updates
  const [searchInput, setSearchInput] = useState("");
  const [angle, setAngle] = useState<string>("");
  const [movement, setMovement] = useState<string>("");
  const [timeOfDay, setTimeOfDay] = useState<string>("");
  const [view, setView] = useState<string>("");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  // Debounced search state for API calls
  const { data: carsData } = useCars();
  const [debouncedSearch] = useDebounce(searchInput, 500);

  // Basic data fetching with filters
  const { data, isLoading, error }: UseImagesResponse = useImages({
    search: debouncedSearch,
    filters: {
      angle: angle === "all" ? undefined : angle || undefined,
      movement: movement === "all" ? undefined : movement || undefined,
      timeOfDay: timeOfDay === "all" ? undefined : timeOfDay || undefined,
      view: view === "all" ? undefined : view || undefined,
      carId: selectedCarId === "all" ? undefined : selectedCarId || undefined,
      page,
    },
  });

  // Check URL for selected image on mount and when URL changes
  useEffect(() => {
    const imageId = searchParams.get("image");
    if (imageId && (!selectedImage || selectedImage._id !== imageId)) {
      // Find the image in our current data
      const image = data?.images?.find((img) => img._id === imageId);
      if (image) {
        setSelectedImage(image);
      }
    }
  }, [searchParams, data?.images, selectedImage]);

  // Get images safely
  const images = data?.images ?? [];
  const hasImages = images.length > 0;
  const cars = carsData?.cars ?? [];
  const hasMore = data?.pagination?.pages
    ? page < data.pagination.pages
    : false;

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  const handleImageClick = useCallback(
    (image: ImageData) => {
      setSelectedImage(image);
      // Update URL with image ID
      const params = new URLSearchParams(searchParams.toString());
      params.set("image", image._id);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleCloseLightbox = useCallback(() => {
    setSelectedImage(null);
    // Remove image from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("image");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Update search input and trigger debounced search
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      setPage(1); // Reset page when search changes
    },
    []
  );

  const handleAngleChange = useCallback((value: string) => {
    setAngle(value);
    setPage(1); // Reset page when angle changes
  }, []);

  const handleMovementChange = useCallback((value: string) => {
    setMovement(value);
    setPage(1); // Reset page when movement changes
  }, []);

  const handleTimeOfDayChange = useCallback((value: string) => {
    setTimeOfDay(value);
    setPage(1); // Reset page when time of day changes
  }, []);

  const handleViewChange = useCallback((value: string) => {
    setView(value);
    setPage(1); // Reset page when view changes
  }, []);

  const handleCarChange = useCallback((value: string) => {
    setSelectedCarId(value);
    setPage(1); // Reset page when car changes
  }, []);

  const filters: ImageFilters = {
    angle: angle === "all" ? undefined : angle || undefined,
    movement: movement === "all" ? undefined : movement || undefined,
    timeOfDay: timeOfDay === "all" ? undefined : timeOfDay || undefined,
    view: view === "all" ? undefined : view || undefined,
    carId: selectedCarId === "all" ? undefined : selectedCarId || undefined,
    page,
    search: debouncedSearch,
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search images..."
          value={searchInput}
          onChange={handleSearchInput}
          className="max-w-xs"
        />

        <Select value={angle} onValueChange={handleAngleChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Angle" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-md">
            <SelectItem value="all">All Angles</SelectItem>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="rear">Rear</SelectItem>
            <SelectItem value="side">Side</SelectItem>
            <SelectItem value="34">3/4</SelectItem>
            <SelectItem value="interior">Interior</SelectItem>
          </SelectContent>
        </Select>

        <Select value={movement} onValueChange={handleMovementChange}>
          <SelectTrigger className="w-[180px]">
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

        <Select value={timeOfDay} onValueChange={handleTimeOfDayChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time of Day" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-md">
            <SelectItem value="all">All Times</SelectItem>
            <SelectItem value="sunrise">Sunrise</SelectItem>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="midday">Midday</SelectItem>
            <SelectItem value="afternoon">Afternoon</SelectItem>
            <SelectItem value="sunset">Sunset</SelectItem>
            <SelectItem value="dusk">Dusk</SelectItem>
            <SelectItem value="night">Night</SelectItem>
          </SelectContent>
        </Select>

        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-md">
            <SelectItem value="all">All Views</SelectItem>
            <SelectItem value="exterior">Exterior</SelectItem>
            <SelectItem value="interior">Interior</SelectItem>
            <SelectItem value="detail">Detail</SelectItem>
            <SelectItem value="action">Action</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCarId} onValueChange={handleCarChange}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Car" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-md">
            <SelectItem value="all">All Cars</SelectItem>
            {cars.map((car) => (
              <SelectItem key={car._id} value={car._id}>
                {car.year} {car.make} {car.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {(isLoading && page === 1) || !hasImages ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={images.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading more...</span>
            </div>
          }
          endMessage={
            <div className="text-center py-4 text-muted-foreground">
              No more images to load
            </div>
          }
        >
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {images.map((image) => (
              <div
                key={image._id}
                className="break-inside-avoid mb-4 group cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                <div
                  className="relative rounded-lg overflow-hidden bg-muted"
                  style={{ paddingBottom: "75%" }}
                >
                  <Image
                    src={image.url}
                    alt={image.filename || "Image"}
                    fill
                    className={cn(
                      "object-cover",
                      "transition-all duration-200",
                      "group-hover:scale-105"
                    )}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}

      <ImageLightbox
        isOpen={!!selectedImage}
        onClose={handleCloseLightbox}
        image={selectedImage}
      />
    </div>
  );
}
