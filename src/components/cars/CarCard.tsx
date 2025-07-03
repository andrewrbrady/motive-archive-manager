"use client";

// components/cars/CarCard.tsx
import React, { useEffect, useState, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car, CarImage } from "@/types/car";
import { Trash2 } from "lucide-react";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { useAPI } from "@/hooks/useAPI";
import { Badge } from "@/components/ui/badge";

// Helper function to build enhanced Cloudflare URL for car card thumbnails
import { getEnhancedImageUrl } from "@/lib/imageUtils";

// Using centralized getEnhancedImageUrl function from @/lib/imageUtils

interface CarCardProps {
  car: Car;
  currentSearchParams?: string;
}

const CarCard = memo(function CarCard({
  car,
  currentSearchParams,
}: CarCardProps) {
  if (process.env.NODE_ENV !== "production") {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("CarCard: Component rendering with car:", car._id);
    console.log("CarCard: Full car data:", {
      id: car._id,
      hasMake: !!car.make,
      hasModel: !!car.model,
      imageIdsCount: car.imageIds?.length || 0,
      imagesCount: car.images?.length || 0,
      hasPrimaryImageId: !!car.primaryImageId,
      hasImageIds: Boolean(car.imageIds?.length),
      hasImages: Boolean(car.images),
    });
  }

  const api = useAPI();
  const [primaryImage, setPrimaryImage] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simplified image selection logic
    const findPrimaryImage = () => {
      // ✅ Removed console.log to prevent infinite loops

      // Case 1: We have loaded images with URLs
      if (car.images && car.images.length > 0) {
        const primary = car.images.find((img) => img.metadata?.isPrimary);
        if (primary) {
          const baseUrl = fixCloudflareImageUrl(primary.url);
          const enhancedUrl = getEnhancedImageUrl(baseUrl, "400", "85");

          // ✅ Removed console.log to prevent infinite loops

          setPrimaryImage({
            id: primary._id,
            url: enhancedUrl,
          });
        } else {
          // Use first image if no primary is marked
          const baseUrl = fixCloudflareImageUrl(car.images[0].url);
          const enhancedUrl = getEnhancedImageUrl(baseUrl, "400", "85");

          // ✅ Removed console.log to prevent infinite loops

          setPrimaryImage({
            id: car.images[0]._id,
            url: enhancedUrl,
          });
        }
        setLoading(false);
        return;
      }

      // Case 2: We have image IDs but no loaded images - fetch using authenticated API
      if (car.imageIds?.length && car.primaryImageId && api) {
        // Fetch the primary image using authenticated API
        const fetchImage = async () => {
          try {
            const imageData = await api.get(`images/${car.primaryImageId}`);
            const baseUrl = fixCloudflareImageUrl((imageData as any).url);
            const enhancedUrl = getEnhancedImageUrl(baseUrl, "400", "85");

            // ✅ Removed console.log to prevent infinite loops

            setPrimaryImage({
              id: (imageData as any)._id,
              url: enhancedUrl,
            });
          } catch (error) {
            // If primary image fetch fails, try the first image
            if (
              car.imageIds &&
              car.imageIds.length > 0 &&
              car.imageIds[0] !== car.primaryImageId
            ) {
              try {
                const fallbackImageData = await api.get(
                  `images/${car.imageIds[0]}`
                );
                const baseUrl = fixCloudflareImageUrl(
                  (fallbackImageData as any).url
                );
                const enhancedUrl = getEnhancedImageUrl(baseUrl, "400", "85");

                // ✅ Removed console.log to prevent infinite loops

                setPrimaryImage({
                  id: (fallbackImageData as any)._id,
                  url: enhancedUrl,
                });
              } catch (fallbackError) {
                console.error("Error fetching fallback image:", fallbackError);
                setPrimaryImage(null);
              }
            } else {
              setPrimaryImage(null);
            }
          } finally {
            setLoading(false);
          }
        };

        fetchImage();
        return;
      }

      // No images available
      setLoading(false);
      setPrimaryImage(null);
    };

    findPrimaryImage();
  }, [car._id, car.imageIds, car.images, car.primaryImageId, api]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (
      !window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone."
      )
    ) {
      return;
    }

    if (!api) {
      alert("Authentication not ready. Please try again.");
      return;
    }

    // Immediate optimistic feedback
    alert("Deleting car in background...");

    // Background delete operation - non-blocking
    const deleteOperation = async () => {
      try {
        await api.delete(`cars/${car._id}`);
        // Refresh the page to update the list
        window.location.reload();
      } catch (error) {
        console.error("Error deleting car:", error);
        alert("Failed to delete car. Please try again.");
      }
    };

    // Execute delete in background - non-blocking
    setTimeout(deleteOperation, 0);
  };

  // Helper function to safely format mileage
  const formatMileage = (mileage: Car["mileage"]) => {
    if (!mileage || typeof mileage.value !== "number") return null;
    return `${mileage.value.toLocaleString()} ${mileage.unit || "mi"}`;
  };

  // Helper function to generate car title that handles null values
  const generateCarTitle = () => {
    return [
      car.year ? car.year : null,
      car.make ? car.make : null,
      car.model ? car.model : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <Link
      href={`/cars/${car._id}`}
      className="block bg-background rounded-lg border border-border-primary overflow-hidden hover:border-border-secondary transition-colors relative group"
    >
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {loading ? (
          <div className="w-full h-full bg-background-primary/50 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
          </div>
        ) : primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={generateCarTitle()}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            onError={(e) => {
              console.error("CarCard: Image failed to load:", {
                url: primaryImage.url,
                carId: car._id,
              });
            }}
          />
        ) : (
          <div className="w-full h-full bg-black/10 dark:bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              <MotiveLogo className="w-12 h-12 text-text-primary fill-current" />
              <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                No Image
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Button - Absolutely positioned */}
      <button
        onClick={handleDelete}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full border transition-all duration-base",
          "text-accent-error hover:text-accent-error/90",
          "border-accent-error/20 hover:border-accent-error/30",
          "bg-background-primary/90 hover:bg-background-primary",
          "opacity-0 group-hover:opacity-100"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Car Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {generateCarTitle()}
        </h3>
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {car.color && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Ext:</span> {car.color}
              </p>
            )}
            {car.interior_color && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Int:</span> {car.interior_color}
              </p>
            )}
            {car.transmission?.type && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Trans:</span>{" "}
                {car.transmission.type}
                {car.transmission.speeds && ` ${car.transmission.speeds}-speed`}
              </p>
            )}
          </div>
          {car.location && (
            <p className="text-sm text-text-secondary">{car.location}</p>
          )}
        </div>
      </div>
    </Link>
  );
});

export default CarCard;
