"use client";

// components/cars/CarCard.tsx
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car } from "@/types/car";
import { Trash2 } from "lucide-react";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading";

interface CarImage {
  _id: string;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    aiAnalysis?: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
  };
  carId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CarCardProps {
  car: Car;
  currentSearchParams?: string;
}

export default function CarCard({ car, currentSearchParams }: CarCardProps) {
  console.log("CarCard: Component rendering with car:", car._id);
  console.log("CarCard: Full car data:", {
    id: car._id,
    make: car.make,
    model: car.model,
    imageIds: car.imageIds,
    images: car.images,
    primaryImageId: car.primaryImageId,
    hasImageIds: Boolean(car.imageIds?.length),
    hasImages: Boolean(car.images?.length),
  });

  const [primaryImage, setPrimaryImage] = useState<{
    id?: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("CarCard: useEffect triggered for car:", car._id);

    const fetchPrimaryImage = async () => {
      console.log("CarCard: Starting to fetch image for car:", car._id);
      setPrimaryImage(null);
      setLoading(true);

      try {
        // First check if we have direct images array with the new structure
        if (car.images?.length) {
          // If there's a primaryImageId, use that image
          if (car.primaryImageId) {
            const primaryImg = car.images.find(
              (img) => img._id === car.primaryImageId
            );
            if (primaryImg) {
              console.log("CarCard: Using primary image from primaryImageId");
              setPrimaryImage({
                id: primaryImg._id,
                url: primaryImg.url.endsWith("/public")
                  ? primaryImg.url
                  : `${primaryImg.url}/public`,
              });
              setLoading(false);
              return;
            }
          }

          // If no primaryImageId or it wasn't found, fall back to first image
          console.log("CarCard: Using direct image URL from new structure");
          setPrimaryImage({
            id: car.images[0]._id,
            url: car.images[0].url.endsWith("/public")
              ? car.images[0].url
              : `${car.images[0].url}/public`,
          });
          setLoading(false);
          return;
        }

        // Fall back to imageIds if no direct images
        if (car.imageIds?.length) {
          // If there's a primaryImageId, use that image
          const idToFetch =
            car.primaryImageId && car.imageIds.includes(car.primaryImageId)
              ? car.primaryImageId
              : car.imageIds[0];

          console.log("CarCard: Fetching image with ID:", idToFetch);
          const response = await fetch(`/api/images/metadata?ids=${idToFetch}`);
          console.log("CarCard: Response received:", {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
          });

          if (!response.ok) {
            throw new Error("Failed to fetch image metadata");
          }

          const data = await response.json();
          console.log("CarCard: Image metadata received:", data);

          if (data && data[0]) {
            setPrimaryImage({
              id: data[0].imageId,
              url: `${data[0].url}/public`,
            });
          } else {
            console.error("CarCard: No image data in response");
          }
        } else {
          console.log("CarCard: No image IDs available");
        }
      } catch (error) {
        console.error("CarCard: Error fetching image:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryImage();
  }, [car._id, car.imageIds, car.images, car.primaryImageId]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (
      !window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${car._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete car");
      }

      // Refresh the page to update the list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting car:", error);
      alert("Failed to delete car. Please try again.");
    }
  };

  // Helper function to safely format mileage
  const formatMileage = (mileage: Car["mileage"]) => {
    if (!mileage || typeof mileage.value !== "number") return null;
    return `${mileage.value.toLocaleString()} ${mileage.unit || "mi"}`;
  };

  return (
    <Link
      href={`/cars/${car._id}${
        currentSearchParams ? `?${currentSearchParams}` : ""
      }`}
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
            alt={`${car.year} ${car.make} ${car.model}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            onError={(e) => {
              console.error("CarCard: Image failed to load:", {
                url: primaryImage.url,
                carId: car._id,
              });
            }}
            onLoad={() => {
              console.log("CarCard: Image loaded successfully:", {
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
          {car.year} {car.make} {car.model}
          <span className="ml-1 text-text-secondary">
            {car.manufacturing?.series || "Base"}
          </span>
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {car.manufacturing?.trim || "Standard"}
        </p>
        <div className="mt-2 space-y-1">
          {car.price && (
            <p className="text-sm text-text-secondary">
              {car.price.listPrice === 0 || car.price.listPrice
                ? `$${car.price.listPrice.toLocaleString()}`
                : "Price on request"}
              {car.status === "sold" && car.price.soldPrice && (
                <span className="ml-2 text-accent-success">
                  (Sold: ${car.price.soldPrice.toLocaleString()})
                </span>
              )}
            </p>
          )}
          {car.mileage && (
            <p className="text-sm text-text-secondary">
              {formatMileage(car.mileage)}
            </p>
          )}
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
          {car.status && (
            <p
              className={cn(
                "text-sm font-medium mt-2",
                car.status === "sold" && "text-accent-success",
                car.status === "pending" && "text-accent-warning",
                car.status === "available" && "text-accent-info"
              )}
            >
              {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
